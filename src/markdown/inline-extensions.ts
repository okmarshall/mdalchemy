export function isLiteralAutolinkBoundary(source: string, index: number): boolean {
  const previous = source[index - 1] ?? "";
  return !previous || /\s/.test(previous) || previous === "*" || previous === "_" || previous === "~" || previous === "(";
}

export function trimLiteralAutolinkCandidate(candidate: string): string {
  let end = candidate.length;

  while (end > 0 && /[?!.,:*_~]/.test(candidate[end - 1] ?? "")) {
    end -= 1;
  }

  while (end > 0 && candidate[end - 1] === ")" && hasMoreClosingParens(candidate.slice(0, end))) {
    end -= 1;
  }

  if (candidate[end - 1] === ";") {
    const entityLike = /&[A-Za-z0-9]+;$/.exec(candidate.slice(0, end));
    if (entityLike) end -= entityLike[0].length;
  }

  return candidate.slice(0, end);
}

export function trimLiteralEmailAutolinkCandidate(candidate: string): string | undefined {
  if (candidate.endsWith("-") || candidate.endsWith("_")) return undefined;
  return candidate.endsWith(".") ? candidate.slice(0, -1) : candidate;
}

function hasMoreClosingParens(value: string): boolean {
  let balance = 0;
  for (const char of value) {
    if (char === "(") balance += 1;
    if (char === ")") balance -= 1;
  }
  return balance < 0;
}
