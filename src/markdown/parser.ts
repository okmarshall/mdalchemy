import { DiagnosticBag } from "../core/diagnostics.js";
import {
  countIndentColumns,
  createSourceText,
  isBlankLine,
  rangeFromOffsets,
  stripIndentColumns,
  type SourceLine,
  type SourceText
} from "../core/source.js";
import type {
  BlockNode,
  BlockQuoteNode,
  CodeBlockNode,
  DocumentNode,
  FootnoteDefinitionNode,
  FrontmatterNode,
  HeadingNode,
  HtmlBlockNode,
  LinkReferenceDefinition,
  LinkReferenceDefinitionNode,
  ListItemNode,
  ListNode,
  ParagraphNode,
  ReferenceMap,
  SourceRange,
  TableCellNode,
  TableNode,
  ThematicBreakNode
} from "./ast.js";
import {
  findNextNonBlank,
  isParagraphInterrupt,
  matchListMarker,
  matchTaskListMarker,
  sameList,
  stripBlockQuote,
  type ListMarker
} from "./block-containers.js";
import {
  isFenceClose,
  isThematicBreak,
  matchAtxHeading,
  matchFenceStart,
  matchFootnoteDefinitionStart,
  matchFrontmatterFence,
  matchHtmlBlockStart,
  matchSetextHeading,
  parseReferenceDefinition,
  type FenceStart,
  type HtmlBlockStart
} from "./block-leaves.js";
import { hasMarkdownExtension, type MarkdownExtension } from "./extensions.js";
import { parseInlines } from "./inline-parser.js";
import { normalizeReferenceLabel } from "./references.js";
import { normalizeTableCells, parseTableAlignment, splitTableRow } from "./table-parser.js";

export interface MarkdownOptions {
  profile?: "commonmark";
  extensions?: readonly string[];
}

export interface ParseResult {
  document: DocumentNode;
}

interface WorkingLine {
  index: number;
  startOffset: number;
  endOffset: number;
  text: string;
}

export function parseMarkdown(markdown: string, options: MarkdownOptions = {}, path?: string): ParseResult {
  const source = createSourceText(markdown, path);
  const parser = new BlockParser(source, options);
  return { document: parser.parse() };
}

class BlockParser {
  private readonly references: ReferenceMap = new Map();
  private readonly diagnostics = new DiagnosticBag();

  constructor(
    private readonly source: SourceText,
    private readonly options: MarkdownOptions
  ) {}

  parse(): DocumentNode {
    const lines = this.source.lines.map(toWorkingLine);
    const frontmatter = this.tryParseFrontmatter(lines);
    const children = frontmatter
      ? [frontmatter.node, ...this.parseBlocks(lines, frontmatter.next, lines.length)]
      : this.parseBlocks(lines, 0, lines.length);
    this.refreshInlineNodes(children);
    const range = rangeFromOffsets(this.source, 0, this.source.text.length);
    return {
      type: "document",
      range,
      children,
      references: this.references,
      diagnostics: this.diagnostics.diagnostics
    };
  }

  private tryParseFrontmatter(lines: WorkingLine[]): { node: FrontmatterNode; next: number } | undefined {
    if (!this.hasExtension("frontmatter")) return undefined;
    const first = lines[0];
    if (!first || !matchFrontmatterFence(first.text)) return undefined;

    let index = 1;
    while (index < lines.length) {
      const line = lines[index];
      if (!line) break;
      if (matchFrontmatterFence(line.text)) {
        const raw = lines.slice(1, index).map((frontmatterLine) => frontmatterLine.text).join("\n");
        return {
          node: {
            type: "frontmatter",
            raw,
            format: "yaml",
            range: this.lineRange(first, line)
          },
          next: index + 1
        };
      }
      index += 1;
    }

    return undefined;
  }

