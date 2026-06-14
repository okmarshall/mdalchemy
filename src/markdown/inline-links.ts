export function findMatchingBracket(source: string, from: number): number {
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

export function readDestination(source: string, from: number): { destination: string; end: number } | undefined {
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
  return value.replace(/\\([\\`*{}\[\]()#+\-.!_>~|])/g, "$1");
}
