import { escapeText } from "./escape.js";

interface SyntaxRule {
  className: string;
  pattern: RegExp;
}

const javascriptRules: SyntaxRule[] = [
  { className: "comment", pattern: /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y },
  { className: "string", pattern: /(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)/y },
  { className: "number", pattern: /\b(?:0x[\dA-Fa-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/y },
  { className: "keyword", pattern: /\b(?:abstract|as|async|await|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|infer|instanceof|interface|keyof|let|module|namespace|new|null|number|of|package|private|protected|public|readonly|return|satisfies|set|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unknown|var|void|while|with|yield)\b/y },
  { className: "builtin", pattern: /\b(?:Array|Boolean|Date|Error|JSON|Map|Math|Number|Object|Promise|Record|RegExp|Set|String|Symbol|console|document|process|window)\b/y },
  { className: "function", pattern: /\b[A-Za-z_$][\w$]*(?=\s*\()/y },
  { className: "operator", pattern: /(?:=>|===|!==|==|!=|<=|>=|\+\+|--|\|\||&&|\?\?|[+\-*/%=&|!<>?:~^]+)/y },
  { className: "punctuation", pattern: /[{}[\]().,;]/y }
];

const csharpRules: SyntaxRule[] = [
  { className: "comment", pattern: /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y },
  { className: "string", pattern: /(?:"""[\s\S]*?"""|@"(?:[^"]|"")*"|\$@"(?:[^"]|"")*"|@\$"(?:[^"]|"")*"|\$"(?:\\.|[^"\\])*"|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])')/y },
  { className: "number", pattern: /\b(?:0x[\dA-Fa-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:[uUlLfFdDmM]*)\b/y },
  { className: "keyword", pattern: /\b(?:abstract|add|alias|and|as|ascending|async|await|base|bool|break|by|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|descending|do|double|dynamic|else|enum|equals|event|explicit|extern|false|file|finally|fixed|float|for|foreach|from|get|global|goto|group|if|implicit|in|init|int|interface|internal|into|is|join|let|lock|long|managed|namespace|new|not|null|object|on|operator|or|orderby|out|override|params|partial|private|protected|public|readonly|record|ref|remove|required|return|sbyte|scoped|sealed|select|set|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unmanaged|unsafe|ushort|using|value|var|virtual|void|volatile|when|where|while|with|yield)\b/y },
  { className: "builtin", pattern: /\b(?:Action|ArgumentException|Array|Console|DateTime|Dictionary|Enumerable|Exception|Func|Guid|HashSet|IEnumerable|IList|List|Math|Nullable|Object|String|Task|TimeSpan|Tuple|ValueTask)\b/y },
  { className: "attribute", pattern: /\[[A-Za-z_][\w.]*\]/y },
  { className: "function", pattern: /\b[A-Za-z_][\w]*(?=\s*\()/y },
  { className: "operator", pattern: /(?:=>|==|!=|<=|>=|\+\+|--|\?\?|\?\.|&&|\|\||[+\-*/%=&|!<>?:~^]+)/y },
  { className: "punctuation", pattern: /[{}[\]().,;]/y }
];

const jsonRules: SyntaxRule[] = [
  { className: "property", pattern: /"(?:\\.|[^"\\])*"(?=\s*:)/y },
  { className: "string", pattern: /"(?:\\.|[^"\\])*"/y },
  { className: "number", pattern: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/y },
  { className: "keyword", pattern: /\b(?:true|false|null)\b/y },
  { className: "punctuation", pattern: /[{}[\]:,]/y }
];

const htmlRules: SyntaxRule[] = [
  { className: "comment", pattern: /<!--[\s\S]*?-->/y },
  { className: "keyword", pattern: /<!doctype[^>]*>/iy },
  { className: "tag", pattern: /<\/?[A-Za-z][\w:-]*/y },
  { className: "attribute", pattern: /\s+[A-Za-z_:][\w:.-]*(?=\s*=)/y },
  { className: "string", pattern: /(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/y },
  { className: "punctuation", pattern: /[<>/=]/y }
];

const cssRules: SyntaxRule[] = [
  { className: "comment", pattern: /\/\*[\s\S]*?\*\//y },
  { className: "string", pattern: /(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/y },
  { className: "keyword", pattern: /@[A-Za-z-]+/y },
  { className: "property", pattern: /--?[A-Za-z][\w-]*(?=\s*:)/y },
  { className: "number", pattern: /(?:#[\dA-Fa-f]{3,8}|\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b)/y },
  { className: "function", pattern: /\b[A-Za-z-]+(?=\()/y },
  { className: "punctuation", pattern: /[{}():;,>.*#[\]=+-]/y }
];

const shellRules: SyntaxRule[] = [
  { className: "comment", pattern: /#[^\n]*/y },
  { className: "string", pattern: /(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/y },
  { className: "keyword", pattern: /\b(?:case|do|done|elif|else|esac|export|fi|for|function|if|in|local|then|while)\b/y },
  { className: "property", pattern: /\$[A-Za-z_][\w]*|\$\{[^}]+\}/y },
  { className: "operator", pattern: /(?:&&|\|\||[|&;<>])/y },
  { className: "attribute", pattern: /--?[A-Za-z][\w-]*/y }
];

const markdownRules: SyntaxRule[] = [
  { className: "comment", pattern: /<!--[\s\S]*?-->/y },
  { className: "keyword", pattern: /^#{1,6}\s.*$/my },
  { className: "string", pattern: /`[^`\n]+`/y },
  { className: "operator", pattern: /(?:[*_~]{1,3}|\[[^\]]+\]\([^)]+\)|^ {0,3}(?:[-+*]|\d+[.)])\s)/my },
  { className: "punctuation", pattern: /[|[\]()>#*_`~-]/y }
];

export function highlightCode(source: string, language: string | undefined): string {
  const rules = rulesForLanguage(language);
  if (!rules) return escapeText(source);
  return highlightWithRules(source, rules);
}

function rulesForLanguage(language: string | undefined): SyntaxRule[] | undefined {
  const normalized = language?.toLocaleLowerCase();
  switch (normalized) {
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
    case "ts":
    case "tsx":
    case "typescript":
    case "javascript":
      return javascriptRules;
    case "cs":
    case "c#":
    case "csharp":
      return csharpRules;
    case "json":
    case "jsonc":
      return jsonRules;
    case "html":
    case "xml":
    case "svg":
      return htmlRules;
    case "css":
    case "scss":
      return cssRules;
    case "bash":
    case "sh":
    case "shell":
    case "zsh":
      return shellRules;
    case "md":
    case "markdown":
      return markdownRules;
    default:
      return undefined;
  }
}

function highlightWithRules(source: string, rules: SyntaxRule[]): string {
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
  rules: SyntaxRule[]
): { className: string; value: string } | undefined {
  for (const rule of rules) {
    rule.pattern.lastIndex = index;
    const match = rule.pattern.exec(source);
    if (match?.index === index && match[0]) {
      return { className: rule.className, value: match[0] };
    }
  }
  return undefined;
}
