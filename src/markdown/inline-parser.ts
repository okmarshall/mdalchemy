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
import { hasMarkdownExtension, type MarkdownExtension } from "./extensions.js";
import { textContent } from "./ast.js";
import { normalizeReferenceLabel } from "./references.js";

const escapable = /[\\`*{}\[\]()#+\-.!_>~|]/;
const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: "\u00a0",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122"
};

export interface InlineParserOptions {
  references?: ReferenceMap;
  baseRange?: SourceRange;
  extensions?: readonly string[] | undefined;
}

export function parseInlines(source: string, options: InlineParserOptions = {}): InlineNode[] {
  const parser = new InlineParser(source, options.references ?? new Map(), options.baseRange, options.extensions ?? []);
  return parser.parse();
}

class InlineParser {
  private index = 0;
  private readonly nodes: InlineNode[] = [];

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
      if (char === "!" && this.source[this.index + 1] === "[" && this.parseLinkOrImage(true)) continue;
      if (char === "[" && this.hasExtension("gfm-footnote") && this.parseFootnoteReference()) continue;
      if (char === "[" && this.parseLinkOrImage(false)) continue;
      if (char === "<" && this.parseAutolinkOrHtml()) continue;
      if (char === "&" && this.parseEntity()) continue;
      if (char === "~" && this.hasExtension("gfm-strikethrough") && this.parseStrikethrough()) continue;
      if ((char === "*" || char === "_") && this.parseEmphasis(char)) continue;
      if (this.hasExtension("gfm-literal-autolink") && this.parseLiteralAutolink()) continue;
      if (char === "\n") {
        this.parseLineBreak();
        continue;
      }

      this.parseText();
    }

    return mergeAdjacentText(this.nodes);
  }

  private parseEscape(): boolean {
    const next = this.source[this.index + 1];
    if (next && escapable.test(next)) {
      const start = this.index;
      this.index += 2;
      this.nodes.push(this.text(next, start, this.index));
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

  private parseLinkOrImage(isImage: boolean): boolean {
    const start = this.index;
    const labelStart = isImage ? start + 2 : start + 1;
    const labelEnd = findMatchingBracket(this.source, labelStart);
    if (labelEnd === -1) return false;

    const labelSource = this.source.slice(labelStart, labelEnd);
    const children = this.parseChildInlines(labelSource, labelStart, labelEnd);
    let cursor = labelEnd + 1;

    const inline = this.parseInlineDestination(cursor);
    if (inline) {
      cursor = inline.end;
      this.index = cursor;
      this.nodes.push(
        isImage
          ? this.image(start, cursor, inline.destination, inline.title, children, "inline")
          : this.link(start, cursor, inline.destination, inline.title, children, "inline")
      );
      return true;
    }

    const reference = this.parseReference(cursor, labelSource);
    if (reference) {
      this.index = reference.end;
      this.nodes.push(
        isImage
          ? this.image(start, reference.end, reference.destination, reference.title, children, reference.kind)
          : this.link(start, reference.end, reference.destination, reference.title, children, reference.kind)
      );
      return true;
    }

    return false;
  }

  private parseInlineDestination(cursor: number):
    | { destination: string; title?: string; end: number }
    | undefined {
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
    const result: { destination: string; title?: string; end: number } = {
      destination: destinationResult.destination,
      end: index + 1
    };
    if (title !== undefined) result.title = title;
    return result;
  }

  private parseReference(cursor: number, labelSource: string):
    | { destination: string; title?: string; kind: LinkNode["referenceKind"]; end: number }
    | undefined {
    if (this.source[cursor] === "[") {
      const end = this.source.indexOf("]", cursor + 1);
      if (end !== -1) {
        const explicit = this.source.slice(cursor + 1, end);
        const normalized = normalizeReferenceLabel(explicit || labelSource);
        const reference = this.references.get(normalized);
        if (reference) {
          const kind = explicit ? "full" : "collapsed";
          const result: { destination: string; title?: string; kind: LinkNode["referenceKind"]; end: number } = {
            destination: reference.destination,
            kind,
            end: end + 1
          };
          if (reference.title !== undefined) result.title = reference.title;
          return result;
        }
      }
    }

    const shortcut = this.references.get(normalizeReferenceLabel(labelSource));
    if (!shortcut) return undefined;
    const result: { destination: string; title?: string; kind: LinkNode["referenceKind"]; end: number } = {
      destination: shortcut.destination,
      kind: "shortcut",
      end: cursor
    };
    if (shortcut.title !== undefined) result.title = shortcut.title;
    return result;
  }

  private parseAutolinkOrHtml(): boolean {
    const start = this.index;
    const close = this.source.indexOf(">", start + 1);
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

    if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(inner)) {
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

    if (isHtmlInline(literal)) {
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
    const match = /^&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z][A-Za-z0-9]+);/.exec(this.source.slice(start));
    if (!match) return false;
    const entity = match[1];
    if (!entity) return false;

    let value: string | undefined;
    if (entity.startsWith("#x")) {
      value = codePointToString(Number.parseInt(entity.slice(2), 16));
    } else if (entity.startsWith("#")) {
      value = codePointToString(Number.parseInt(entity.slice(1), 10));
    } else {
      value = namedEntities[entity];
    }

    if (!value) return false;
    this.index += match[0].length;
    this.nodes.push(this.text(value, start, this.index));
    return true;
  }

  private parseEmphasis(char: "*" | "_"): boolean {
    const start = this.index;
    const runLength = this.countRunAt(start, char);
    const delimiterLength = runLength >= 3 ? 3 : runLength >= 2 ? 2 : 1;
    const delimiter = char.repeat(delimiterLength);

    if (!canOpenEmphasis(this.source, start, delimiterLength, char)) {
      return false;
    }

    const close = findClosingDelimiter(this.source, delimiter, start + delimiterLength);
    if (close === -1) return false;

    const innerSource = this.source.slice(start + delimiterLength, close);
    const children = this.parseChildInlines(innerSource, start + delimiterLength, close);
    this.index = close + delimiterLength;

    if (delimiterLength === 3) {
      const strong: StrongNode = {
        type: "strong",
        children,
        range: this.range(start + 1, this.index - 1)
      };
      const emphasis: EmphasisNode = {
        type: "emphasis",
        children: [strong],
        range: this.range(start, this.index)
      };
      this.nodes.push(emphasis);
      return true;
    }

    if (delimiterLength === 2) {
      const node: StrongNode = {
        type: "strong",
        children,
        range: this.range(start, this.index)
      };
      this.nodes.push(node);
      return true;
    }

    const node: EmphasisNode = {
      type: "emphasis",
      children,
      range: this.range(start, this.index)
    };
    this.nodes.push(node);
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
      const char = this.source[this.index] ?? "";
      if (this.hasExtension("gfm-literal-autolink") && this.literalAutolinkCanParseAt(this.index)) break;
      if ("\\`![<&*_~ \n".includes(char)) {
        if (char === " " || (char !== "\n" && !this.specialCanParseAt(this.index))) {
          this.index += 1;
          continue;
        }
        break;
      }
      this.index += 1;
    }

    if (this.index === start) {
      this.index += 1;
    }

    this.nodes.push(this.text(this.source.slice(start, this.index), start, this.index));
  }

  private specialCanParseAt(index: number): boolean {
    const char = this.source[index];
    if (char === "\\") {
      const next = this.source[index + 1];
      return next === "\n" || Boolean(next && escapable.test(next));
    }
    if (char === "`") return this.findClosingRun("`", this.countRunAt(index, "`"), index + 1) !== -1;
    if (char === "!" && this.source[index + 1] === "[") return true;
    if (char === "[") return true;
    if (char === "<") return this.source.indexOf(">", index + 1) !== -1;
    if (char === "&") return /^&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z][A-Za-z0-9]+);/.test(this.source.slice(index));
    if (char === "*" || char === "_") return true;
    if (char === "~") return this.hasExtension("gfm-strikethrough") && this.source.startsWith("~~", index);
    return false;
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
    return this.source.indexOf(delimiter, from);
  }

  private text(value: string, start: number, end: number): TextNode {
    return {
      type: "text",
      value,
      range: this.range(start, end)
    };
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

function normalizeCodeSpan(raw: string): string {
  const flattened = raw.replace(/[\r\n]+/g, " ");
  if (/^ .*\S.* $/.test(flattened)) {
    return flattened.slice(1, -1);
  }
  return flattened;
}

function findMatchingBracket(source: string, from: number): number {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      if (depth === 0) return index;
      depth -= 1;
    }
  }
  return -1;
}

