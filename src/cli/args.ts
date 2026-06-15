import { parseArgs } from "node:util";
import { gfmMarkdownExtensions, type ResolvedConfig } from "../config/config-schema.js";

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
  help: boolean;
  version: boolean;
  debug: boolean;
}

export function parseCliArgs(argv: string[]): CliArgs {
  const parsed = parseArgs({
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
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      debug: { type: "boolean" }
    }
  });

  const format = parsed.values.format;
  if (format !== undefined && format !== "html") {
    throw new Error(`Unsupported format "${format}". Only html is implemented.`);
  }

  const result: CliArgs = {
    input: parsed.positionals[0],
    output: parsed.values.output,
    format: format as "html" | undefined,
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
    help: Boolean(parsed.values.help),
    version: Boolean(parsed.values.version),
    debug: Boolean(parsed.values.debug)
  };
  return result;
}

export function cliOverrides(args: CliArgs): Partial<ResolvedConfig> {
  const html: Partial<ResolvedConfig["html"]> = {};
  if (args.fragment) html.fragment = true;
  if (args.title) html.title = args.title;
  if (args.toc !== undefined) html.tableOfContents = args.toc;
  if (args.sections !== undefined) html.sections = args.sections;

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
  mdalchemy <input> [options]
  mdalchemy theme list
  mdalchemy theme inspect <name-or-path>

Options:
  -o, --output <path>       Output file path
      --format <format>     Output format, currently html
      --theme <name|path>   Built-in theme name or theme file
      --config <path>       Config file
      --stdout              Write to stdout
      --safe                Escape raw HTML and reject unsafe URLs
      --strict              Treat warnings as errors
      --gfm                 Enable supported GitHub Flavored Markdown extensions
      --frontmatter         Parse leading YAML-style frontmatter
      --fragment            Render an HTML fragment
      --title <title>       Override document title
      --toc                 Force table of contents on
      --no-toc              Disable table of contents
      --sections            Wrap heading-led content in section elements
      --no-sections         Disable section wrappers
  -h, --help                Show help
  -v, --version             Show version`;
