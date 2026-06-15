import type { TableAlignment } from "./ast.js";

export interface SplitTableRowOptions {
  requirePipe?: boolean | undefined;
}

export function splitTableRow(text: string, options: SplitTableRowOptions = {}): string[] | undefined {
  const requirePipe = options.requirePipe ?? true;
  const cells: string[] = [];
  let current = "";
  let codeFenceLength = 0;
  let sawPipe = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "\\") {
      if (index + 1 < text.length) {
        const next = text[index + 1];
        current += next === "|" ? "|" : `${char}${next}`;
        index += 1;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "`") {
      const runLength = countCharRun(text, index, "`");
      if (codeFenceLength === 0) {
        codeFenceLength = runLength;
      } else if (runLength === codeFenceLength) {
        codeFenceLength = 0;
      }
      current += "`".repeat(runLength);
      index += runLength - 1;
      continue;
    }

    if (char === "|" && codeFenceLength === 0) {
      sawPipe = true;
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  if (!sawPipe && requirePipe) return undefined;

  if (cells[0] === "") cells.shift();
  if (cells[cells.length - 1] === "") cells.pop();
  return cells;
}

export function parseTableAlignment(value: string): TableAlignment | undefined {
  const trimmed = value.trim();
  if (!/^:?-+:?$/.test(trimmed)) return undefined;
  const left = trimmed.startsWith(":");
  const right = trimmed.endsWith(":");
  if (left && right) return "center";
  if (left) return "left";
  if (right) return "right";
  return null;
}

export function normalizeTableCells(cells: string[], length: number): string[] {
  const normalized = cells.slice(0, length);
  while (normalized.length < length) normalized.push("");
  return normalized;
}

function countCharRun(text: string, start: number, char: string): number {
  let index = start;
  while (text[index] === char) index += 1;
  return index - start;
}
