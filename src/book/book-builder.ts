import path from "node:path";
import type { Diagnostic } from "../core/diagnostics.js";
import { buildOutline, slugify } from "../document/outline.js";
import { readMarkdownFile } from "../io/files.js";
import {
  type BlockNode,
  type BlockQuoteNode,
  type CodeBlockNode,
  type DocumentNode,
  type FootnoteDefinitionNode,
  type FootnoteReferenceNode,
  type HeadingNode,
  type HtmlBlockNode,
  type HtmlInlineNode,
  type ImageNode,
  type InlineNode,
  type LinkNode,
  type LinkReferenceDefinitionNode,
  type ListItemNode,
  type ListNode,
  type ParagraphNode,
  type SoftBreakNode,
  type HardBreakNode,
  type CodeSpanNode,
  type EmphasisNode,
  type StrongNode,
  type StrikethroughNode,
  type AutoLinkNode,
  type SourceRange,
  type TableCellNode,
  type TableNode,
  type TextNode,
  type ThematicBreakNode,
  textContent
} from "../markdown/ast.js";
import { parseMarkdown } from "../markdown/parser.js";
import type { ResolvedConfig } from "../config/config-schema.js";
import type { ResolvedTheme } from "../theme/theme.js";
import { renderDocument, type RenderOptions, type RenderResult } from "../render/html/html-renderer.js";
import type { TocItem } from "../render/html/toc-renderer.js";
import { discoverMarkdownFiles } from "./discovery.js";
import { readBookFrontmatter, type BookFrontmatter } from "./frontmatter.js";

export interface RenderProjectBookOptions {
  rootPath: string;
  outputPath?: string | undefined;
  config: ResolvedConfig;
  theme?: ResolvedTheme | undefined;
  cwd?: string | undefined;
}

export interface RenderProjectBookResult extends RenderResult {
  files: ProjectBookFile[];
}

export interface ProjectBookFile {
  absolutePath: string;
  relativePath: string;
  title: string;
}

interface ParsedBookFile extends ProjectBookFile {
  document: DocumentNode;
  metadata: BookFrontmatter;
}

interface ComposedBookFile extends ProjectBookFile {
  sectionHeading: HeadingNode;
  localTargets: Map<string, HeadingNode>;
}

interface ComposeResult {
  document: DocumentNode;
  files: ComposedBookFile[];
  nodeFiles: WeakMap<object, ComposedBookFile>;
}

interface ParsedLocalUrl {
  pathPart: string;
  query: string;
  hash: string;
}

const syntheticRange: SourceRange = {
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 }
};

export async function renderProjectBook(options: RenderProjectBookOptions): Promise<RenderProjectBookResult> {
  const candidates = await discoverMarkdownFiles(options.rootPath, options.config.book);
  const parsedFiles: ParsedBookFile[] = [];

  for (const candidate of candidates) {
    const markdown = await readMarkdownFile(candidate.absolutePath);
    const metadata = readBookFrontmatter(markdown);
    if (metadata.include === false) continue;

    const parsed = parseMarkdown(markdown, options.config.markdown, candidate.absolutePath);
    parsedFiles.push({
      absolutePath: candidate.absolutePath,
      relativePath: candidate.relativePath,
      title: fileTitle(candidate.relativePath, metadata, parsed.document),
      metadata,
      document: parsed.document
    });
  }

  if (parsedFiles.length === 0) {
    throw new Error(`No Markdown files matched the book include/exclude settings in ${options.rootPath}.`);
  }

  const bookTitle = options.config.html.title || `${path.basename(options.rootPath) || "Project"} Documentation`;
  const composed = composeBookDocument(bookTitle, parsedFiles);
  const diagnostics: Diagnostic[] = [];
  rewriteBookLinks(composed, {
    rootPath: options.rootPath,
    outputDir: options.outputPath ? path.dirname(options.outputPath) : options.rootPath,
    explicitTitle: options.config.html.title || bookTitle,
    diagnostics
  });

  const renderOptions: RenderOptions = { config: options.config };
  if (options.cwd) renderOptions.cwd = options.cwd;
  if (options.theme) renderOptions.theme = options.theme;
  if (options.config.book.folderStructure) {
    renderOptions.tocItems = buildBookTocItems(composed, bookTitle);
  }
  const rendered = await renderDocument(composed.document, renderOptions);

  return {
    ...rendered,
    diagnostics: [...diagnostics, ...rendered.diagnostics],
    files: composed.files.map((file) => ({
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      title: file.title
    }))
  };
}

