import path from "node:path";
import { formatDiagnostic } from "../core/diagnostics.js";
import { loadConfig } from "../config/config-loader.js";
import type { ResolvedConfig } from "../config/config-schema.js";
import { inferFormat, writeOutputFile } from "../io/files.js";
import { renderProjectBook } from "../book/book-builder.js";
import { resolveTheme } from "../theme/theme.js";
import { renderBookHelp } from "./help.js";
import {
  bookCliConflicts,
  bookCliOptions,
  bookMarkdownCliExtensions,
  booleanPairValue,
  CliUsageError,
  commonCliConflicts,
  flagValue,
  htmlCliConflicts,
  htmlCliOverridesFromSelections,
  htmlCliSelectionsFromValues,
  parseCliArgValues,
  stringArrayValue,
  stringValue,
  uniqueStrings,
  validateCliConflicts,
  validateHtmlFormat
} from "./options.js";

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
  collapsibleToc: boolean | undefined;
  sections: boolean | undefined;
  collapsibleSections: boolean | undefined;
  folderStructure: boolean | undefined;
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
  const parsed = parseCliArgValues(argv, bookCliOptions);
  const format = stringValue(parsed.values, "format");
  if (!flagValue(parsed.values, "help")) {
    validateHtmlFormat(format);
    if (parsed.positionals.length > 1) {
      throw new CliUsageError(`Unexpected argument "${parsed.positionals[1]}". mdalchemy book accepts one root directory.`);
    }
    validateCliConflicts(parsed.values, commonCliConflicts);
    validateCliConflicts(parsed.values, htmlCliConflicts);
    validateCliConflicts(parsed.values, bookCliConflicts);
  }

  const htmlSelections = htmlCliSelectionsFromValues(parsed.values);
  return {
    root: parsed.positionals[0] ?? ".",
    output: stringValue(parsed.values, "output"),
    format: format as "html" | undefined,
    theme: stringValue(parsed.values, "theme"),
    configPath: stringValue(parsed.values, "config"),
    stdout: flagValue(parsed.values, "stdout"),
    strict: flagValue(parsed.values, "strict"),
    safe: flagValue(parsed.values, "safe"),
    fragment: htmlSelections.fragment,
    gfm: flagValue(parsed.values, "gfm"),
    frontmatter: flagValue(parsed.values, "frontmatter"),
    title: htmlSelections.title,
    toc: htmlSelections.toc,
    collapsibleToc: htmlSelections.collapsibleToc,
    sections: htmlSelections.sections,
    collapsibleSections: htmlSelections.collapsibleSections,
    folderStructure: booleanPairValue(parsed.values, "folder-structure", "no-folder-structure"),
    include: stringArrayValue(parsed.values, "include"),
    exclude: stringArrayValue(parsed.values, "exclude"),
    help: flagValue(parsed.values, "help"),
    debug: flagValue(parsed.values, "debug")
  };
}

function bookCliOverrides(args: BookCliArgs): Partial<ResolvedConfig> {
  const html = htmlCliOverridesFromSelections(args);
  const book: Partial<ResolvedConfig["book"]> = {};
  if (args.folderStructure !== undefined) book.folderStructure = args.folderStructure;

  const extensions = bookMarkdownCliExtensions({
    gfm: args.gfm,
    frontmatter: args.frontmatter
  });

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
  if (Object.keys(book).length > 0) overrides.book = book as ResolvedConfig["book"];
  return overrides;
}

export const bookHelpText = renderBookHelp();