function readDestination(source: string, from: number): { destination: string; end: number } | undefined {
  if (source[from] === "<") {
    const close = source.indexOf(">", from + 1);
    if (close === -1) return undefined;
    return {
      destination: unescapeDestination(source.slice(from + 1, close)),
      end: close + 1
    };
  }

  let index = from;
  let depth = 0;
  while (index < source.length) {
    const char = source[index];
    if (!char) break;
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      if (depth === 0) break;
      depth -= 1;
    }
    if (/\s/.test(char) && depth === 0) break;
    index += 1;
  }

  if (index === from) return undefined;
  return {
    destination: unescapeDestination(source.slice(from, index)),
    end: index
  };
}

function readTitle(source: string, from: number): { title: string; end: number } | undefined {
  const open = source[from];
  if (open !== "\"" && open !== "'" && open !== "(") return undefined;
  const close = open === "(" ? ")" : open;
  let index = from + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === close) {
      return {
        title: unescapeDestination(source.slice(from + 1, index)),
        end: index + 1
      };
    }
    index += 1;
  }
  return undefined;
}

function skipSpaces(source: string, from: number): number {
  let index = from;
  while (source[index] === " " || source[index] === "\t" || source[index] === "\n") {
    index += 1;
  }
  return index;
}

function isLiteralAutolinkBoundary(source: string, index: number): boolean {
  const previous = source[index - 1] ?? "";
  return !previous || !/[A-Za-z0-9@._~-]/.test(previous);
}