function composeBookDocument(title: string, files: readonly ParsedBookFile[]): ComposeResult {
  const nodeFiles = new WeakMap<object, ComposedBookFile>();
  const children: BlockNode[] = [syntheticHeading(1, title)];
  const composedFiles: ComposedBookFile[] = [];

  for (const [index, file] of files.entries()) {
    const firstHeading = firstDirectHeading(file.document);
    const dropFirstHeading = firstHeading ? textContent(firstHeading.children) === file.title : false;
    const sectionHeading = syntheticHeading(2, file.title);
    const composedFile: ComposedBookFile = {
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      title: file.title,
      sectionHeading,
      localTargets: new Map()
    };
    const localIds = localHeadingIds(file.document);

    nodeFiles.set(sectionHeading, composedFile);
    children.push(sectionHeading);
    composedFiles.push(composedFile);

    if (firstHeading) {
      const firstLocalId = localIds.get(firstHeading);
      if (firstLocalId) composedFile.localTargets.set(firstLocalId, sectionHeading);
    }

    const footnotePrefix = `file-${index + 1}`;
    for (const block of file.document.children) {
      if (block.type === "frontmatter") continue;
      if (dropFirstHeading && block === firstHeading) continue;

      const cloned = cloneBlock(block, {
        headingShift: 1,
        footnotePrefix,
        localIds,
        file: composedFile,
        nodeFiles
      });
      if (cloned) children.push(cloned);
    }
  }

  return {
    document: {
      type: "document",
      range: syntheticRange,
      children,
      references: new Map(),
      diagnostics: files.flatMap((file) => file.document.diagnostics)
    },
    files: composedFiles,
    nodeFiles
  };
}

function directoryParts(relativePath: string): string[] {
  const dir = path.posix.dirname(relativePath);
  return dir === "." ? [] : dir.split("/").filter(Boolean);
}

function fileTitle(relativePath: string, metadata: BookFrontmatter, document: DocumentNode): string {
  if (metadata.title) return metadata.title;
  const first = firstDirectHeading(document);
  if (first) return textContent(first.children) || first.raw;
  return readablePathTitle(relativePath);
}

function buildBookTocItems(composed: ComposeResult, title: string): TocItem[] {
  const outline = buildOutline(composed.document, title);
  const headingIds = new Map(outline.headings.map((heading) => [heading.node, heading.id]));
  const sourceItems = new Map<string, TocItem>();
  collectTocItems(outline.tree, sourceItems);

  const rootSource = outline.tree[0];
  if (!rootSource) return [];

  const root: TocItem = {
    id: rootSource.id,
    level: 1,
    title: rootSource.title,
    children: [],
    collapsible: false
  };
  const folderItems = new Map<string, TocItem>();

  for (const file of composed.files) {
    const fileId = headingIds.get(file.sectionHeading);
    const sourceItem = fileId ? sourceItems.get(fileId) : undefined;
    if (!sourceItem) continue;

    const folderParts = directoryParts(file.relativePath);
    const fileParent = ensureFolderTocItems(root.children, folderItems, folderParts);
    const fileLevel = folderParts.length > 0 ? 3 : 2;
    fileParent.push(cloneTocItemAtLevel(sourceItem, fileLevel, false));
  }

  return [root];
}

function collectTocItems(items: readonly TocItem[], target: Map<string, TocItem>): void {
  for (const item of items) {
    if (item.id) target.set(item.id, item);
    collectTocItems(item.children, target);
  }
}