  private parseBlocks(lines: WorkingLine[], start: number, end: number): BlockNode[] {
    const nodes: BlockNode[] = [];
    let index = start;

    while (index < end) {
      const line = lines[index];
      if (!line) break;

      if (isBlankLine(line.text)) {
        index += 1;
        continue;
      }

      const fence = matchFenceStart(line.text);
      if (fence) {
        const parsed = this.parseFencedCode(lines, index, end, fence);
        nodes.push(parsed.node);
        index = parsed.next;
        continue;
      }

      const heading = matchAtxHeading(line.text);
      if (heading) {
        nodes.push(this.heading(line, heading.level, heading.content));
        index += 1;
        continue;
      }

      if (isThematicBreak(line.text)) {
        nodes.push(this.thematicBreak(line));
        index += 1;
        continue;
      }

      if (stripBlockQuote(line.text) !== undefined) {
        const parsed = this.parseBlockQuote(lines, index, end);
        nodes.push(parsed.node);
        index = parsed.next;
        continue;
      }

      const listMarker = matchListMarker(line.text);
      if (listMarker) {
        const parsed = this.parseList(lines, index, end, listMarker);
        nodes.push(parsed.node);
        index = parsed.next;
        continue;
      }

      const htmlStart = matchHtmlBlockStart(line.text);
      if (htmlStart) {
        const parsed = this.parseHtmlBlock(lines, index, end, htmlStart);
        nodes.push(parsed.node);
        index = parsed.next;
        continue;
      }

      if (this.hasExtension("gfm-footnote")) {
        const parsed = this.tryParseFootnoteDefinition(lines, index, end);
        if (parsed) {
          nodes.push(parsed.node);
          index = parsed.next;
          continue;
        }
      }

      const reference = parseReferenceDefinition(line.text);
      if (reference) {
        const node = this.referenceDefinition(line, reference.label, reference.destination, reference.title);
        nodes.push(node);
        this.addReference(node);
        index += 1;
        continue;
      }

      if (this.hasExtension("gfm-table")) {
        const parsed = this.tryParseTable(lines, index, end);
        if (parsed) {
          nodes.push(parsed.node);
          index = parsed.next;
          continue;
        }
      }

      if (countIndentColumns(line.text) >= 4) {
        const parsed = this.parseIndentedCode(lines, index, end);
        nodes.push(parsed.node);
        index = parsed.next;
        continue;
      }

      const parsed = this.parseParagraph(lines, index, end);
      nodes.push(parsed.node);
      index = parsed.next;
    }

    return nodes;
  }

  private parseParagraph(lines: WorkingLine[], start: number, end: number): { node: ParagraphNode | HeadingNode; next: number } {
    const paragraphLines: WorkingLine[] = [];
    let index = start;

    while (index < end) {
      const line = lines[index];
      if (!line || isBlankLine(line.text)) break;

      if (paragraphLines.length > 0) {
        const setext = matchSetextHeading(line.text);
        if (setext) {
          const raw = paragraphLines.map((paragraphLine) => paragraphLine.text.trim()).join("\n");
          const first = paragraphLines[0] ?? line;
          return {
            node: this.headingFromRange(first, line, setext.level, raw),
            next: index + 1
          };
        }

        if (isParagraphInterrupt(line.text)) break;
        if (this.hasExtension("gfm-footnote") && matchFootnoteDefinitionStart(line.text)) break;
      }

      paragraphLines.push(line);
      index += 1;
    }

    const first = paragraphLines[0] ?? lines[start]!;
    const last = paragraphLines[paragraphLines.length - 1] ?? first;
    const raw = paragraphLines.map((line) => line.text.trim()).join("\n");
    const range = this.lineRange(first, last);
    const node: ParagraphNode = {
      type: "paragraph",
      raw,
      children: parseInlines(raw, this.inlineOptions(range)),
      range
    };
    return { node, next: index };
  }