function trimLiteralAutolinkCandidate(candidate: string): string {
  let end = candidate.length;

  while (end > 0 && /[.,;:!?]/.test(candidate[end - 1] ?? "")) {
    end -= 1;
  }

  while (end > 0 && candidate[end - 1] === ")" && hasMoreClosingParens(candidate.slice(0, end))) {
    end -= 1;
  }

  return candidate.slice(0, end);
}

function hasMoreClosingParens(value: string): boolean {
  let balance = 0;
  for (const char of value) {
    if (char === "(") balance += 1;
    if (char === ")") balance -= 1;
  }
  return balance < 0;
}

function unescapeDestination(value: string): string {
  return value.replace(/\\([\\`*{}\[\]()#+\-.!_>~|])/g, "$1");
}

function isHtmlInline(literal: string): boolean {
  return /^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?>$/.test(literal)
    || /^<!--[\s\S]*-->$/.test(literal)
    || /^<![A-Z]+[\s\S]*>$/i.test(literal)
    || /^<\?[\s\S]*\?>$/.test(literal);
}

function codePointToString(codePoint: number): string | undefined {
  if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) {
    return undefined;
  }
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return undefined;
  }
}

function canOpenEmphasis(source: string, start: number, length: number, char: "*" | "_"): boolean {
  const before = source[start - 1] ?? "";
  const after = source[start + length] ?? "";
  if (!after || /\s/.test(after)) return false;
  if (char === "_" && /\w/.test(before) && /\w/.test(after)) return false;
  return true;
}

function findClosingDelimiter(source: string, delimiter: string, from: number): number {
  let cursor = from;
  while (cursor < source.length) {
    const close = source.indexOf(delimiter, cursor);
    if (close === -1) return -1;
    const before = source[close - 1] ?? "";
    const after = source[close + delimiter.length] ?? "";
    if (!/\s/.test(before) && !(delimiter[0] === "_" && /\w/.test(before) && /\w/.test(after))) {
      return close;
    }
    cursor = close + 1;
  }
  return -1;
}

function mergeAdjacentText(nodes: InlineNode[]): InlineNode[] {
  const merged: InlineNode[] = [];
  for (const node of nodes) {
    const previous = merged[merged.length - 1];
    if (previous?.type === "text" && node.type === "text") {
      previous.value += node.value;
      previous.range.end = node.range.end;
    } else {
      merged.push(node);
    }
  }
  return merged;
}
