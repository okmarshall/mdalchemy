import { escapeText } from "../escape.js";
import type { SyntaxMatch, SyntaxRule } from "./types.js";

export function highlightWithRules(source: string, rules: readonly SyntaxRule[]): string {
  let index = 0;
  let output = "";

  while (index < source.length) {
    const match = matchFirstRule(source, index, rules);
    if (match) {
      output += `<span class="mda-syntax-${match.className}">${escapeText(match.value)}</span>`;
      index += match.value.length;
      continue;
    }

    output += escapeText(source[index] ?? "");
    index += 1;
  }

  return output;
}

function matchFirstRule(
  source: string,
  index: number,
  rules: readonly SyntaxRule[]
): SyntaxMatch | undefined {
  for (const rule of rules) {
    rule.pattern.lastIndex = index;
    const match = rule.pattern.exec(source);
    if (match?.index === index && match[0]) {
      return { className: rule.className, value: match[0] };
    }
  }
  return undefined;
}
