import { parseArgs } from "node:util";
import { gfmMarkdownExtensions, type ResolvedConfig } from "../config/config-schema.js";

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export interface CliArgs {
  input: string | undefined;
  output: string | undefined;
  format: "html" | undefined;
  theme: string | undefined;
  configPath: string | undefined;
  stdout: boolean;
  strict: boolean;
  safe: boolean;
  fragment: boolean;
  gfm: boolean;
  frontmatter: boolean;
  title: string | undefined;
  toc: boolean | undefined;
  sections: boolean | undefined;
  collapsibleSections: boolean | undefined;
  help: boolean;
  version: boolean;
  debug: boolean;
}

export function parseCliArgs(argv: string[]): CliArgs {
  const parsed = parseCliArgValues(argv);

  if (!parsed.values.help && !parsed.values.version) {
    const format = parsed.values.format;
    if (format !== undefined && format !== "html") {
      throw new CliUsageError(`Unsupported format "${format}". Only html is implemented.`);
    }
    if (parsed.positionals.length > 1) {
      throw new CliUsageError(`Unexpected argument "${parsed.positionals[1]}". mdalchemy accepts one input file.`);
    }
    if (parsed.values.stdout && parsed.values.output) {
      throw new CliUsageError("Use either --stdout or --output, not both.");
    }
    if (parsed.values.toc && parsed.values["no-toc"]) {
      throw new CliUsageError("Use either --toc or --no-toc, not both.");
    }
    if (parsed.values.sections && parsed.values["no-sections"]) {
      throw new CliUsageError("Use either --sections or --no-sections, not both.");
    }
    if (parsed.values["collapsible-sections"] && parsed.values["no-collapsible-sections"]) {
      throw new CliUsageError("Use either --collapsible-sections or --no-collapsible-sections, not both.");
    }
    if (parsed.values["no-sections"] && parsed.values["collapsible-sections"]) {
      throw new CliUsageError("Use either --no-sections or --collapsible-sections, not both.");
    }
  }

  const result: CliArgs = {
    input: parsed.positionals[0],
    output: parsed.values.output,
    format: parsed.values.format as "html" | undefined,
    theme: parsed.values.theme,
    configPath: parsed.values.config,
    stdout: Boolean(parsed.values.stdout),
    strict: Boolean(parsed.values.strict),
    safe: Boolean(parsed.values.safe),
    fragment: Boolean(parsed.values.fragment),
    gfm: Boolean(parsed.values.gfm),
    frontmatter: Boolean(parsed.values.frontmatter),
    title: parsed.values.title,
    toc: parsed.values.toc === true ? true : parsed.values["no-toc"] === true ? false : undefined,
    sections: parsed.values.sections === true ? true : parsed.values["no-sections"] === true ? false : undefined,
    collapsibleSections: parsed.values["collapsible-sections"] === true
      ? true
      : parsed.values["no-collapsible-sections"] === true
        ? false
        : undefined,
    help: Boolean(parsed.values.help),
    version: Boolean(parsed.values.version),
    debug: Boolean(parsed.values.debug)
  };
  return result;
}

function parseCliArgValues(argv: string[]) {
  try {
    return parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        output: { type: "string", short: "o" },
        format: { type: "string" },
        theme: { type: "string" },
        config: { type: "string" },
        stdout: { type: "boolean" },
        strict: { type: "boolean" },
        safe: { type: "boolean" },
        fragment: { type: "boolean" },
        gfm: { type: "boolean" },
        frontmatter: { type: "boolean" },
        title: { type: "string" },
        toc: { type: "boolean" },
        "no-toc": { type: "boolean" },
        sections: { type: "boolean" },
        "no-sections": { type: "boolean" },
        "collapsible-sections": { type: "boolean" },
        "no-collapsible-sections": { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
        debug: { type: "boolean" }
      }
    });
  } catch (error) {
    throw new CliUsageError(error instanceof Error ? error.message : String(error));
  }
}

export function cliOverrides(args: CliArgs): Partial<ResolvedConfig> {
  const html: Partial<ResolvedConfig["html"]> = {};
  if (args.fragment) html.fragment = true;
  if (args.title) html.title = args.title;
  if (args.toc !== undefined) html.tableOfContents = args.toc;
  if (args.sections !== undefined) html.sections = args.sections;
  if (args.sections === false) html.collapsibleSections = false;
  if (args.collapsibleSections !== undefined) {
    html.collapsibleSections = args.collapsibleSections;
    if (args.collapsibleSections) html.sections = true;
  }

  const overrides: Partial<ResolvedConfig> = {
    strict: args.strict
  };
  if (args.theme) overrides.theme = args.theme;
  if (args.format) overrides.output = { format: args.format, standalone: true, createDirs: false };
  const markdownExtensions: string[] = [];
  if (args.gfm) markdownExtensions.push(...gfmMarkdownExtensions);
  if (args.frontmatter) markdownExtensions.push("frontmatter");
  if (markdownExtensions.length > 0) {
    overrides.markdown = { profile: "commonmark", extensions: [...new Set(markdownExtensions)] };
  }
  if (Object.keys(html).length > 0) overrides.html = html as ResolvedConfig["html"];
  return overrides;
}

export const helpText = `Usage:
  mdalchemy <input.md> [options]
  mdalchemy theme <command>
  mdalchemy help [theme]

Output:
  -o, --output <path>       Write standalone HTML to a file
      --stdout              Write rendered HTML to stdout
      --fragment            Render an HTML fragment instead of a full document
      --format <format>     Output format; only html is implemented

Markdown:
      --gfm                 Enable supported GitHub Flavored Markdown extensions
      --frontmatter         Parse leading YAML-style frontmatter

HTML:
      --theme <name|path>   Built-in theme name or theme JSON file
      --title <title>       Override document title
      --toc                 Force table of contents on
      --no-toc              Disable table of contents
      --sections            Wrap heading-led content in section elements
      --no-sections         Disable section wrappers
      --collapsible-sections
                            Add native expand/collapse controls to sections
      --no-collapsible-sections
                            Disable section expand/collapse controls

Safety and diagnostics:
      --config <path>       Config file
      --safe                Escape raw HTML and reject unsafe URLs
      --strict              Treat warnings as errors
      --debug               Show extra diagnostics
  -h, --help                Show help
  -v, --version             Show version`;
