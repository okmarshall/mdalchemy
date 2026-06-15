import type {
  AutoLinkNode,
  CodeSpanNode,
  EmphasisNode,
  FootnoteReferenceNode,
  HardBreakNode,
  HtmlInlineNode,
  ImageNode,
  InlineNode,
  LinkNode,
  ReferenceMap,
  SoftBreakNode,
  SourceRange,
  StrongNode,
  StrikethroughNode,
  TextNode
} from "./ast.js";
import { textContent } from "./ast.js";
import {
  analyzeEmphasisDelimiterRun,
  mergeAdjacentText,
  normalizeCodeSpan,
  type EmphasisDelimiterRun
} from "./inline-delimiters.js";
import { isLiteralAutolinkBoundary, trimLiteralAutolinkCandidate } from "./inline-extensions.js";
import { readDestination, readTitle, skipSpaces } from "./inline-links.js";
import { hasMarkdownExtension, type MarkdownExtension } from "./extensions.js";
import { decodeCharacterReference } from "./entities.js";
import { findHtmlTagEnd, isHtmlInlineLiteral } from "./html.js";
import { normalizeReferenceLabel } from "./references.js";

const escapable = /[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/;

type DelimiterChar = "*" | "_";

interface InlineParserOptions {
  references?: ReferenceMap;
  baseRange?: SourceRange;
  extensions?: readonly string[] | undefined;
}

interface Delimiter {
  char: DelimiterChar;
  length: number;
  canOpen: boolean;
  canClose: boolean;
  node: TextNode;
  previous: Delimiter | undefined;
  next: Delimiter | undefined;
}

interface BracketMarker {
  node: TextNode;
  image: boolean;
  active: boolean;
  start: number;
  contentStart: number;
  previousDelimiter: Delimiter | undefined;
}

interface LinkResolution {
  destination: string;
  title?: string | undefined;
  kind: LinkNode["referenceKind"];
  end: number;
}

export function parseInlines(source: string, options: InlineParserOptions = {}): InlineNode[] {
  const parser = new InlineParser(source, options.references ?? new Map(), options.baseRange, options.extensions ?? []);
  return parser.parse();
}

class InlineParser {
  private index = 0;
  private readonly nodes: InlineNode[] = [];
  private readonly brackets: BracketMarker[] = [];
  private firstDelimiter: Delimiter | undefined;
  private lastDelimiter: Delimiter | undefined;

  constructor(
    private readonly source: string,
    private readonly references: ReferenceMap,
    private readonly baseRange: SourceRange | undefined,
    private readonly extensions: readonly string[]
  ) {}

  parse(): InlineNode[] {
    while (this.index < this.source.length) {
      const char = this.source[this.index] ?? "";

      if (char === "\\" && this.parseEscape()) continue;
      if (char === "`" && this.parseCodeSpan()) continue;
      if (char === "!" && this.source[this.index + 1] === "[" && this.parseOpenBracket(true)) continue;
      if (char === "[" && this.hasExtension("gfm-footnote") && this.parseFootnoteReference()) continue;
      if (char === "[" && this.parseOpenBracket(false)) continue;
      if (char === "]" && this.parseCloseBracket()) continue;
      if (char === "<" && this.parseAutolinkOrHtml()) continue;
      if (char === "&" && this.parseEntity()) continue;
      if (char === "~" && this.hasExtension("gfm-strikethrough") && this.parseStrikethrough()) continue;
      if ((char === "*" || char === "_") && this.parseEmphasisDelimiter(char)) continue;
      if (this.hasExtension("gfm-literal-autolink") && this.parseLiteralAutolink()) continue;
      if (char === "\n") {
        this.parseLineBreak();
        continue;
      }

      this.parseText();
    }

    this.processEmphasis(undefined);
    return mergeAdjacentText(this.nodes);
  }

  private parseEscape(): boolean {
    const next = this.source[this.index + 1];
    if (next && escapable.test(next)) {
      const start = this.index;
      this.index += 2;
      this.pushText(next, start, this.index);
      return true;
    }

    if (next === "\n") {
      const start = this.index;
      this.index += 2;
      this.nodes.push(this.hardBreak(start, this.index));
      return true;
    }

    return false;
  }

  private parseCodeSpan(): boolean {
    const start = this.index;
    const tickCount = this.consumeRun("`");
    const close = this.findClosingRun("`", tickCount, this.index);
    if (close === -1) {
      this.index = start;
      return false;
    }

    const raw = this.source.slice(this.index, close);
    const normalized = normalizeCodeSpan(raw);
    this.index = close + tickCount;
    const node: CodeSpanNode = {
      type: "codeSpan",
      literal: normalized,
      range: this.range(start, this.index)
    };
    this.nodes.push(node);
    return true;
  }

  private parseFootnoteReference(): boolean {
    const start = this.index;
    const match = /^\[\^([^\]\s]+)\]/.exec(this.source.slice(start));
    if (!match?.[1]) return false;

    this.index += match[0].length;
    const node: FootnoteReferenceNode = {
      type: "footnoteReference",
      label: match[1],
      range: this.range(start, this.index)
    };
    this.nodes.push(node);
    return true;
  }

  private parseOpenBracket(image: boolean): boolean {
    const start = this.index;
    const literal = image ? "![" : "[";
    this.index += literal.length;
    const node = this.pushText(literal, start, this.index);
    this.brackets.push({
      node,
      image,
      active: true,
      start,
      contentStart: this.index,
      previousDelimiter: this.lastDelimiter
    });
    return true;
  }

  private parseCloseBracket(): boolean {
    const start = this.index;
    this.index += 1;
    const closerNode = this.pushText("]", start, this.index);
    const opener = this.brackets[this.brackets.length - 1];
    if (!opener) return true;

    if (!opener.active) {
      this.removeBracket(opener);
      return true;
    }

    const labelSource = this.source.slice(opener.contentStart, start);
    const inline = this.parseInlineDestination(this.index);
    const resolution = inline ?? this.parseReference(this.index, labelSource);
    if (!resolution) {
      this.removeBracket(opener);
      return true;
    }

    this.index = resolution.end;
    this.resolveBracket(opener, closerNode, resolution);
    return true;
  }

  private parseInlineDestination(cursor: number): LinkResolution | undefined {
    if (this.source[cursor] !== "(") return undefined;
    let index = cursor + 1;
    index = skipSpaces(this.source, index);
    const destinationResult = readDestination(this.source, index);
    if (!destinationResult) return undefined;
    index = skipSpaces(this.source, destinationResult.end);
    const titleResult = readTitle(this.source, index);
    let title: string | undefined;
    if (titleResult) {
      title = titleResult.title;
      index = skipSpaces(this.source, titleResult.end);
    }
    if (this.source[index] !== ")") return undefined;
    const result: LinkResolution = {
      destination: destinationResult.destination,
      kind: "inline",
      end: index + 1
    };
    if (title !== undefined) result.title = title;
    return result;
  }

  private parseReference(cursor: number, labelSource: string): LinkResolution | undefined {
    const explicit = this.readReferenceLabel(cursor);
    if (explicit) {
      const normalized = normalizeReferenceLabel(explicit.label || labelSource);
      const reference = this.references.get(normalized);
      if (!reference) return undefined;

      const result: LinkResolution = {
        destination: reference.destination,
        kind: explicit.label ? "full" : "collapsed",
        end: explicit.end
      };
      if (reference.title !== undefined) result.title = reference.title;
      return result;
    }

    const shortcut = this.references.get(normalizeReferenceLabel(labelSource));
    if (!shortcut) return undefined;
    const result: LinkResolution = {
      destination: shortcut.destination,
      kind: "shortcut",
      end: cursor
    };
    if (shortcut.title !== undefined) result.title = shortcut.title;
    return result;
  }

  private readReferenceLabel(cursor: number): { label: string; end: number } | undefined {
    if (this.source[cursor] !== "[") return undefined;

    let index = cursor + 1;
    let length = 0;
    while (index < this.source.length && length <= 999) {
      const char = this.source[index] ?? "";
      if (char === "\\") {
        index += 2;
        length += 2;
        continue;
      }
      if (char === "]") {
        return {
          label: this.source.slice(cursor + 1, index),
          end: index + 1
        };
      }
      if (char === "[") return undefined;
      index += 1;
      length += 1;
    }

    return undefined;
  }

  private resolveBracket(opener: BracketMarker, closerNode: TextNode, resolution: LinkResolution): void {
    this.processEmphasis(opener.previousDelimiter);

    const openIndex = this.nodes.indexOf(opener.node);
    const closeIndex = this.nodes.indexOf(closerNode);
    if (openIndex === -1 || closeIndex === -1 || closeIndex <= openIndex) {
      this.removeBracket(opener);
      return;
    }

    const rawChildren = this.nodes.slice(openIndex + 1, closeIndex);
    this.removeDelimitersForNodes(rawChildren);
    this.removeBracketsForNodes(rawChildren);
    const children = mergeAdjacentText(rawChildren);

    const node = opener.image
      ? this.image(opener.start, resolution.end, resolution.destination, resolution.title, children, resolution.kind)
      : this.link(opener.start, resolution.end, resolution.destination, resolution.title, children, resolution.kind);

    this.nodes.splice(openIndex, closeIndex - openIndex + 1, node);
    this.removeBracket(opener);

    if (!opener.image) {
      this.deactivateEarlierLinkOpeners();
    }
  }

  private parseAutolinkOrHtml(): boolean {
    const start = this.index;
    const close = findHtmlTagEnd(this.source, start);
    if (close === -1) return false;
    const literal = this.source.slice(start, close + 1);
    const inner = this.source.slice(start + 1, close);

    if (/^[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*$/.test(inner)) {
      this.index = close + 1;
      const node: AutoLinkNode = {
        type: "autoLink",
        destination: inner,
        label: inner,
        kind: "uri",
        range: this.range(start, this.index)
      };
      this.nodes.push(node);
      return true;
    }

    if (/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(inner)) {
      this.index = close + 1;
      const node: AutoLinkNode = {
        type: "autoLink",
        destination: `mailto:${inner}`,
        label: inner,
        kind: "email",
        range: this.range(start, this.index)
      };
      this.nodes.push(node);
      return true;
    }

    if (isHtmlInlineLiteral(literal)) {
      this.index = close + 1;
      const node: HtmlInlineNode = {
        type: "htmlInline",
        literal,
        range: this.range(start, this.index)
      };
      this.nodes.push(node);
      return true;
    }

    return false;
  }

  private parseEntity(): boolean {
    const start = this.index;
    const match = /^&(#x[0-9A-Fa-f]+|#X[0-9A-Fa-f]+|#[0-9]+|[A-Za-z][A-Za-z0-9]+);/.exec(this.source.slice(start));
    if (!match) return false;
    const entity = match[1];
    if (!entity) return false;

    const value = decodeCharacterReference(entity);
    if (!value) return false;

    this.index += match[0].length;
    this.pushText(value, start, this.index);
    return true;
  }

  private parseEmphasisDelimiter(char: DelimiterChar): boolean {
    const start = this.index;
    const run = analyzeEmphasisDelimiterRun(this.source, start, char);
    this.index += run.length;
    const node = this.pushText(this.source.slice(start, this.index), start, this.index);
    if (run.canOpen || run.canClose) {
      this.pushDelimiter(run, node);
    }
    return true;
  }

  private parseStrikethrough(): boolean {
    const start = this.index;
    if (!this.source.startsWith("~~", start)) return false;
    const close = this.source.indexOf("~~", start + 2);
    if (close === -1 || close === start + 2) return false;

    const innerSource = this.source.slice(start + 2, close);
    const node: StrikethroughNode = {
      type: "strikethrough",
      children: this.parseChildInlines(innerSource, start + 2, close),
      range: this.range(start, close + 2)
    };
    this.index = close + 2;
    this.nodes.push(node);
    return true;
  }

  private parseLiteralAutolink(): boolean {
    const start = this.index;
    if (!isLiteralAutolinkBoundary(this.source, start)) return false;

    const rest = this.source.slice(start);
    const uriMatch = /^(?:https?:\/\/[^\s<]+|www\.[^\s<]+)/i.exec(rest);
    if (uriMatch?.[0]) {
      const label = trimLiteralAutolinkCandidate(uriMatch[0]);
      if (!label) return false;
      this.index = start + label.length;
      const node: AutoLinkNode = {
        type: "autoLink",
        destination: /^www\./i.test(label) ? `http://${label}` : label,
        label,
        kind: "uri",
        range: this.range(start, this.index)
      };
      this.nodes.push(node);
      return true;
    }

    const emailMatch = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/.exec(rest);
    if (!emailMatch?.[0]) return false;
    const label = trimLiteralAutolinkCandidate(emailMatch[0]);
    if (!label) return false;
    this.index = start + label.length;
    const node: AutoLinkNode = {
      type: "autoLink",
      destination: `mailto:${label}`,
      label,
      kind: "email",
      range: this.range(start, this.index)
    };
    this.nodes.push(node);
    return true;
  }

  private parseLineBreak(): void {
    const start = this.index;
    this.index += 1;
    const previous = this.nodes[this.nodes.length - 1];
    if (previous?.type === "text") {
      if (previous.value.endsWith("\\")) {
        previous.value = previous.value.slice(0, -1);
        this.nodes.push(this.hardBreak(start, this.index));
        return;
      }

      const trimmed = previous.value.replace(/ {2,}$/, "");
      if (trimmed.length !== previous.value.length) {
        previous.value = trimmed;
        this.nodes.push(this.hardBreak(start, this.index));
        return;
      }

      previous.value = previous.value.replace(/ +$/, "");
    }

    const node: SoftBreakNode = {
      type: "softBreak",
      range: this.range(start, this.index)
    };
    this.nodes.push(node);
  }

  private parseText(): void {
    const start = this.index;
    while (this.index < this.source.length) {
      if (this.hasExtension("gfm-literal-autolink") && this.literalAutolinkCanParseAt(this.index)) break;
      if (this.specialCanParseAt(this.index)) break;
      this.index += this.source[this.index] === "`" ? this.countRunAt(this.index, "`") : 1;
    }

    if (this.index === start) {
      this.index += 1;
    }

    this.pushText(this.source.slice(start, this.index), start, this.index);
  }

  private specialCanParseAt(index: number): boolean {
    const char = this.source[index];
    if (char === "\\") {
      const next = this.source[index + 1];
      return next === "\n" || Boolean(next && escapable.test(next));
    }
    if (char === "`") {
      const tickCount = this.countRunAt(index, "`");
      return this.findClosingRun("`", tickCount, index + tickCount) !== -1;
    }
    if (char === "!" && this.source[index + 1] === "[") return true;
    if (char === "[") return true;
    if (char === "]") return true;
    if (char === "<") return this.source.indexOf(">", index + 1) !== -1;
    if (char === "&") return /^&(#x[0-9A-Fa-f]+|#X[0-9A-Fa-f]+|#[0-9]+|[A-Za-z][A-Za-z0-9]+);/.test(this.source.slice(index));
    if (char === "*" || char === "_") return true;
    if (char === "~") return this.hasExtension("gfm-strikethrough") && this.source.startsWith("~~", index);
    if (char === "\n") return true;
    return false;
  }

  private processEmphasis(stackBottom: Delimiter | undefined): void {
    const bottom = stackBottom && this.hasDelimiter(stackBottom) ? stackBottom : undefined;
    let closer = this.nextCloser(bottom);

    while (closer) {
      const opener = this.findMatchingOpener(closer, bottom);
      if (!opener) {
        const next = closer.next;
        if (!closer.canOpen) {
          this.removeDelimiter(closer);
        }
        closer = nextCloserFrom(next);
        continue;
      }

      closer = this.applyEmphasis(opener, closer);
    }
  }

  private nextCloser(bottom: Delimiter | undefined): Delimiter | undefined {
    return nextCloserFrom(bottom ? bottom.next : this.firstDelimiter);
  }

  private findMatchingOpener(closer: Delimiter, bottom: Delimiter | undefined): Delimiter | undefined {
    let opener = closer.previous;
    while (opener && opener !== bottom) {
      if (this.delimitersCanMatch(opener, closer)) return opener;
      opener = opener.previous;
    }
    return undefined;
  }

  private delimitersCanMatch(opener: Delimiter, closer: Delimiter): boolean {
    if (opener.char !== closer.char || !opener.canOpen) return false;
    if ((opener.canClose || closer.canOpen) && (opener.length + closer.length) % 3 === 0) {
      return opener.length % 3 === 0 && closer.length % 3 === 0;
    }
    return true;
  }

  private applyEmphasis(opener: Delimiter, closer: Delimiter): Delimiter | undefined {
    const useDelimiters = opener.length >= 2 && closer.length >= 2 ? 2 : 1;
    const openIndex = this.nodes.indexOf(opener.node);
    const closeIndex = this.nodes.indexOf(closer.node);
    const next = closer.next;
    if (openIndex === -1 || closeIndex === -1 || closeIndex <= openIndex) {
      return nextCloserFrom(next);
    }

    const rawChildren = this.nodes.slice(openIndex + 1, closeIndex);
    this.removeDelimitersForNodes(rawChildren);
    const children = mergeAdjacentText(rawChildren);

    opener.length -= useDelimiters;
    closer.length -= useDelimiters;
    opener.node.value = opener.node.value.slice(0, opener.node.value.length - useDelimiters);
    closer.node.value = closer.node.value.slice(useDelimiters);

    const node: EmphasisNode | StrongNode = useDelimiters === 2
      ? {
          type: "strong",
          children,
          range: {
            start: opener.node.range.start,
            end: closer.node.range.end
          }
        }
      : {
          type: "emphasis",
          children,
          range: {
            start: opener.node.range.start,
            end: closer.node.range.end
          }
        };

    const replacement: InlineNode[] = [];
    if (opener.node.value) replacement.push(opener.node);
    replacement.push(node);
    if (closer.node.value) replacement.push(closer.node);
    this.nodes.splice(openIndex, closeIndex - openIndex + 1, ...replacement);

    if (opener.length === 0) {
      this.removeDelimiter(opener);
    }
    if (closer.length === 0) {
      this.removeDelimiter(closer);
      return nextCloserFrom(next);
    }

    return closer.canClose ? closer : nextCloserFrom(next);
  }

  private pushDelimiter(run: EmphasisDelimiterRun, node: TextNode): void {
    const delimiter: Delimiter = {
      char: run.char,
      length: run.length,
      canOpen: run.canOpen,
      canClose: run.canClose,
      node,
      previous: this.lastDelimiter,
      next: undefined
    };
    if (this.lastDelimiter) {
      this.lastDelimiter.next = delimiter;
    } else {
      this.firstDelimiter = delimiter;
    }
    this.lastDelimiter = delimiter;
  }

  private hasDelimiter(delimiter: Delimiter): boolean {
    let current = this.firstDelimiter;
    while (current) {
      if (current === delimiter) return true;
      current = current.next;
    }
    return false;
  }

  private removeDelimiter(delimiter: Delimiter): void {
    if (delimiter.previous) {
      delimiter.previous.next = delimiter.next;
    } else if (this.firstDelimiter === delimiter) {
      this.firstDelimiter = delimiter.next;
    }

    if (delimiter.next) {
      delimiter.next.previous = delimiter.previous;
    } else if (this.lastDelimiter === delimiter) {
      this.lastDelimiter = delimiter.previous;
    }

    delimiter.previous = undefined;
    delimiter.next = undefined;
  }

  private removeDelimitersForNodes(nodes: readonly InlineNode[]): void {
    const nodeSet = new Set(nodes);
    let delimiter = this.firstDelimiter;
    while (delimiter) {
      const next = delimiter.next;
      if (nodeSet.has(delimiter.node)) {
        this.removeDelimiter(delimiter);
      }
      delimiter = next;
    }
  }

  private removeBracketsForNodes(nodes: readonly InlineNode[]): void {
    const nodeSet = new Set(nodes);
    for (let index = this.brackets.length - 1; index >= 0; index -= 1) {
      const bracket = this.brackets[index];
      if (bracket && nodeSet.has(bracket.node)) {
        this.brackets.splice(index, 1);
      }
    }
  }

  private removeBracket(bracket: BracketMarker): void {
    const index = this.brackets.indexOf(bracket);
    if (index !== -1) {
      this.brackets.splice(index, 1);
    }
  }

  private deactivateEarlierLinkOpeners(): void {
    for (const bracket of this.brackets) {
      if (!bracket.image) {
        bracket.active = false;
      }
    }
  }

  private pushText(value: string, start: number, end: number): TextNode {
    const node: TextNode = {
      type: "text",
      value,
      range: this.range(start, end)
    };
    this.nodes.push(node);
    return node;
  }

  private parseChildInlines(source: string, start: number, end: number): InlineNode[] {
    return parseInlines(source, {
      references: this.references,
      baseRange: this.range(start, end),
      extensions: this.extensions
    });
  }

  private literalAutolinkCanParseAt(index: number): boolean {
    if (!isLiteralAutolinkBoundary(this.source, index)) return false;
    const rest = this.source.slice(index);
    return /^(?:https?:\/\/|www\.)/i.test(rest)
      || /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/.test(rest);
  }

  private hasExtension(extension: MarkdownExtension): boolean {
    return hasMarkdownExtension(this.extensions, extension);
  }

  private consumeRun(char: string): number {
    const start = this.index;
    while (this.source[this.index] === char) {
      this.index += 1;
    }
    return this.index - start;
  }

  private countRunAt(index: number, char: string): number {
    let cursor = index;
    while (this.source[cursor] === char) cursor += 1;
    return cursor - index;
  }

  private findClosingRun(char: string, count: number, from: number): number {
    const delimiter = char.repeat(count);
    let cursor = from;
    while (cursor < this.source.length) {
      const index = this.source.indexOf(delimiter, cursor);
      if (index === -1) return -1;
      if (this.source[index - 1] !== char && this.source[index + count] !== char) return index;
      cursor = index + count;
    }
    return -1;
  }

  private hardBreak(start: number, end: number): HardBreakNode {
    return {
      type: "hardBreak",
      range: this.range(start, end)
    };
  }

  private link(
    start: number,
    end: number,
    destination: string,
    title: string | undefined,
    children: InlineNode[],
    referenceKind: LinkNode["referenceKind"]
  ): LinkNode {
    const node: LinkNode = {
      type: "link",
      destination,
      children,
      referenceKind,
      range: this.range(start, end)
    };
    if (title !== undefined) node.title = title;
    return node;
  }

  private image(
    start: number,
    end: number,
    destination: string,
    title: string | undefined,
    children: InlineNode[],
    referenceKind: LinkNode["referenceKind"]
  ): ImageNode {
    const node: ImageNode = {
      type: "image",
      destination,
      alt: textContent(children),
      children,
      referenceKind,
      range: this.range(start, end)
    };
    if (title !== undefined) node.title = title;
    return node;
  }

  private range(start: number, end: number): SourceRange {
    const base = this.baseRange;
    if (!base) {
      return {
        start: { offset: start, line: 1, column: start + 1 },
        end: { offset: end, line: 1, column: end + 1 }
      };
    }

    return {
      start: {
        offset: base.start.offset + start,
        line: base.start.line,
        column: base.start.column + start
      },
      end: {
        offset: base.start.offset + end,
        line: base.start.line,
        column: base.start.column + end
      }
    };
  }
}

function nextCloserFrom(delimiter: Delimiter | undefined): Delimiter | undefined {
  let current = delimiter;
  while (current && !current.canClose) {
    current = current.next;
  }
  return current;
}
