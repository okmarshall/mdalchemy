import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { Diagnostic } from "../core/diagnostics.js";
import {
  defaultConfig,
  type MdalchemyConfig,
  type ResolvedConfig
} from "./config-schema.js";
import { isSupportedMarkdownExtension } from "../markdown/extensions.js";

export interface ConfigLoadOptions {
  cwd?: string | undefined;
  configPath?: string | undefined;
  overrides?: Partial<ResolvedConfig> | undefined;
  safe?: boolean | undefined;
  strict?: boolean | undefined;
}

export interface ConfigLoadResult {
  config: ResolvedConfig;
  diagnostics: Diagnostic[];
  configPath?: string;
}

export async function loadConfig(options: ConfigLoadOptions = {}): Promise<ConfigLoadResult> {
  const cwd = options.cwd ?? process.cwd();
  const diagnostics: Diagnostic[] = [];
  const located = await locateConfig(cwd, options.configPath);
  let fileConfig: Record<string, unknown> = {};

  if (located) {
    try {
      const parsed = JSON.parse(await readFile(located, "utf8")) as unknown;
      if (isRecord(parsed)) {
        fileConfig = parsed;
        diagnostics.push(...validateConfigShape(fileConfig));
      } else {
        diagnostics.push({
          severity: "error",
          code: "MDA_CONFIG_INVALID_ROOT",
          message: "Config file must contain a JSON object."
        });
      }
    } catch (error) {
      diagnostics.push({
        severity: "error",
        code: "MDA_CONFIG_INVALID",
        message: `Could not read or parse config file: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  const config = resolveConfig(fileConfig, {
    overrides: options.overrides,
    safe: options.safe,
    strict: options.strict
  });
  const validation = validateConfig(config);
  diagnostics.push(...validation);

  const result: ConfigLoadResult = { config, diagnostics };
  if (located) result.configPath = located;
  return result;
}

export function resolveConfig(
  config: MdalchemyConfig = {},
  options: Pick<ConfigLoadOptions, "overrides" | "safe" | "strict"> = {}
): ResolvedConfig {
  const fileOutput = isRecord(config.output) ? config.output : {};
  const fileMarkdown = isRecord(config.markdown) ? config.markdown : {};
  const fileHtml = isRecord(config.html) ? config.html : {};
  const fileBook = isRecord(config.book) ? config.book : {};
  const resolved: ResolvedConfig = {
    output: {
      format: stringOr(fileOutput["format"], defaultConfig.output.format) as "html",
      standalone: booleanOr(fileOutput["standalone"], defaultConfig.output.standalone),
      createDirs: booleanOr(fileOutput["createDirs"], defaultConfig.output.createDirs)
    },
    markdown: {
      profile: stringOr(fileMarkdown["profile"], defaultConfig.markdown.profile) as "commonmark",
      extensions: stringArrayOr(fileMarkdown["extensions"], defaultConfig.markdown.extensions)
    },
    html: {
      lang: stringOr(fileHtml["lang"], defaultConfig.html.lang),
      rawHtml: stringOr(fileHtml["rawHtml"], defaultConfig.html.rawHtml) as "allow" | "escape" | "strip",
      safeUrls: booleanOr(fileHtml["safeUrls"], defaultConfig.html.safeUrls),
      headingAnchors: booleanOr(fileHtml["headingAnchors"], defaultConfig.html.headingAnchors),
      sections: booleanOr(fileHtml["sections"], defaultConfig.html.sections),
      collapsibleSections: booleanOr(fileHtml["collapsibleSections"], defaultConfig.html.collapsibleSections),
      tableOfContents: tableOfContentsOr(fileHtml["tableOfContents"], defaultConfig.html.tableOfContents),
      tocDepth: numberOr(fileHtml["tocDepth"], defaultConfig.html.tocDepth),
      softBreak: stringOr(fileHtml["softBreak"], defaultConfig.html.softBreak) as "newline" | "space" | "br",
      fragment: booleanOr(fileHtml["fragment"], defaultConfig.html.fragment),
      title: stringOr(fileHtml["title"], defaultConfig.html.title)
    },
    book: {
      include: stringArrayOr(fileBook["include"], defaultConfig.book.include),
      exclude: fileBook["exclude"] === undefined
        ? defaultConfig.book.exclude
        : uniqueStrings([...defaultConfig.book.exclude, ...stringArrayOr(fileBook["exclude"], [])])
    },
    theme: typeof config.theme === "string" || isRecord(config.theme) ? config.theme : defaultConfig.theme,
    strict: options.strict ?? defaultConfig.strict
  };

  if (options.safe) {
    resolved.html.rawHtml = "escape";
    resolved.html.safeUrls = true;
  }

  if (options.overrides) {
    if (options.overrides.output) resolved.output = { ...resolved.output, ...options.overrides.output };
    if (options.overrides.markdown) {
      const nextMarkdown = { ...resolved.markdown, ...options.overrides.markdown };
      if (options.overrides.markdown.extensions) {
        nextMarkdown.extensions = uniqueStrings([
          ...resolved.markdown.extensions,
          ...options.overrides.markdown.extensions
        ]);
      }
      resolved.markdown = nextMarkdown;
    }
    if (options.overrides.html) resolved.html = { ...resolved.html, ...options.overrides.html };
    if (options.overrides.book) {
      resolved.book = { ...resolved.book, ...options.overrides.book };
    }
    if (options.overrides.theme !== undefined) resolved.theme = options.overrides.theme;
    if (options.overrides.strict !== undefined) resolved.strict = options.overrides.strict;
  }

  if (resolved.html.collapsibleSections) {
    resolved.html.sections = true;
  }

  return resolved;
}

async function locateConfig(cwd: string, explicit?: string): Promise<string | undefined> {
  if (explicit) return path.resolve(cwd, explicit);
  const candidates = ["mdalchemy.config.json", ".mdalchemyrc.json"];
  for (const candidate of candidates) {
    const fullPath = path.resolve(cwd, candidate);
    try {
      await access(fullPath);
      return fullPath;
    } catch {
      // Keep looking.
    }
  }
  return undefined;
}

function validateConfig(config: ResolvedConfig): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (config.output.format !== "html") {
    diagnostics.push({
      severity: "error",
      code: "MDA_CONFIG_UNSUPPORTED_FORMAT",
      message: `Unsupported output format "${config.output.format}".`
    });
  }
  if (!["allow", "escape", "strip"].includes(config.html.rawHtml)) {
    diagnostics.push({
      severity: "error",
      code: "MDA_CONFIG_INVALID_RAW_HTML",
      message: "html.rawHtml must be one of allow, escape, or strip."
    });
  }
  if (!Number.isInteger(config.html.tocDepth) || config.html.tocDepth < 1 || config.html.tocDepth > 6) {
    diagnostics.push({
      severity: "error",
      code: "MDA_CONFIG_INVALID_TOC_DEPTH",
      message: "html.tocDepth must be an integer from 1 to 6."
    });
  }
  if (config.markdown.profile !== "commonmark") {
    diagnostics.push({
      severity: "error",
      code: "MDA_CONFIG_UNSUPPORTED_PROFILE",
      message: `Unsupported markdown profile "${config.markdown.profile}".`
    });
  }
  const unsupportedExtensions = config.markdown.extensions.filter((extension) => !isSupportedMarkdownExtension(extension));
  if (unsupportedExtensions.length > 0) {
    diagnostics.push({
      severity: "error",
      code: "MDA_MARKDOWN_UNSUPPORTED_EXTENSION",
      message: `Unsupported Markdown extension(s): ${unsupportedExtensions.join(", ")}.`
    });
  }
  return diagnostics;
}

const topLevelKeys = new Set(["version", "output", "markdown", "html", "book", "theme"]);
const outputKeys = new Set(["format", "standalone", "createDirs"]);
const markdownKeys = new Set(["profile", "extensions"]);
const bookKeys = new Set(["include", "exclude"]);
const htmlKeys = new Set([
  "lang",
  "rawHtml",
  "safeUrls",
  "headingAnchors",
  "sections",
  "collapsibleSections",
  "tableOfContents",
  "tocDepth",
  "softBreak",
  "fragment",
  "title"
]);

function validateConfigShape(config: Record<string, unknown>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  warnUnknownKeys(config, topLevelKeys, "", diagnostics);

  if (config["version"] !== undefined && typeof config["version"] !== "number") {
    diagnostics.push(invalidType("version", "a number"));
  }

  validateSection(config["output"], "output", outputKeys, diagnostics, {
    format: "string",
    standalone: "boolean",
    createDirs: "boolean"
  });
  validateSection(config["markdown"], "markdown", markdownKeys, diagnostics, {
    profile: "string",
    extensions: "string[]"
  });
  validateSection(config["book"], "book", bookKeys, diagnostics, {
    include: "string[]",
    exclude: "string[]"
  });
  validateSection(config["html"], "html", htmlKeys, diagnostics, {
    lang: "string",
    rawHtml: "string",
    safeUrls: "boolean",
    headingAnchors: "boolean",
    sections: "boolean",
    collapsibleSections: "boolean",
    tableOfContents: "boolean-or-auto",
    tocDepth: "number",
    softBreak: "string",
    fragment: "boolean",
    title: "string"
  });

  if (config["theme"] !== undefined && typeof config["theme"] !== "string" && !isRecord(config["theme"])) {
    diagnostics.push(invalidType("theme", "a built-in theme name, theme path, or theme object"));
  }

  return diagnostics;
}

function validateSection(
  value: unknown,
  pathPrefix: string,
  allowedKeys: Set<string>,
  diagnostics: Diagnostic[],
  fieldTypes: Record<string, "string" | "boolean" | "number" | "string[]" | "boolean-or-auto">
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    diagnostics.push(invalidType(pathPrefix, "an object"));
    return;
  }

  warnUnknownKeys(value, allowedKeys, pathPrefix, diagnostics);
  for (const [key, expected] of Object.entries(fieldTypes)) {
    const fieldValue = value[key];
    if (fieldValue === undefined) continue;
    const fullPath = `${pathPrefix}.${key}`;
    if (!matchesExpectedType(fieldValue, expected)) {
      diagnostics.push(invalidType(fullPath, expectedLabel(expected)));
    }
  }
}

function warnUnknownKeys(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  pathPrefix: string,
  diagnostics: Diagnostic[]
): void {
  for (const key of Object.keys(value)) {
    if (allowedKeys.has(key)) continue;
    diagnostics.push({
      severity: "warning",
      code: "MDA_CONFIG_UNKNOWN_KEY",
      message: `Unknown config key "${pathPrefix ? `${pathPrefix}.` : ""}${key}".`
    });
  }
}

function matchesExpectedType(value: unknown, expected: "string" | "boolean" | "number" | "string[]" | "boolean-or-auto"): boolean {
  switch (expected) {
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number";
    case "string[]":
      return Array.isArray(value) && value.every((item) => typeof item === "string");
    case "boolean-or-auto":
      return typeof value === "boolean" || value === "auto";
  }
}

function expectedLabel(expected: "string" | "boolean" | "number" | "string[]" | "boolean-or-auto"): string {
  switch (expected) {
    case "string":
      return "a string";
    case "boolean":
      return "a boolean";
    case "number":
      return "a number";
    case "string[]":
      return "an array of strings";
    case "boolean-or-auto":
      return "a boolean or \"auto\"";
  }
}

function invalidType(pathName: string, expected: string): Diagnostic {
  return {
    severity: "error",
    code: "MDA_CONFIG_INVALID_TYPE",
    message: `Config key "${pathName}" must be ${expected}.`
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function stringArrayOr(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}

function tableOfContentsOr(value: unknown, fallback: boolean | "auto"): boolean | "auto" {
  return typeof value === "boolean" || value === "auto" ? value : fallback;
}
