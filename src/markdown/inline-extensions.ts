export function isLiteralAutolinkBoundary(source: string, index: number): boolean {
  const previous = source[index - 1] ?? "";
  return !previous || !/[A-Za-z0-9@._~-]/.test(previous);
}

export function trimLiteralAutolinkCandidate(candidate: string): string {
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