function ensureFolderTocItems(
  rootChildren: TocItem[],
  folderItems: Map<string, TocItem>,
  folderParts: readonly string[]
): TocItem[] {
  let children = rootChildren;
  for (const [index, folderName] of folderParts.entries()) {
    const folderPath = folderParts.slice(0, index + 1).join("/");
    let folder = folderItems.get(folderPath);
    if (!folder) {
      folder = {
        level: 2,
        title: folderName,
        children: [],
        collapsible: true
      };
      folderItems.set(folderPath, folder);
      children.push(folder);
    }
    children = folder.children;
  }
  return children;
}

function cloneTocItemAtLevel(
  item: TocItem,
  level: number,
  collapsible: boolean
): TocItem {
  const childBaseLevel = item.level;
  return {
    id: item.id,
    level,
    title: item.title,
    children: item.children.map((child) => cloneTocItemAtLevel(
      child,
      level + Math.max(1, child.level - childBaseLevel),
      collapsible
    )),
    collapsible
  };
}

function firstDirectHeading(document: DocumentNode): HeadingNode | undefined {
  return document.children.find((child): child is HeadingNode => child.type === "heading");
}

function readablePathTitle(relativePath: string): string {
  const parsed = path.posix.parse(relativePath);
  if (parsed.name.toLocaleLowerCase() === "readme") {
    const dirName = path.posix.basename(parsed.dir);
    return dirName ? `${dirName} README` : "README";
  }
  return parsed.name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toLocaleUpperCase());
}