  private tryParseTable(lines: WorkingLine[], start: number, end: number): { node: TableNode; next: number } | undefined {
    const headerLine = lines[start];
    const delimiterLine = lines[start + 1];
    if (!headerLine || !delimiterLine) return undefined;
    if (countIndentColumns(headerLine.text) >= 4 || countIndentColumns(delimiterLine.text) >= 4) return undefined;

    const headerCells = splitTableRow(headerLine.text);
    const delimiterCells = splitTableRow(delimiterLine.text);
    if (!headerCells || !delimiterCells) return undefined;
    if (headerCells.length === 0 || headerCells.length !== delimiterCells.length) return undefined;

    const alignments = delimiterCells.map(parseTableAlignment);
    if (alignments.some((alignment) => alignment === undefined)) return undefined;
    const tableAlignments = alignments as TableCellNode["alignment"][];
    const header = headerCells.map((raw, column) => this.tableCell(headerLine, raw, tableAlignments[column] ?? null, true));
    const rows: TableCellNode[][] = [];
    let index = start + 2;
    let last = delimiterLine;

    while (index < end) {
      const line = lines[index];
      if (!line || isBlankLine(line.text)) break;
      if (countIndentColumns(line.text) >= 4) break;
      if (isParagraphInterrupt(line.text)) break;
      const cells = splitTableRow(line.text);
      if (!cells) break;
      rows.push(normalizeTableCells(cells, tableAlignments.length).map((raw, column) => (
        this.tableCell(line, raw, tableAlignments[column] ?? null, false)
      )));
      last = line;
      index += 1;
    }

    return {
      node: {
        type: "table",
        alignments: tableAlignments,
        header,
        rows,
        range: this.lineRange(headerLine, last)
      },
      next: index
    };
  }

  private tryParseFootnoteDefinition(
    lines: WorkingLine[],
    start: number,
    end: number
  ): { node: FootnoteDefinitionNode; next: number } | undefined {
    const first = lines[start];
    if (!first) return undefined;
    const footnote = matchFootnoteDefinitionStart(first.text);
    if (!footnote) return undefined;

    const contentLines: WorkingLine[] = [{ ...first, text: footnote.content }];
    let index = start + 1;
    let last = first;

    while (index < end) {
      const line = lines[index];
      if (!line) break;

      if (isBlankLine(line.text)) {
        const nextContent = findNextNonBlank(lines, index + 1, end);
        if (nextContent === -1) break;
        const nextLine = lines[nextContent];
        if (!nextLine || countIndentColumns(nextLine.text) < 4) break;
        contentLines.push({ ...line, text: "" });
        last = line;
        index += 1;
        continue;
      }

      if (countIndentColumns(line.text) < 4) break;
      contentLines.push({ ...line, text: stripIndentColumns(line.text, 4) });
      last = line;
      index += 1;
    }

    return {
      node: {
        type: "footnoteDefinition",
        label: footnote.label,
        children: this.parseBlocks(contentLines, 0, contentLines.length),
        range: this.lineRange(first, last)
      },
      next: index
    };
  }

  private parseFencedCode(
    lines: WorkingLine[],
    start: number,
    end: number,
    fence: FenceStart
  ): { node: CodeBlockNode; next: number } {
    const opener = lines[start]!;
    const content: string[] = [];
    let index = start + 1;
    let closer = opener;

    while (index < end) {
      const line = lines[index];
      if (!line) break;
      if (isFenceClose(line.text, fence.char, fence.length)) {
        closer = line;
        index += 1;
        break;
      }
      content.push(stripIndentColumns(line.text, fence.indent));
      closer = line;
      index += 1;
    }

    const info = fence.info.trim();
    const language = info ? info.split(/\s+/)[0] : undefined;
    const node: CodeBlockNode = {
      type: "codeBlock",
      kind: "fenced",
      literal: content.join("\n"),
      range: this.lineRange(opener, closer),
      fence: fence.char
    };
    if (info) node.info = info;
    if (language) node.language = language;
    return { node, next: index };
  }

  private parseIndentedCode(lines: WorkingLine[], start: number, end: number): { node: CodeBlockNode; next: number } {
    const first = lines[start]!;
    const content: string[] = [];
    let index = start;
    let last = first;

    while (index < end) {
      const line = lines[index];
      if (!line) break;
      if (!isBlankLine(line.text) && countIndentColumns(line.text) < 4) break;
      content.push(isBlankLine(line.text) ? "" : stripIndentColumns(line.text, 4));
      last = line;
      index += 1;
    }

    while (content.length > 0 && content[content.length - 1] === "") {
      content.pop();
    }

    const node: CodeBlockNode = {
      type: "codeBlock",
      kind: "indented",
      literal: content.join("\n"),
      range: this.lineRange(first, last)
    };
    return { node, next: index };
  }

