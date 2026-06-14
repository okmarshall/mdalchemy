export function findMatchingBracket(source: string, from: number): number {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "`") {
      const tickCount = countRunAt(source, index, "`");
      const close = findClosingRun(source, "`", tickCount, index + tickCount);
      if (close !== -1) {
        index = close + tickCount - 1;
        continue;
      }
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

export function readDestination(source: string, from: number): { destination: string; end: number } | undefined {
  if (source[from] === ")") {
    return {
      destination: "",
      end: from
    };
  }

  if (source[from] === "<") {
    const close = source.indexOf(">", from + 1);
    if (close === -1) return undefined;
    const destination = source.slice(from + 1, close);
    if (/[\n\r]/.test(destination) || source[close - 1] === "\\") return undefined;
    return {
      destination: unescapeDestination(destination),
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
    if (/[ \t\r\n]/.test(char) && depth === 0) break;
    index += 1;
  }

  if (index === from) return undefined;
  return {
    destination: unescapeDestination(source.slice(from, index)),
    end: index
  };
}

export function readTitle(source: string, from: number): { title: string; end: number } | undefined {
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

export function skipSpaces(source: string, from: number): number {
  let index = from;
  while (source[index] === " " || source[index] === "\t" || source[index] === "\n") {
    index += 1;
  }
  return index;
}

export function unescapeDestination(value: string): string {
  return decodeCharacterReferences(value.replace(/\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, "$1"));
}
import { decodeCharacterReferences } from "./entities.js";
