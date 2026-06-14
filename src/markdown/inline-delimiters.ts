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
  if (!after || /\s/.test(after)) return false;
  if (char === "_" && /\w/.test(before) && /\w/.test(after)) return false;
  return true;
}

export function findClosingDelimiter(source: string, delimiter: string, from: number): number {
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