  private parseBlockQuote(lines: WorkingLine[], start: number, end: number): { node: BlockQuoteNode; next: number } {
    const first = lines[start]!;
    const quoteLines: WorkingLine[] = [];
    let index = start;
    let last = first;

    while (index < end) {
      const line = lines[index];
      if (!line) break;
      const stripped = stripBlockQuote(line.text);
      if (stripped !== undefined) {
        quoteLines.push({ ...line, text: stripped });
        last = line;
        index += 1;
        continue;
      }

      if (isBlankLine(line.text)) {
        quoteLines.push({ ...line, text: "" });
        last = line;
        index += 1;
        continue;
      }

      if (!isParagraphInterrupt(line.text)) {
        quoteLines.push(line);
        last = line;
        index += 1;
        continue;
      }

      break;
    }

    const node: BlockQuoteNode = {
      type: "blockquote",
      children: this.parseBlocks(quoteLines, 0, quoteLines.length),
      range: this.lineRange(first, last)
    };
    return { node, next: index };
  }

  private parseList(
    lines: WorkingLine[],
    start: number,
    end: number,
    firstMarker: ListMarker
  ): { node: ListNode; next: number } {
    const first = lines[start]!;
    const items: ListItemNode[] = [];
    let index = start;
    let last = first;
    let loose = false;

    while (index < end) {
      const markerLine = lines[index];
      if (!markerLine) break;
      const marker = matchListMarker(markerLine.text);
      if (!marker || !sameList(firstMarker, marker)) break;

      const itemLines: WorkingLine[] = [];
      const taskMarker = this.hasExtension("gfm-task-list") ? matchTaskListMarker(marker.content) : undefined;
      itemLines.push({ ...markerLine, text: taskMarker?.content ?? marker.content });
      index += 1;
      let itemLast = markerLine;
      let sawBlank = false;

      while (index < end) {
        const line = lines[index];
        if (!line) break;

      if (isBlankLine(line.text)) {
        const nextContent = findNextNonBlank(lines, index + 1, end);
        if (nextContent === -1) break;
        const nextLine = lines[nextContent];
        const nextMarker = nextLine ? matchListMarker(nextLine.text) : undefined;
        if (nextMarker && nextMarker.indent <= marker.indent) break;
        if (nextLine && countIndentColumns(nextLine.text) <= marker.indent) break;

        itemLines.push({ ...line, text: "" });
        sawBlank = true;
        itemLast = line;
        index += 1;
          continue;
        }

        const nextMarker = matchListMarker(line.text);
        if (nextMarker && nextMarker.indent <= marker.indent && sameList(firstMarker, nextMarker)) {
          break;
        }

        const requiredIndent = marker.indent + marker.markerColumns + marker.padding;
        if (countIndentColumns(line.text) >= requiredIndent) {
          itemLines.push({ ...line, text: stripIndentColumns(line.text, requiredIndent) });
          itemLast = line;
          index += 1;
          continue;
        }

        if (!isParagraphInterrupt(line.text)) {
          itemLines.push(line);
          itemLast = line;
          index += 1;
          continue;
        }

        break;
      }

      const children = this.parseBlocks(itemLines, 0, itemLines.length);
      if (sawBlank || children.some((child) => child.type === "list" && !child.tight)) {
        loose = true;
      }

      const item: ListItemNode = {
        type: "listItem",
        marker: marker.marker,
        padding: marker.padding,
        children,
        range: this.lineRange(markerLine, itemLast)
      };
      if (taskMarker) item.task = { checked: taskMarker.checked };
      items.push(item);
      last = itemLast;
    }

    const node: ListNode = {
      type: "list",
      ordered: firstMarker.ordered,
      start: firstMarker.start,
      delimiter: firstMarker.delimiter,
      bullet: firstMarker.bullet,
      tight: !loose,
      children: items,
      range: this.lineRange(first, last)
    };
    return { node, next: index };
  }

