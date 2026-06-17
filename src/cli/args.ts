import type { ResolvedConfig } from "../config/config-schema.js";
import {
  CliUsageError,
  commonCliConflicts,
  flagValue,
  htmlCliConflicts,
  htmlCliOverridesFromSelections,
  htmlCliSelectionsFromValues,
  markdownCliExtensions,
  parseCliArgValues,
  stringValue,
  topLevelCliOptions,
  validateCliConflicts,
  validateHtmlFormat
} from "./options.js";
import { renderTopLevelHelp } from "./help.js";

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
  collapsibleToc: boolean | undefined;
  sections: boolean | undefined;
  collapsibleSections: boolean | undefined;
  help: boolean;
  version: boolean;
  debug: boolean;
}

export function parseCliArgs(argv: string[]): CliArgs {
  const parsed = parseCliArgValues(argv, topLevelCliOptions);
  const format = stringValue(parsed.values, "format");

  if (!flagValue(parsed.values, "help") && !flagValue(parsed.values, "version")) {
    validateHtmlFormat(format);
    if (parsed.positionals.length > 1) {
      throw new CliUsageError(`Unexpected argument "${parsed.positionals[1]}". mdalchemy accepts one input file.`);
    }
    validateCliConflicts(parsed.values, commonCliConflicts);
    validateCliConflicts(parsed.values, htmlCliConflicts);
  }

  const htmlSelections = htmlCliSelectionsFromValues(parsed.values);
  const result: CliArgs = {
    input: parsed.positionals[0],
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
    help: flagValue(parsed.values, "help"),
    version: flagValue(parsed.values, "version"),
    debug: flagValue(parsed.values, "debug")
  };
  return result;
}

export function cliOverrides(args: CliArgs): Partial<ResolvedConfig> {
  const html = htmlCliOverridesFromSelections(args);

  const overrides: Partial<ResolvedConfig> = {
    strict: args.strict
  };
  if (args.theme) overrides.theme = args.theme;
  if (args.format) overrides.output = { format: args.format, standalone: true, createDirs: false };
  const markdownExtensions = markdownCliExtensions({
    gfm: args.gfm,
    frontmatter: args.frontmatter
  });
  if (markdownExtensions.length > 0) {
    overrides.markdown = { profile: "commonmark", extensions: markdownExtensions };
  }
  if (Object.keys(html).length > 0) overrides.html = html as ResolvedConfig["html"];
  return overrides;
}

export const helpText = renderTopLevelHelp();
