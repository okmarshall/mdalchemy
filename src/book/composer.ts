import path from "node:path";
import { slugify } from "../document/outline.js";
import {
  type AutoLinkNode,
  type BlockNode,
  type BlockQuoteNode,
  type CodeBlockNode,
  type CodeSpanNode,
  type DocumentNode,
  type EmphasisNode,
  type FootnoteDefinitionNode,
  type FootnoteReferenceNode,
  type HardBreakNode,
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
  type SourceRange,
  type StrikethroughNode,
  type StrongNode,
  type TableCellNode,
  type TableNode,
  type TextNode,
  type ThematicBreakNode,
  textContent
} from "../markdown/ast.js";
import type { BookFrontmatter } from "./frontmatter.js";
import type { ComposedBookFile, ComposeResult, ParsedBookFile } from "./types.js";

const syntheticRange: SourceRange = {
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 }
};

export function composeBookDocument(title: string, files: readonly ParsedBookFile[]): ComposeResult {
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

export function bookFileTitle(relativePath: string, metadata: BookFrontmatter, document: DocumentNode): string {
  if (metadata.title) return metadata.title;
  const first = firstDirectHeading(document);
  if (first) return textContent(first.children) || first.raw;
  return readablePathTitle(relativePath);
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
