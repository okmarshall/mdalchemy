import type { SyntaxClassName, SyntaxDefinition, SyntaxRule } from "./types.js";

const rule = (className: SyntaxClassName, pattern: RegExp): SyntaxRule => ({ className, pattern });

const javascriptRules: readonly SyntaxRule[] = [
  rule("comment", /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y),
  rule("string", /(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)/y),
  rule("number", /\b(?:0x[\dA-Fa-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/y),
  rule("keyword", /\b(?:abstract|as|async|await|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|infer|instanceof|interface|keyof|let|module|namespace|new|null|number|of|package|private|protected|public|readonly|return|satisfies|set|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unknown|var|void|while|with|yield)\b/y),
  rule("builtin", /\b(?:Array|Boolean|Date|Error|JSON|Map|Math|Number|Object|Promise|Record|RegExp|Set|String|Symbol|console|document|process|window)\b/y),
  rule("function", /\b[A-Za-z_$][\w$]*(?=\s*\()/y),
  rule("operator", /(?:=>|===|!==|==|!=|<=|>=|\+\+|--|\|\||&&|\?\?|[+\-*/%=&|!<>?:~^]+)/y),
  rule("punctuation", /[{}[\]().,;]/y)
];

const csharpRules: readonly SyntaxRule[] = [
  rule("comment", /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y),
  rule("string", /(?:"""[\s\S]*?"""|@"(?:[^"]|"")*"|\$@"(?:[^"]|"")*"|@\$"(?:[^"]|"")*"|\$"(?:\\.|[^"\\])*"|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])')/y),
  rule("number", /\b(?:0x[\dA-Fa-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:[uUlLfFdDmM]*)\b/y),
  rule("keyword", /\b(?:abstract|add|alias|and|as|ascending|async|await|base|bool|break|by|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|descending|do|double|dynamic|else|enum|equals|event|explicit|extern|false|file|finally|fixed|float|for|foreach|from|get|global|goto|group|if|implicit|in|init|int|interface|internal|into|is|join|let|lock|long|managed|namespace|new|not|null|object|on|operator|or|orderby|out|override|params|partial|private|protected|public|readonly|record|ref|remove|required|return|sbyte|scoped|sealed|select|set|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unmanaged|unsafe|ushort|using|value|var|virtual|void|volatile|when|where|while|with|yield)\b/y),
  rule("builtin", /\b(?:Action|ArgumentException|Array|CancellationToken|Console|DateTime|Dictionary|Enumerable|Exception|Func|Guid|HashSet|IEnumerable|IList|List|Math|Nullable|Object|String|Task|TimeSpan|Tuple|ValueTask)\b/y),
  rule("attribute", /\[[A-Za-z_][\w.]*[^\]\n]*\]/y),
  rule("function", /\b[A-Za-z_][\w]*(?=\s*\()/y),
  rule("operator", /(?:=>|==|!=|<=|>=|\+\+|--|\?\?|\?\.|&&|\|\||[+\-*/%=&|!<>?:~^]+)/y),
  rule("punctuation", /[{}[\]().,;]/y)
];

const pythonRules: readonly SyntaxRule[] = [
  rule("comment", /#[^\n]*/y),
  rule("string", /(?:[rRuUbBfF]{0,3}(?:'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"))/y),
  rule("attribute", /@[A-Za-z_][\w.]*/y),
  rule("number", /\b(?:0x[\dA-Fa-f]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/y),
  rule("keyword", /\b(?:False|None|True|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/y),
  rule("builtin", /\b(?:bool|bytes|dict|enumerate|filter|float|int|len|list|map|object|open|print|range|set|str|sum|super|tuple|type|zip)\b/y),
  rule("function", /\b[A-Za-z_][\w]*(?=\s*\()/y),
  rule("operator", /(?:->|==|!=|<=|>=|\*\*|\/\/|:=|[+\-*/%=&|!<>:~^]+)/y),
  rule("punctuation", /[{}[\]().,;]/y)
];

const javaRules: readonly SyntaxRule[] = [
  rule("comment", /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y),
  rule("string", /(?:"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])')/y),
  rule("attribute", /@[A-Za-z_][\w.]*/y),
  rule("number", /\b(?:0x[\dA-Fa-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:[lLfFdD])?\b/y),
  rule("keyword", /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|false|final|finally|float|for|if|implements|import|instanceof|int|interface|long|module|native|new|null|open|opens|package|permits|private|protected|provides|public|record|requires|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|true|try|uses|var|void|volatile|while|with|yield)\b/y),
  rule("builtin", /\b(?:ArrayList|BigDecimal|Boolean|Collectors|Double|Exception|HashMap|Integer|List|Long|Map|Math|Object|Optional|Set|Stream|String|StringBuilder|System)\b/y),
  rule("function", /\b[A-Za-z_][\w]*(?=\s*\()/y),
  rule("operator", /(?:->|==|!=|<=|>=|\+\+|--|&&|\|\||[+\-*/%=&|!<>?:~^]+)/y),
  rule("punctuation", /[{}[\]().,;]/y)
];

const goRules: readonly SyntaxRule[] = [
  rule("comment", /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y),
  rule("string", /(?:`[\s\S]*?`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])')/y),
  rule("number", /\b(?:0x[\dA-Fa-f]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/y),
  rule("keyword", /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/y),
  rule("builtin", /\b(?:append|bool|byte|cap|close|complex|complex64|complex128|copy|delete|error|false|float32|float64|imag|int|int8|int16|int32|int64|iota|len|make|new|nil|panic|print|println|real|recover|rune|string|true|uint|uint8|uint16|uint32|uint64|uintptr)\b/y),
  rule("function", /\b[A-Za-z_]\w*(?=\s*\()/y),
  rule("operator", /(?::=|==|!=|<=|>=|\+\+|--|&&|\|\||<-|[+\-*/%=&|!<>:~^]+)/y),
  rule("punctuation", /[{}[\]().,;]/y)
];

const rustRules: readonly SyntaxRule[] = [
  rule("comment", /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y),
  rule("string", /(?:r#+".*?"#+|r".*?"|b?'(?:\\.|[^'\\])'|b?"(?:\\.|[^"\\])*")/y),
  rule("attribute", /#?!?\[[^\]\n]*\]|'[A-Za-z_]\w*/y),
  rule("number", /\b(?:0x[\dA-Fa-f_]+|0b[01_]+|0o[0-7_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:e[+-]?\d[\d_]*)?)(?:u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64)?\b/y),
  rule("keyword", /\b(?:Self|as|async|await|become|box|break|const|continue|crate|dyn|else|enum|extern|false|final|fn|for|if|impl|in|let|loop|macro|match|mod|move|mut|override|priv|pub|ref|return|self|static|struct|super|trait|true|try|type|typeof|unsafe|unsized|use|virtual|where|while|yield)\b/y),
  rule("builtin", /\b(?:Box|Clone|Copy|Debug|Default|Err|None|Ok|Option|Result|Some|String|Vec|bool|char|f32|f64|i8|i16|i32|i64|i128|isize|str|u8|u16|u32|u64|u128|usize)\b/y),
  rule("function", /\b[A-Za-z_]\w*!(?=\s*[({\[])/y),
  rule("function", /\b[A-Za-z_]\w*(?=\s*\()/y),
  rule("operator", /(?:::|->|=>|==|!=|<=|>=|&&|\|\||[+\-*/%=&|!<>?:~^]+)/y),
  rule("punctuation", /[{}[\]().,;]/y)
];

const sqlRules: readonly SyntaxRule[] = [
  rule("comment", /(?:--[^\n]*|\/\*[\s\S]*?\*\/)/y),
  rule("string", /(?:'(?:''|[^'])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\[[^\]\n]+\])/y),
  rule("number", /\b\d+(?:\.\d+)?\b/y),
  rule("keyword", /\b(?:ADD|ALL|ALTER|AND|AS|ASC|BETWEEN|BY|CASE|CHECK|CREATE|CROSS|DELETE|DESC|DISTINCT|DROP|ELSE|END|EXISTS|FALSE|FROM|FULL|GROUP|HAVING|IN|INNER|INSERT|INTO|IS|JOIN|LEFT|LIKE|LIMIT|NOT|NULL|ON|OR|ORDER|OUTER|PRIMARY|RIGHT|SELECT|SET|TABLE|THEN|TRUE|UNION|UPDATE|VALUES|WHEN|WHERE|WITH)\b/iy),
  rule("function", /\b(?:AVG|COALESCE|COUNT|LOWER|MAX|MIN|NOW|SUM|UPPER)\b(?=\s*\()/iy),
  rule("operator", /(?:<>|!=|<=|>=|==|[+\-*/%=&|!<>]+)/y),
  rule("punctuation", /[().,;]/y)
];

const yamlRules: readonly SyntaxRule[] = [
  rule("comment", /#[^\n]*/y),
  rule("string", /(?:'(?:''|[^'])*'|"(?:\\.|[^"\\])*")/y),
  rule("attribute", /[&*][A-Za-z_][\w.-]*/y),
  rule("property", /(?:[A-Za-z0-9_.-]+|"(?:\\.|[^"\\])*"|'(?:''|[^'])*')(?=\s*:)/y),
  rule("keyword", /\b(?:false|null|true|yes|no|on|off)\b/iy),
  rule("number", /-?\b\d+(?:\.\d+)?\b/y),
  rule("operator", /(?:---|\.\.\.|[-?:|>])/y),
  rule("punctuation", /[{}\[\],]/y)
];

const dockerfileRules: readonly SyntaxRule[] = [
  rule("comment", /#[^\n]*/y),
  rule("string", /(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/y),
  rule("keyword", /^(?:ADD|ARG|CMD|COPY|ENTRYPOINT|ENV|EXPOSE|FROM|HEALTHCHECK|LABEL|MAINTAINER|ONBUILD|RUN|SHELL|STOPSIGNAL|USER|VOLUME|WORKDIR)\b/imy),
  rule("property", /\$[A-Za-z_][\w]*|\$\{[^}]+\}/y),
  rule("attribute", /--?[A-Za-z][\w-]*/y),
  rule("number", /\b\d+(?:\.\d+)?\b/y),
  rule("operator", /(?:&&|\|\||[\\|&;<>:=])/y),
  rule("punctuation", /[{}\[\]().,]/y)
];

const powershellRules: readonly SyntaxRule[] = [
  rule("comment", /(?:#[^\n]*|<#[\s\S]*?#>)/y),
  rule("string", /(?:@'[\s\S]*?'@|@"[\s\S]*?"@|'(?:''|[^'])*'|"(?:`.|[^"`])*")/y),
  rule("property", /\$[A-Za-z_][\w:]*|\$\{[^}]+\}/y),
  rule("keyword", /\b(?:begin|break|catch|class|continue|data|do|dynamicparam|else|elseif|end|enum|exit|filter|finally|for|foreach|from|function|if|in|param|process|return|switch|throw|trap|try|until|using|var|while)\b/iy),
  rule("builtin", /\b(?:False|Null|True)\b/y),
  rule("function", /\b[A-Za-z][\w]*-[A-Za-z][\w]*(?=\s|$|\()/y),
  rule("number", /\b\d+(?:\.\d+)?\b/y),
  rule("operator", /(?:-[A-Za-z]+|==|!=|<=|>=|&&|\|\||[+\-*/%=&|!<>?:]+)/y),
  rule("punctuation", /[{}[\]().,;]/y)
];

const diffRules: readonly SyntaxRule[] = [
  rule("keyword", /^(?:diff --git|index |--- |\+\+\+ |@@ ).*$/my),
  rule("string", /^\+(?!\+\+ ).*$/my),
  rule("operator", /^-(?!-- ).*$/my),
  rule("comment", /^\\ No newline at end of file$/my)
];

const jsonRules: readonly SyntaxRule[] = [
  rule("property", /"(?:\\.|[^"\\])*"(?=\s*:)/y),
  rule("string", /"(?:\\.|[^"\\])*"/y),
  rule("number", /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/y),
  rule("keyword", /\b(?:true|false|null)\b/y),
  rule("punctuation", /[{}[\]:,]/y)
];

const htmlRules: readonly SyntaxRule[] = [
  rule("comment", /<!--[\s\S]*?-->/y),
  rule("keyword", /<!doctype[^>]*>/iy),
  rule("tag", /<\/?[A-Za-z][\w:-]*/y),
  rule("attribute", /\s+[A-Za-z_:][\w:.-]*(?=\s*=)/y),
  rule("string", /(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/y),
  rule("punctuation", /[<>/=]/y)
];

const cssRules: readonly SyntaxRule[] = [
  rule("comment", /\/\*[\s\S]*?\*\//y),
  rule("string", /(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/y),
  rule("keyword", /@[A-Za-z-]+/y),
  rule("property", /--?[A-Za-z][\w-]*(?=\s*:)/y),
  rule("number", /(?:#[\dA-Fa-f]{3,8}|\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b)/y),
  rule("function", /\b[A-Za-z-]+(?=\()/y),
  rule("punctuation", /[{}():;,>.*#[\]=+-]/y)
];

const shellRules: readonly SyntaxRule[] = [
  rule("comment", /#[^\n]*/y),
  rule("string", /(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/y),
  rule("keyword", /\b(?:case|do|done|elif|else|esac|export|fi|for|function|if|in|local|then|while)\b/y),
  rule("property", /\$[A-Za-z_][\w]*|\$\{[^}]+\}/y),
  rule("operator", /(?:&&|\|\||[|&;<>])/y),
  rule("attribute", /--?[A-Za-z][\w-]*/y)
];

const markdownRules: readonly SyntaxRule[] = [
  rule("comment", /<!--[\s\S]*?-->/y),
  rule("keyword", /^#{1,6}\s.*$/my),
  rule("string", /`[^`\n]+`/y),
  rule("operator", /(?:[*_~]{1,3}|\[[^\]]+\]\([^)]+\)|^ {0,3}(?:[-+*]|\d+[.)])\s)/my),
  rule("punctuation", /[|[\]()>#*_`~-]/y)
];

export const syntaxDefinitions: readonly SyntaxDefinition[] = [
  { name: "JavaScript and TypeScript", aliases: ["js", "jsx", "mjs", "cjs", "ts", "tsx", "typescript", "javascript"], rules: javascriptRules },
  { name: "C#", aliases: ["cs", "c#", "csharp"], rules: csharpRules },
  { name: "Python", aliases: ["py", "python"], rules: pythonRules },
  { name: "Java", aliases: ["java"], rules: javaRules },
  { name: "Go", aliases: ["go", "golang"], rules: goRules },
  { name: "Rust", aliases: ["rs", "rust"], rules: rustRules },
  { name: "SQL", aliases: ["sql"], rules: sqlRules },
  { name: "YAML", aliases: ["yaml", "yml"], rules: yamlRules },
  { name: "Dockerfile", aliases: ["dockerfile", "docker"], rules: dockerfileRules },
  { name: "PowerShell", aliases: ["powershell", "ps1", "pwsh"], rules: powershellRules },
  { name: "diff", aliases: ["diff", "patch"], rules: diffRules },
  { name: "JSON", aliases: ["json", "jsonc"], rules: jsonRules },
  { name: "HTML/XML/SVG", aliases: ["html", "xml", "svg"], rules: htmlRules },
  { name: "CSS/SCSS", aliases: ["css", "scss"], rules: cssRules },
  { name: "Shell", aliases: ["bash", "sh", "shell", "zsh"], rules: shellRules },
  { name: "Markdown", aliases: ["md", "markdown"], rules: markdownRules }
];
