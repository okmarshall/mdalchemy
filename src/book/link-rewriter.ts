import path from "node:path";
import { buildOutline, slugify } from "../document/outline.js";
import type { BlockNode, InlineNode } from "../markdown/ast.js";
import type { BookLinkRewriteOptions, ComposedBookFile, ComposeResult } from "./types.js";

interface ParsedLocalUrl {
  pathPart: string;
  query: string;
  hash: string;
}

interface LinkRewriteContext extends BookLinkRewriteOptions {
  fileTargets: Map<string, string>;
  fragmentTargets: Map<string, string>;
}

export function rewriteBookLinks(composed: ComposeResult, options: BookLinkRewriteOptions): void {
  const outline = buildOutline(composed.document, options.explicitTitle);
  const headingIds = new Map(outline.headings.map((heading) => [heading.node, heading.id]));
  const fileTargets = new Map<string, string>();
  const fragmentTargets = new Map<string, string>();

  for (const file of composed.files) {
    const fileId = headingIds.get(file.sectionHeading);
    if (fileId) fileTargets.set(path.resolve(file.absolutePath), fileId);
    for (const [localId, heading] of file.localTargets) {
      const globalId = headingIds.get(heading);
      if (globalId) fragmentTargets.set(fragmentTargetKey(file.absolutePath, localId), globalId);
    }
  }

  rewriteBlocks(composed.document.children, composed.nodeFiles, {
    ...options,
    fileTargets,
    fragmentTargets
  });
}

function rewriteBlocks(
  blocks: readonly BlockNode[],
  nodeFiles: WeakMap<object, ComposedBookFile>,
  context: LinkRewriteContext
): void {
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
      case "heading":
        rewriteInlines(block.children, block, nodeFiles, context);
        break;
      case "blockquote":
      case "listItem":
        rewriteBlocks(block.children, nodeFiles, context);
        break;
      case "list":
        for (const item of block.children) rewriteBlocks(item.children, nodeFiles, context);
        break;
      case "table":
        for (const cell of [...block.header, ...block.rows.flat()]) {
          rewriteInlines(cell.children, cell, nodeFiles, context);
        }
        break;
      case "footnoteDefinition":
        rewriteBlocks(block.children, nodeFiles, context);
        break;
      case "thematicBreak":
      case "codeBlock":
      case "htmlBlock":
      case "linkReferenceDefinition":
      case "frontmatter":
        break;
    }
  }
}

function rewriteInlines(
  nodes: readonly InlineNode[],
  owner: object,
  nodeFiles: WeakMap<object, ComposedBookFile>,
  context: LinkRewriteContext
): void {
  const ownerFile = nodeFiles.get(owner);

  for (const node of nodes) {
    switch (node.type) {
      case "link": {
        const file = nodeFiles.get(node) ?? ownerFile;
        if (file) node.destination = rewriteLinkDestination(node.destination, file, context);
        rewriteInlines(node.children, node, nodeFiles, context);
        break;
      }
      case "image": {
        const file = nodeFiles.get(node) ?? ownerFile;
        if (file) node.destination = rewriteAssetDestination(node.destination, file, context.outputDir, true);
        rewriteInlines(node.children, node, nodeFiles, context);
        break;
      }
      case "emphasis":
      case "strong":
      case "strikethrough":
        rewriteInlines(node.children, node, nodeFiles, context);
        break;
      case "text":
      case "softBreak":
      case "hardBreak":
      case "codeSpan":
      case "autoLink":
      case "footnoteReference":
      case "htmlInline":
        break;
    }
  }
}

function rewriteLinkDestination(
  destination: string,
  sourceFile: ComposedBookFile,
  context: LinkRewriteContext
): string {
  const local = parseLocalUrl(destination);
  if (!local) return destination;

  const sourceDir = path.dirname(sourceFile.absolutePath);
  const targetPath = local.pathPart
    ? path.resolve(sourceDir, safeDecode(local.pathPart))
    : sourceFile.absolutePath;
  const targetIsMarkdown = local.pathPart ? isMarkdownPath(local.pathPart) : local.hash.length > 0;

  if (targetIsMarkdown) {
    const normalizedTarget = path.resolve(targetPath);
    const targetId = local.hash
      ? context.fragmentTargets.get(fragmentTargetKey(normalizedTarget, normalizedFragment(local.hash)))
      : context.fileTargets.get(normalizedTarget);

    if (targetId) return `#${targetId}`;
    context.diagnostics.push({
      severity: "warning",
      code: "MDA_BOOK_LINK_TARGET_NOT_INCLUDED",
      message: `Markdown link target "${destination}" from "${sourceFile.relativePath}" was not included in the book.`
    });
    return destination;
  }

  return rewriteAssetDestination(destination, sourceFile, context.outputDir, false);
}

function rewriteAssetDestination(
  destination: string,
  sourceFile: ComposedBookFile,
  outputDir: string,
  force: boolean
): string {
  const local = parseLocalUrl(destination);
  if (!local || !local.pathPart) return destination;
  if (isMarkdownPath(local.pathPart)) return destination;
  if (!force && !shouldRewriteRelativeAsset(local.pathPart)) return destination;

  const absoluteAsset = path.resolve(path.dirname(sourceFile.absolutePath), safeDecode(local.pathPart));
  const relative = normalizeHtmlPath(path.relative(outputDir, absoluteAsset));
  return `${relative}${local.query}${local.hash}`;
}

function parseLocalUrl(destination: string): ParsedLocalUrl | undefined {
  if (isExternalOrAbsoluteUrl(destination)) return undefined;

  const hashIndex = destination.indexOf("#");
  const beforeHash = hashIndex >= 0 ? destination.slice(0, hashIndex) : destination;
  const hash = hashIndex >= 0 ? destination.slice(hashIndex) : "";
  const queryIndex = beforeHash.indexOf("?");
  const pathPart = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";

  return { pathPart, query, hash };
}

function isExternalOrAbsoluteUrl(destination: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(destination)
    || destination.startsWith("//")
    || destination.startsWith("/");
}

function isMarkdownPath(value: string): boolean {
  const extension = path.posix.extname(value.split("?")[0] ?? "").toLocaleLowerCase();
  return extension === ".md" || extension === ".markdown";
}

function shouldRewriteRelativeAsset(value: string): boolean {
  return value.startsWith("./") || value.startsWith("../") || value.includes("/");
}

function fragmentTargetKey(filePath: string, localId: string): string {
  return `${path.resolve(filePath)}#${localId}`;
}

function normalizedFragment(hash: string): string {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  return slugify(safeDecode(value)) || value.toLocaleLowerCase();
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeHtmlPath(value: string): string {
  const normalized = value.replaceAll(path.sep, "/");
  return normalized || ".";
}
