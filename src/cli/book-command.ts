import path from "node:path";
import { parseArgs } from "node:util";
import { formatDiagnostic } from "../core/diagnostics.js";
import { loadConfig } from "../config/config-loader.js";
import { gfmMarkdownExtensions, type ResolvedConfig } from "../config/config-schema.js";
import { inferFormat, writeOutputFile } from "../io/files.js";
import { renderProjectBook } from "../book/book-builder.js";
import { resolveTheme } from "../theme/theme.js";
import { CliUsageError } from "./args.js";

interface BookCliArgs {
  root: string;
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
  include: string[];
  exclude: string[];
  help: boolean;
  debug: boolean;
}

export async function handleBookCommand(argv: string[]): Promise<number> {
  let args: BookCliArgs;
  try {
    args = parseBookCliArgs(argv);
  } catch (error) {
    if (error instanceof CliUsageError) {
      console.error(`mdalchemy: ${error.message}\n`);
      console.error(bookHelpText);
      return 2;
    }
    throw error;
  }

  if (args.help) {
    console.log(bookHelpText);
    return 0;
  }

  const rootPath = path.resolve(process.cwd(), args.root);
  const outputPath = args.stdout
    ? undefined
    : path.resolve(process.cwd(), args.output ?? path.join(rootPath, "mdalchemy-book.html"));

  try {
    inferFormat(outputPath);
  } catch (error) {
    console.error(`mdalchemy: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }

  const configResult = await loadConfig({
    cwd: process.cwd(),
    configPath: args.configPath,
    overrides: bookCliOverrides(args),
    safe: args.safe,
    strict: args.strict
  });

  if (args.include.length > 0) {
    configResult.config.book.include = args.include;
  }
  if (args.exclude.length > 0) {
    configResult.config.book.exclude = uniqueStrings([...configResult.config.book.exclude, ...args.exclude]);
  }

  const configErrors = configResult.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (configErrors.length > 0) {
    for (const diagnostic of configResult.diagnostics) {
      console.error(formatDiagnostic(diagnostic, configResult.configPath));
    }
    return 4;
  }

  const theme = await resolveTheme(configResult.config.theme, process.cwd());
  const themeErrors = theme.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (themeErrors.length > 0) {
    for (const diagnostic of theme.diagnostics) {
      if (diagnostic.severity === "error" || diagnostic.severity === "warning" || args.debug) {
        console.error(formatDiagnostic(diagnostic, rootPath));
      }
    }
    return 5;
  }

  let rendered;
  try {
    rendered = await renderProjectBook({
      rootPath,
      outputPath,
      config: configResult.config,
      theme,
      cwd: process.cwd()
    });
  } catch (error) {
    console.error(`mdalchemy: ${error instanceof Error ? error.message : String(error)}`);
    return 3;
  }

  const diagnostics = [...configResult.diagnostics, ...rendered.diagnostics];
  const effectiveErrors = configResult.config.strict
    ? diagnostics.filter((diagnostic) => diagnostic.severity === "error" || diagnostic.severity === "warning")
    : diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  for (const diagnostic of diagnostics) {
    const formatted = formatDiagnostic(diagnostic, rootPath);
    if (diagnostic.severity === "error" || diagnostic.severity === "warning") {
      console.error(formatted);
    } else if (args.debug) {
      console.error(formatted);
    }
  }

  if (effectiveErrors.length > 0) {
    return 6;
  }

  if (args.stdout) {
    process.stdout.write(rendered.content);
  } else if (outputPath) {
    try {
      await writeOutputFile(outputPath, rendered.content, configResult.config.output.createDirs);
    } catch (error) {
      console.error(`mdalchemy: ${error instanceof Error ? error.message : String(error)}`);
      return 7;
    }
    console.error(`mdalchemy: wrote ${path.relative(process.cwd(), outputPath) || outputPath} (${rendered.files.length} files)`);
  }

  return 0;
}

function parseBookCliArgs(argv: string[]): BookCliArgs {
  const parsed = parseBookArgValues(argv);
  if (!parsed.values.help) {
    const format = parsed.values.format;
    if (format !== undefined && format !== "html") {
      throw new CliUsageError(`Unsupported format "${format}". Only html is implemented.`);
    }
    if (parsed.positionals.length > 1) {
      throw new CliUsageError(`Unexpected argument "${parsed.positionals[1]}". mdalchemy book accepts one root directory.`);
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

  return {
    root: parsed.positionals[0] ?? ".",
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
    include: stringArray(parsed.values.include),
    exclude: stringArray(parsed.values.exclude),
    help: Boolean(parsed.values.help),
    debug: Boolean(parsed.values.debug)
  };
}

function parseBookArgValues(argv: string[]) {
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
        include: { type: "string", multiple: true },
        exclude: { type: "string", multiple: true },
        help: { type: "boolean", short: "h" },
        debug: { type: "boolean" }
      }
    });
  } catch (error) {
    throw new CliUsageError(error instanceof Error ? error.message : String(error));
  }
}

function bookCliOverrides(args: BookCliArgs): Partial<ResolvedConfig> {
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

  const extensions = uniqueStrings([
    ...gfmMarkdownExtensions,
    "frontmatter",
    ...(args.gfm ? gfmMarkdownExtensions : []),
    ...(args.frontmatter ? ["frontmatter"] : [])
  ]);

  const overrides: Partial<ResolvedConfig> = {
    strict: args.strict,
    markdown: {
      profile: "commonmark",
      extensions
    }
  };

  if (args.theme) overrides.theme = args.theme;
  if (args.format) overrides.output = { format: args.format, standalone: true, createDirs: false };
  if (Object.keys(html).length > 0) overrides.html = html as ResolvedConfig["html"];
  return overrides;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? [value] : [];
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export const bookHelpText = `Usage:
  mdalchemy book [root] [options]

Build a single HTML documentation book from a project Markdown tree.

Project:
      --include <pattern>  Include Markdown paths; repeatable
      --exclude <pattern>  Exclude paths or directories; repeatable

Output:
  -o, --output <path>      Write standalone HTML to a file
      --stdout             Write rendered HTML to stdout
      --fragment           Render an HTML fragment instead of a full document
      --format <format>    Output format; only html is implemented

Markdown:
      --gfm                Supported GFM extensions are enabled for books
      --frontmatter        Frontmatter parsing is enabled for books

HTML:
      --theme <name|path>  Built-in theme name or theme JSON file
      --title <title>      Override book title
      --toc                Force table of contents on
      --no-toc             Disable table of contents
      --sections           Wrap heading-led content in section elements
      --no-sections        Disable section wrappers
      --collapsible-sections
                           Add native expand/collapse controls to sections
      --no-collapsible-sections
                           Disable section expand/collapse controls

Safety and diagnostics:
      --config <path>      Config file
      --safe               Escape raw HTML and reject unsafe URLs
      --strict             Treat warnings as errors
      --debug              Show extra diagnostics
  -h, --help               Show help`;
