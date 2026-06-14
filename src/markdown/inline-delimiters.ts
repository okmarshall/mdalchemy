import type { InlineNode } from "./ast.js";

export function normalizeCodeSpan(raw: string): string {
  const flattened = raw.replace(/[\r\n]+/g, " ");
  if (/^ .*\S.* $/.test(flattened)) {
    return flattened.slice(1, -1);
  }
  return flattened;
}

export function canOpenEmphasis(source: string, start: number, length: number, char: "*" | "_"): boolean {
  const before = source[start - 1] ?? "";
  const after = source[start + length] ?? "";
  const leftFlanking = isLeftFlanking(before, after);
  const rightFlanking = isRightFlanking(before, after);
  if (char === "*") return leftFlanking;
  return leftFlanking && (!rightFlanking || isPunctuation(before));
}

export function findClosingDelimiter(source: string, delimiter: string, from: number): number {
  let cursor = from;
  while (cursor < source.length) {
    if (source[cursor] === "`") {
      const tickCount = countRunAt(source, cursor, "`");
      const close = findClosingRun(source, "`", tickCount, cursor + tickCount);
      if (close !== -1) {
        cursor = close + tickCount;
        continue;
      }
    }

    if (!source.startsWith(delimiter, cursor)) {
      cursor += 1;
      continue;
    }

    if (canCloseEmphasis(source, cursor, delimiter.length, delimiter[0] as "*" | "_")) {
      return cursor;
    }
    cursor += 1;
  }
  return -1;
}

function canCloseEmphasis(source: string, start: number, length: number, char: "*" | "_"): boolean {
  const before = source[start - 1] ?? "";
  const after = source[start + length] ?? "";
  const leftFlanking = isLeftFlanking(before, after);
  const rightFlanking = isRightFlanking(before, after);
  if (char === "*") return rightFlanking;
  return rightFlanking && (!leftFlanking || isPunctuation(after));
}

function isLeftFlanking(before: string, after: string): boolean {
  return after !== ""
    && !isWhitespace(after)
    && (!isPunctuation(after) || isWhitespace(before) || isPunctuation(before));
}

function isRightFlanking(before: string, after: string): boolean {
  return before !== ""
    && !isWhitespace(before)
    && (!isPunctuation(before) || isWhitespace(after) || isPunctuation(after));
}

function isWhitespace(value: string): boolean {
  return value === "" || /\s/u.test(value);
}

function isPunctuation(value: string): boolean {
  return value !== "" && /[\p{P}\p{S}]/u.test(value);
}

export function mergeAdjacentText(nodes: InlineNode[]): InlineNode[] {
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

function countRunAt(source: string, index: number, char: string): number {
  let cursor = index;
  while (source[cursor] === char) cursor += 1;
  return cursor - index;
}

function findClosingRun(source: string, char: string, count: number, from: number): number {
  const delimiter = char.repeat(count);
  let cursor = from;
  while (cursor < source.length) {
    const index = source.indexOf(delimiter, cursor);
    if (index === -1) return -1;
    if (source[index - 1] !== char && source[index + count] !== char) return index;
    cursor = index + count;
  }
  return -1;
}
