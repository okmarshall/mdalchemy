import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { Diagnostic } from "../core/diagnostics.js";
import { defaultConfig, type MdalchemyConfig, type ResolvedConfig } from "./config-schema.js";

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
  let fileConfig: MdalchemyConfig = {};

  if (located) {
    try {
      fileConfig = JSON.parse(await readFile(located, "utf8")) as MdalchemyConfig;
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
  const fileOutput = config.output ?? {};
  const fileMarkdown = config.markdown ?? {};
  const fileHtml = config.html ?? {};
  const resolved: ResolvedConfig = {
    output: {
      format: fileOutput.format ?? defaultConfig.output.format,
      standalone: fileOutput.standalone ?? defaultConfig.output.standalone,
      createDirs: fileOutput.createDirs ?? defaultConfig.output.createDirs
    },
    markdown: {
      profile: fileMarkdown.profile ?? defaultConfig.markdown.profile,
      extensions: fileMarkdown.extensions ?? defaultConfig.markdown.extensions
    },
    html: {
      lang: fileHtml.lang ?? defaultConfig.html.lang,
      rawHtml: fileHtml.rawHtml ?? defaultConfig.html.rawHtml,
      safeUrls: fileHtml.safeUrls ?? defaultConfig.html.safeUrls,
      headingAnchors: fileHtml.headingAnchors ?? defaultConfig.html.headingAnchors,
      sections: fileHtml.sections ?? defaultConfig.html.sections,
      tableOfContents: fileHtml.tableOfContents ?? defaultConfig.html.tableOfContents,
      tocDepth: fileHtml.tocDepth ?? defaultConfig.html.tocDepth,
      softBreak: fileHtml.softBreak ?? defaultConfig.html.softBreak,
      fragment: fileHtml.fragment ?? defaultConfig.html.fragment,
      title: fileHtml.title ?? defaultConfig.html.title
    },
    theme: config.theme ?? defaultConfig.theme,
    strict: options.strict ?? defaultConfig.strict
  };

  if (options.safe) {
    resolved.html.rawHtml = "escape";
    resolved.html.safeUrls = true;
  }

  if (options.overrides) {
    if (options.overrides.output) resolved.output = { ...resolved.output, ...options.overrides.output };
    if (options.overrides.markdown) resolved.markdown = { ...resolved.markdown, ...options.overrides.markdown };
    if (options.overrides.html) resolved.html = { ...resolved.html, ...options.overrides.html };
    if (options.overrides.theme !== undefined) resolved.theme = options.overrides.theme;
    if (options.overrides.strict !== undefined) resolved.strict = options.overrides.strict;
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
  const supportedExtensions = new Set(["gfm-table"]);
  const unsupportedExtensions = config.markdown.extensions.filter((extension) => !supportedExtensions.has(extension));
  if (unsupportedExtensions.length > 0) {
    diagnostics.push({
      severity: "error",
      code: "MDA_MARKDOWN_UNSUPPORTED_EXTENSION",
      message: `Unsupported Markdown extension(s): ${unsupportedExtensions.join(", ")}.`
    });
  }
  return diagnostics;
}