  private parseHtmlBlock(
    lines: WorkingLine[],
    start: number,
    end: number,
    htmlStart: HtmlBlockStart
  ): { node: HtmlBlockNode; next: number } {
    const first = lines[start]!;
    const content: string[] = [first.text];
    let index = start + 1;
    let last = first;

    if (htmlStart.endCondition && htmlStart.endCondition(first.text)) {
      return {
        node: {
          type: "htmlBlock",
          literal: content.join("\n"),
          blockKind: htmlStart.kind,
          range: this.lineRange(first, last)
        },
        next: index
      };
    }

    while (index < end) {
      const line = lines[index];
      if (!line) break;
      if (htmlStart.untilBlank && isBlankLine(line.text)) break;
      content.push(line.text);
      last = line;
      index += 1;
      if (htmlStart.endCondition?.(line.text)) break;
    }

    const node: HtmlBlockNode = {
      type: "htmlBlock",
      literal: content.join("\n"),
      blockKind: htmlStart.kind,
      range: this.lineRange(first, last)
    };
    return { node, next: index };
  }

  private heading(line: WorkingLine, level: HeadingNode["level"], raw: string): HeadingNode {
    return this.headingFromRange(line, line, level, raw);
  }

  private headingFromRange(first: WorkingLine, last: WorkingLine, level: HeadingNode["level"], raw: string): HeadingNode {
    const range = this.lineRange(first, last);
    return {
      type: "heading",
      level,
      raw,
      children: parseInlines(raw, this.inlineOptions(range)),
      range
    };
  }

  private thematicBreak(line: WorkingLine): ThematicBreakNode {
    return {
      type: "thematicBreak",
      range: this.lineRange(line, line)
    };
  }

  private referenceDefinition(
    line: WorkingLine,
    label: string,
    destination: string,
    title: string | undefined
  ): LinkReferenceDefinitionNode {
    const node: LinkReferenceDefinitionNode = {
      type: "linkReferenceDefinition",
      label,
      destination,
      range: this.lineRange(line, line)
    };
    if (title !== undefined) node.title = title;
    return node;
  }

  private tableCell(line: WorkingLine, raw: string, alignment: TableCellNode["alignment"], header: boolean): TableCellNode {
    const range = this.lineRange(line, line);
    return {
      type: "tableCell",
      raw,
      children: parseInlines(raw, this.inlineOptions(range)),
      alignment,
      header,
      range
    };
  }

  private addReference(node: LinkReferenceDefinitionNode): void {
    const normalizedLabel = normalizeReferenceLabel(node.label);
    if (this.references.has(normalizedLabel)) return;
    const reference: LinkReferenceDefinition = {
      label: node.label,
      normalizedLabel,
      destination: node.destination,
      range: node.range
    };
    if (node.title !== undefined) reference.title = node.title;
    this.references.set(normalizedLabel, reference);
  }

  private refreshInlineNodes(blocks: BlockNode[]): void {
    for (const block of blocks) {
      switch (block.type) {
        case "paragraph":
        case "heading":
          block.children = parseInlines(block.raw, this.inlineOptions(block.range));
          break;
        case "blockquote":
        case "listItem":
        case "footnoteDefinition":
          this.refreshInlineNodes(block.children);
          break;
        case "list":
          for (const item of block.children) this.refreshInlineNodes(item.children);
          break;
        case "table":
          for (const cell of block.header) {
            cell.children = parseInlines(cell.raw, this.inlineOptions(cell.range));
          }
          for (const row of block.rows) {
            for (const cell of row) {
              cell.children = parseInlines(cell.raw, this.inlineOptions(cell.range));
            }
          }
          break;
        case "codeBlock":
        case "frontmatter":
        case "htmlBlock":
        case "linkReferenceDefinition":
        case "thematicBreak":
          break;
      }
    }
  }

  private lineRange(first: WorkingLine, last: WorkingLine): SourceRange {
    return rangeFromOffsets(this.source, first.startOffset, last.endOffset);
  }

  private hasExtension(extension: MarkdownExtension): boolean {
    return hasMarkdownExtension(this.options.extensions, extension);
  }

  private inlineOptions(baseRange: SourceRange) {
    return {
      references: this.references,
      baseRange,
      extensions: this.options.extensions
    };
  }
}

function toWorkingLine(line: SourceLine): WorkingLine {
  return {
    index: line.index,
    startOffset: line.startOffset,
    endOffset: line.endOffset,
    text: line.text
  };
}
