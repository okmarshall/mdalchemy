import type { SourcePosition, SourceRange } from "../markdown/ast.js";

export interface SourceLine {
  index: number;
  startOffset: number;
  endOffset: number;
  text: string;
  lineEnding: "\n" | "\r\n" | "\r" | "";
}

export interface SourceText {
  path?: string | undefined;
  text: string;
  lines: SourceLine[];
}

export function createSourceText(text: string, path?: string): SourceText {
  return {
    path,
    text,
    lines: splitLines(text)
  };
}

export function splitLines(text: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let offset = 0;
  let index = 0;

  while (offset < text.length) {
    const startOffset = offset;
    while (offset < text.length && text[offset] !== "\n" && text[offset] !== "\r") {
      offset += 1;
    }

    const endOffset = offset;
    let lineEnding: SourceLine["lineEnding"] = "";
    if (text[offset] === "\r" && text[offset + 1] === "\n") {
      lineEnding = "\r\n";
      offset += 2;
    } else if (text[offset] === "\r") {
      lineEnding = "\r";
      offset += 1;
    } else if (text[offset] === "\n") {
      lineEnding = "\n";
      offset += 1;
    }

    lines.push({
      index,
      startOffset,
      endOffset,
      text: text.slice(startOffset, endOffset),
      lineEnding
    });
    index += 1;
  }

  if (text.length === 0) {
    lines.push({ index: 0, startOffset: 0, endOffset: 0, text: "", lineEnding: "" });
  }

  return lines;
}

export function positionFromOffset(source: SourceText, offset: number): SourcePosition {
  const clampedOffset = Math.max(0, Math.min(offset, source.text.length));
  let current = source.lines[0];
  for (const line of source.lines) {
    if (line.startOffset <= clampedOffset && clampedOffset <= line.endOffset + line.lineEnding.length) {
      current = line;
      break;
    }
  }

  if (!current) {
    return { offset: clampedOffset, line: 1, column: 1 };
  }

  return {
    offset: clampedOffset,
    line: current.index + 1,
    column: clampedOffset - current.startOffset + 1
  };
}

export function rangeFromOffsets(source: SourceText, start: number, end: number): SourceRange {
  return {
    start: positionFromOffset(source, start),
    end: positionFromOffset(source, end)
  };
}

export function countIndentColumns(text: string): number {
  let columns = 0;
  for (const char of text) {
    if (char === " ") {
      columns += 1;
    } else if (char === "\t") {
      columns += 4 - (columns % 4);
    } else {
      break;
    }
  }
  return columns;
}

export function expandTabs(text: string, startColumn = 0): string {
  let columns = startColumn;
  let expanded = "";

  for (const char of text) {
    if (char === "\t") {
      const width = 4 - (columns % 4);
      expanded += " ".repeat(width);
      columns += width;
      continue;
    }

    expanded += char;
    columns += 1;
  }

  return expanded;
}

export function expandLeadingTabs(text: string): string {
  const leading = /^[ \t]*/.exec(text)?.[0] ?? "";
  if (!leading.includes("\t")) return text;
  return `${expandTabs(leading)}${text.slice(leading.length)}`;
}

export function stripIndentColumns(text: string, columnsToStrip: number): string {
  let columns = 0;
  let index = 0;

  while (index < text.length && columns < columnsToStrip) {
    const char = text[index];
    if (char === " ") {
      columns += 1;
      index += 1;
    } else if (char === "\t") {
      const width = 4 - (columns % 4);
      if (columns + width > columnsToStrip) {
        return `${" ".repeat(columns + width - columnsToStrip)}${text.slice(index + 1)}`;
      }
      columns += width;
      index += 1;
    } else {
      break;
    }
  }

  return text.slice(index);
}

export function isBlankLine(text: string): boolean {
  return /^[ \t]*$/.test(text);
}
