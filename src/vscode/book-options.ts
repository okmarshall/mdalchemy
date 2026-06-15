import path from "node:path";
import type { ResolvedConfig } from "../config/config-schema.js";

export type BookSectionMode = "config" | "none" | "sections" | "collapsible";
export type BookTocMode = "config" | "on" | "off";

export interface BookPromptSelections {
  theme?: string | undefined;
  sectionMode: BookSectionMode;
  tocMode: BookTocMode;
}

export function defaultBookOutputPath(rootPath: string): string {
  return path.join(rootPath, "mdalchemy-book.html");
}

export function normalizeBookOutputPath(rootPath: string, outputPath: string): string {
  const trimmed = outputPath.trim();
  if (!trimmed) throw new Error("Choose an HTML output file for the mdalchemy book.");

  const resolved = path.isAbsolute(trimmed) ? trimmed : path.resolve(rootPath, trimmed);
  const extension = path.extname(resolved).toLocaleLowerCase();
  if (!extension) return `${resolved}.html`;
  if (extension !== ".html" && extension !== ".htm") {
    throw new Error("mdalchemy can only generate .html or .htm book output files.");
  }
  return resolved;
}

export function buildBookConfigOverrides(selections: BookPromptSelections): Partial<ResolvedConfig> {
  const overrides: Partial<ResolvedConfig> = {};
  if (selections.theme) overrides.theme = selections.theme;

  const html: Partial<ResolvedConfig["html"]> = {};
  if (selections.tocMode === "on") html.tableOfContents = true;
  if (selections.tocMode === "off") html.tableOfContents = false;

  if (selections.sectionMode === "none") {
    html.sections = false;
    html.collapsibleSections = false;
  }
  if (selections.sectionMode === "sections") {
    html.sections = true;
    html.collapsibleSections = false;
  }
  if (selections.sectionMode === "collapsible") {
    html.sections = true;
    html.collapsibleSections = true;
  }

  if (Object.keys(html).length > 0) {
    overrides.html = html as ResolvedConfig["html"];
  }
  return overrides;
}
