interface HelpRow {
  flag: string;
  description: string;
}

interface HelpSection {
  title: string;
  rows: readonly HelpRow[];
}

const outputRows: readonly HelpRow[] = [
  { flag: "-o, --output <path>", description: "Write standalone HTML to a file" },
  { flag: "--stdout", description: "Write rendered HTML to stdout" },
  { flag: "--fragment", description: "Render an HTML fragment instead of a full document" },
  { flag: "--format <format>", description: "Output format; only html is implemented" }
];

const htmlRows: readonly HelpRow[] = [
  { flag: "--theme <name|path>", description: "Built-in theme name or theme JSON file" },
  { flag: "--title <title>", description: "Override document title" },
  { flag: "--toc", description: "Force table of contents on" },
  { flag: "--no-toc", description: "Disable table of contents" },
  { flag: "--collapsible-toc", description: "Add native expand/collapse controls to table of contents items" },
  { flag: "--no-collapsible-toc", description: "Disable table of contents expand/collapse controls" },
  { flag: "--sections", description: "Wrap heading-led content in section elements" },
  { flag: "--no-sections", description: "Disable section wrappers" },
  { flag: "--collapsible-sections", description: "Add native expand/collapse controls to sections" },
  { flag: "--no-collapsible-sections", description: "Disable section expand/collapse controls" }
];

const topLevelMarkdownRows: readonly HelpRow[] = [
  { flag: "--gfm", description: "Enable supported GitHub Flavored Markdown extensions" },
  { flag: "--frontmatter", description: "Parse leading YAML-style frontmatter" }
];

const bookMarkdownRows: readonly HelpRow[] = [
  { flag: "--gfm", description: "Supported GFM extensions are enabled for books" },
  { flag: "--frontmatter", description: "Frontmatter parsing is enabled for books" }
];

const bookProjectRows: readonly HelpRow[] = [
  { flag: "--include <pattern>", description: "Include Markdown paths; repeatable" },
  { flag: "--exclude <pattern>", description: "Exclude paths or directories; repeatable" },
  { flag: "--folder-structure", description: "Group book TOC entries by traversed folders" },
  { flag: "--no-folder-structure", description: "Render a flat file list in the book TOC" }
];

export function renderTopLevelHelp(): string {
  return [
    "Usage:",
    "  mdalchemy <input.md> [options]",
    "  mdalchemy book [root] [options]",
    "  mdalchemy theme <command>",
    "  mdalchemy help [book|theme]",
    "",
    "Commands:",
    "      book                Build one HTML documentation book from a Markdown tree",
    "      theme               List and inspect built-in or custom themes",
    "",
    renderHelpSection({ title: "Output", rows: outputRows }),
    renderHelpSection({ title: "Markdown", rows: topLevelMarkdownRows }),
    renderHelpSection({ title: "HTML", rows: htmlRows }),
    renderHelpSection({ title: "Safety and diagnostics", rows: safetyRows(true) })
  ].join("\n");
}

export function renderBookHelp(): string {
  return [
    "Usage:",
    "  mdalchemy book [root] [options]",
    "",
    "Build a single HTML documentation book from a project Markdown tree.",
    "",
    renderHelpSection({ title: "Project", rows: bookProjectRows }),
    renderHelpSection({ title: "Output", rows: outputRows }),
    renderHelpSection({ title: "Markdown", rows: bookMarkdownRows }),
    renderHelpSection({ title: "HTML", rows: htmlRows }),
    renderHelpSection({ title: "Safety and diagnostics", rows: safetyRows(false) })
  ].join("\n");
}

function safetyRows(includeVersion: boolean): readonly HelpRow[] {
  return [
    { flag: "--config <path>", description: "Config file" },
    { flag: "--safe", description: "Escape raw HTML and reject unsafe URLs" },
    { flag: "--strict", description: "Treat warnings as errors" },
    { flag: "--debug", description: "Show extra diagnostics" },
    { flag: "-h, --help", description: "Show help" },
    ...(includeVersion ? [{ flag: "-v, --version", description: "Show version" }] : [])
  ];
}

function renderHelpSection(section: HelpSection): string {
  return `${section.title}:\n${section.rows.map(renderHelpRow).join("\n")}\n`;
}

function renderHelpRow(row: HelpRow): string {
  return `      ${row.flag.padEnd(24)}${row.description}`;
}