function localHeadingIds(document: DocumentNode): Map<HeadingNode, string> {
  const headings = collectHeadings(document.children);
  const counts = new Map<string, number>();
  const ids = new Map<HeadingNode, string>();

  for (const heading of headings) {
    const title = textContent(heading.children) || heading.raw;
    const base = slugify(title) || `heading-${heading.range.start.line}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    ids.set(heading, count === 0 ? base : `${base}-${count + 1}`);
  }

  return ids;
}

function collectHeadings(blocks: readonly BlockNode[]): HeadingNode[] {
  const headings: HeadingNode[] = [];
  for (const block of blocks) {
    if (block.type === "heading") headings.push(block);
    if (block.type === "blockquote" || block.type === "listItem") {
      headings.push(...collectHeadings(block.children));
    }
    if (block.type === "list") {
      for (const item of block.children) headings.push(...collectHeadings(item.children));
    }
  }
  return headings;
}

interface CloneContext {
  headingShift: number;
  footnotePrefix: string;
  localIds: Map<HeadingNode, string>;
  file: ComposedBookFile;
  nodeFiles: WeakMap<object, ComposedBookFile>;
}

function cloneBlock(block: BlockNode, context: CloneContext): BlockNode | undefined {
  switch (block.type) {
    case "paragraph":
      return markNode<ParagraphNode>({
        ...block,
        children: cloneInlines(block.children, context)
      }, context);
    case "heading": {
      const cloned = markNode<HeadingNode>({
        ...block,
        level: shiftHeadingLevel(block.level, context.headingShift),
        children: cloneInlines(block.children, context)
      }, context);
      const localId = context.localIds.get(block);
      if (localId) context.file.localTargets.set(localId, cloned);
      return cloned;
    }
    case "thematicBreak":
      return markNode<ThematicBreakNode>({ ...block }, context);
    case "blockquote":
      return markNode<BlockQuoteNode>({
        ...block,
        children: cloneBlocks(block.children, context)
      }, context);
    case "list":
      return markNode<ListNode>({
        ...block,
        children: block.children.map((item) => cloneBlock(item, context)).filter(isListItemNode)
      }, context);
    case "listItem":
      return markNode<ListItemNode>({
        ...block,
        task: block.task ? { ...block.task } : undefined,
        children: cloneBlocks(block.children, context)
      }, context);
    case "table":
      return markNode<TableNode>({
        ...block,
        alignments: [...block.alignments],
        header: block.header.map((cell) => cloneTableCell(cell, context)),
        rows: block.rows.map((row) => row.map((cell) => cloneTableCell(cell, context)))
      }, context);
    case "codeBlock":
      return markNode<CodeBlockNode>({ ...block }, context);
    case "htmlBlock":
      return markNode<HtmlBlockNode>({ ...block }, context);
    case "linkReferenceDefinition":
      return markNode<LinkReferenceDefinitionNode>({ ...block }, context);
    case "footnoteDefinition":
      return markNode<FootnoteDefinitionNode>({
        ...block,
        label: prefixedFootnoteLabel(context.footnotePrefix, block.label),
        children: cloneBlocks(block.children, context)
      }, context);
    case "frontmatter":
      return undefined;
  }
}

function cloneBlocks(blocks: readonly BlockNode[], context: CloneContext): BlockNode[] {
  return blocks.map((block) => cloneBlock(block, context)).filter(isBlockNode);
}

function cloneTableCell(cell: TableCellNode, context: CloneContext): TableCellNode {
  return markNode<TableCellNode>({
    ...cell,
    children: cloneInlines(cell.children, context)
  }, context);
}

function cloneInlines(nodes: readonly InlineNode[], context: CloneContext): InlineNode[] {
  return nodes.map((node) => cloneInline(node, context));
}

function cloneInline(node: InlineNode, context: CloneContext): InlineNode {
  switch (node.type) {
    case "text":
      return markNode<TextNode>({ ...node }, context);
    case "softBreak":
      return markNode<SoftBreakNode>({ ...node }, context);
    case "hardBreak":
      return markNode<HardBreakNode>({ ...node }, context);
    case "codeSpan":
      return markNode<CodeSpanNode>({ ...node }, context);
    case "emphasis":
      return markNode<EmphasisNode>({
        ...node,
        children: cloneInlines(node.children, context)
      }, context);
    case "strong":
      return markNode<StrongNode>({
        ...node,
        children: cloneInlines(node.children, context)
      }, context);
    case "strikethrough":
      return markNode<StrikethroughNode>({
        ...node,
        children: cloneInlines(node.children, context)
      }, context);
    case "link":
      return markNode<LinkNode>({
        ...node,
        children: cloneInlines(node.children, context)
      }, context);
    case "image":
      return markNode<ImageNode>({
        ...node,
        children: cloneInlines(node.children, context)
      }, context);
    case "autoLink":
      return markNode<AutoLinkNode>({ ...node }, context);
    case "footnoteReference":
      return markNode<FootnoteReferenceNode>({
        ...node,
        label: prefixedFootnoteLabel(context.footnotePrefix, node.label)
      }, context);
    case "htmlInline":
      return markNode<HtmlInlineNode>({ ...node }, context);
  }
}

function markNode<T extends object>(node: T, context: CloneContext): T {
  context.nodeFiles.set(node, context.file);
  return node;
}

function syntheticHeading(level: HeadingNode["level"], title: string): HeadingNode {
  const text: TextNode = {
    type: "text",
    value: title,
    range: syntheticRange
  };
  return {
    type: "heading",
    level,
    raw: title,
    children: [text],
    range: syntheticRange
  };
}

function prefixedFootnoteLabel(prefix: string, label: string): string {
  return `${prefix}-${label}`;
}

function shiftHeadingLevel(level: HeadingNode["level"], amount: number): HeadingNode["level"] {
  return Math.min(6, level + amount) as HeadingNode["level"];
}

function isBlockNode(block: BlockNode | undefined): block is BlockNode {
  return block !== undefined;
}

function isListItemNode(block: BlockNode | undefined): block is ListItemNode {
  return block?.type === "listItem";
}

interface RewriteOptions {
  rootPath: string;
  outputDir: string;
  explicitTitle: string;
  diagnostics: Diagnostic[];
}

function rewriteBookLinks(composed: ComposeResult, options: RewriteOptions): void {
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

interface LinkRewriteContext extends RewriteOptions {
  fileTargets: Map<string, string>;
  fragmentTargets: Map<string, string>;
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
