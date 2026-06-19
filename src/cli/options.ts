import { parseArgs } from "node:util";
import { gfmMarkdownExtensions, type ResolvedConfig } from "../config/config-schema.js";

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export interface CliParseOption {
  type: "boolean" | "string";
  short?: string | undefined;
  multiple?: boolean | undefined;
}

export type CliParseOptions = Record<string, CliParseOption>;

export interface ParsedCliArgs {
  values: Record<string, unknown>;
  positionals: string[];
}

export interface CliConflict {
  left: string;
  right: string;
  message: string;
}

export interface HtmlCliSelections {
  fragment: boolean;
  title: string | undefined;
  toc: boolean | undefined;
  collapsibleToc: boolean | undefined;
  sections: boolean | undefined;
  collapsibleSections: boolean | undefined;
}

export const commonCliOptions = {
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
  "collapsible-toc": { type: "boolean" },
  "no-collapsible-toc": { type: "boolean" },
  sections: { type: "boolean" },
  "no-sections": { type: "boolean" },
  "collapsible-sections": { type: "boolean" },
  "no-collapsible-sections": { type: "boolean" },
  debug: { type: "boolean" }
} as const satisfies CliParseOptions;

export const topLevelCliOptions = {
  ...commonCliOptions,
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" }
} as const satisfies CliParseOptions;

export const bookCliOptions = {
  ...commonCliOptions,
  "folder-structure": { type: "boolean" },
  "no-folder-structure": { type: "boolean" },
  sidebar: { type: "boolean" },
  "no-sidebar": { type: "boolean" },
  search: { type: "boolean" },
  "no-search": { type: "boolean" },
  include: { type: "string", multiple: true },
  exclude: { type: "string", multiple: true },
  help: { type: "boolean", short: "h" }
} as const satisfies CliParseOptions;

export const commonCliConflicts: readonly CliConflict[] = [
  { left: "stdout", right: "output", message: "Use either --stdout or --output, not both." }
];

export const htmlCliConflicts: readonly CliConflict[] = [
  { left: "toc", right: "no-toc", message: "Use either --toc or --no-toc, not both." },
  {
    left: "collapsible-toc",
    right: "no-collapsible-toc",
    message: "Use either --collapsible-toc or --no-collapsible-toc, not both."
  },
  { left: "sections", right: "no-sections", message: "Use either --sections or --no-sections, not both." },
  {
    left: "collapsible-sections",
    right: "no-collapsible-sections",
    message: "Use either --collapsible-sections or --no-collapsible-sections, not both."
  },
  {
    left: "no-sections",
    right: "collapsible-sections",
    message: "Use either --no-sections or --collapsible-sections, not both."
  }
];

export const bookCliConflicts: readonly CliConflict[] = [
  {
    left: "folder-structure",
    right: "no-folder-structure",
    message: "Use either --folder-structure or --no-folder-structure, not both."
  },
  {
    left: "sidebar",
    right: "no-sidebar",
    message: "Use either --sidebar or --no-sidebar, not both."
  },
  {
    left: "search",
    right: "no-search",
    message: "Use either --search or --no-search, not both."
  }
];

export function parseCliArgValues(argv: string[], options: CliParseOptions): ParsedCliArgs {
  try {
    return parseArgs({
      args: argv,
      allowPositionals: true,
      options
    }) as ParsedCliArgs;
  } catch (error) {
    throw new CliUsageError(error instanceof Error ? error.message : String(error));
  }
}

export function validateCliConflicts(values: Record<string, unknown>, conflicts: readonly CliConflict[]): void {
  for (const conflict of conflicts) {
    if (hasCliValue(values, conflict.left) && hasCliValue(values, conflict.right)) {
      throw new CliUsageError(conflict.message);
    }
  }
}

export function validateHtmlFormat(value: string | undefined): void {
  if (value !== undefined && value !== "html") {
    throw new CliUsageError(`Unsupported format "${value}". Only html is implemented.`);
  }
}

export function flagValue(values: Record<string, unknown>, name: string): boolean {
  return values[name] === true;
}

export function stringValue(values: Record<string, unknown>, name: string): string | undefined {
  const value = values[name];
  return typeof value === "string" ? value : undefined;
}

export function stringArrayValue(values: Record<string, unknown>, name: string): string[] {
  const value = values[name];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? [value] : [];
}

export function booleanPairValue(values: Record<string, unknown>, positive: string, negative: string): boolean | undefined {
  if (values[positive] === true) return true;
  if (values[negative] === true) return false;
  return undefined;
}

export function htmlCliSelectionsFromValues(values: Record<string, unknown>): HtmlCliSelections {
  return {
    fragment: flagValue(values, "fragment"),
    title: stringValue(values, "title"),
    toc: booleanPairValue(values, "toc", "no-toc"),
    collapsibleToc: booleanPairValue(values, "collapsible-toc", "no-collapsible-toc"),
    sections: booleanPairValue(values, "sections", "no-sections"),
    collapsibleSections: booleanPairValue(values, "collapsible-sections", "no-collapsible-sections")
  };
}

export function htmlCliOverridesFromSelections(selections: HtmlCliSelections): Partial<ResolvedConfig["html"]> {
  const html: Partial<ResolvedConfig["html"]> = {};
  if (selections.fragment) html.fragment = true;
  if (selections.title) html.title = selections.title;
  if (selections.toc !== undefined) html.tableOfContents = selections.toc;
  if (selections.collapsibleToc !== undefined) html.collapsibleTableOfContents = selections.collapsibleToc;
  if (selections.sections !== undefined) html.sections = selections.sections;
  if (selections.sections === false) html.collapsibleSections = false;
  if (selections.collapsibleSections !== undefined) {
    html.collapsibleSections = selections.collapsibleSections;
    if (selections.collapsibleSections) html.sections = true;
  }
  return html;
}

export function markdownCliExtensions(values: Record<string, unknown>): string[] {
  const extensions: string[] = [];
  if (flagValue(values, "gfm")) extensions.push(...gfmMarkdownExtensions);
  if (flagValue(values, "frontmatter")) extensions.push("frontmatter");
  return uniqueStrings(extensions);
}

export function bookMarkdownCliExtensions(values: Record<string, unknown>): string[] {
  return uniqueStrings([
    ...gfmMarkdownExtensions,
    "frontmatter",
    ...markdownCliExtensions(values)
  ]);
}

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function hasCliValue(values: Record<string, unknown>, name: string): boolean {
  const value = values[name];
  return value === true || typeof value === "string" || Array.isArray(value);
}
