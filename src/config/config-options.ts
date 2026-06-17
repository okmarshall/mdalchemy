import type { ResolvedConfig } from "./config-schema.js";

export type ConfigSectionName = "output" | "markdown" | "html" | "book";
export type ConfigFieldType = "string" | "boolean" | "number" | "string[]" | "boolean-or-auto";
export type ConfigMergeMode = "replace" | "append-default-unique";

export interface ConfigFieldDescriptor {
  key: string;
  type: ConfigFieldType;
  merge?: ConfigMergeMode | undefined;
}

export interface ConfigSectionDescriptor {
  name: ConfigSectionName;
  fields: readonly ConfigFieldDescriptor[];
}

export const configSections = [
  {
    name: "output",
    fields: [
      { key: "format", type: "string" },
      { key: "standalone", type: "boolean" },
      { key: "createDirs", type: "boolean" }
    ]
  },
  {
    name: "markdown",
    fields: [
      { key: "profile", type: "string" },
      { key: "extensions", type: "string[]" }
    ]
  },
  {
    name: "html",
    fields: [
      { key: "lang", type: "string" },
      { key: "rawHtml", type: "string" },
      { key: "safeUrls", type: "boolean" },
      { key: "headingAnchors", type: "boolean" },
      { key: "sections", type: "boolean" },
      { key: "collapsibleSections", type: "boolean" },
      { key: "tableOfContents", type: "boolean-or-auto" },
      { key: "collapsibleTableOfContents", type: "boolean" },
      { key: "tocDepth", type: "number" },
      { key: "softBreak", type: "string" },
      { key: "fragment", type: "boolean" },
      { key: "title", type: "string" }
    ]
  },
  {
    name: "book",
    fields: [
      { key: "include", type: "string[]" },
      { key: "exclude", type: "string[]", merge: "append-default-unique" },
      { key: "folderStructure", type: "boolean" }
    ]
  }
] as const satisfies readonly ConfigSectionDescriptor[];

export const topLevelConfigKeys = new Set<string>([
  "version",
  "theme",
  ...configSections.map((section) => section.name)
]);

export function configSectionKeys(section: ConfigSectionDescriptor): Set<string> {
  return new Set(section.fields.map((field) => field.key));
}

export function configSectionFieldTypes(section: ConfigSectionDescriptor): Record<string, ConfigFieldType> {
  return Object.fromEntries(section.fields.map((field) => [field.key, field.type]));
}

export function configFieldValue(value: unknown, field: ConfigFieldDescriptor, fallback: unknown): unknown {
  if (!matchesConfigFieldType(value, field.type)) return fallback;
  if (field.merge === "append-default-unique" && Array.isArray(fallback) && Array.isArray(value)) {
    return uniqueStrings([...fallback, ...value]);
  }
  return value;
}

export function matchesConfigFieldType(value: unknown, expected: ConfigFieldType): boolean {
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

export function expectedConfigTypeLabel(expected: ConfigFieldType): string {
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

export function resolvedConfigSection<T extends ConfigSectionName>(
  sectionName: T,
  fileSection: Record<string, unknown>,
  defaults: ResolvedConfig[T]
): ResolvedConfig[T] {
  const descriptor = configSections.find((section) => section.name === sectionName);
  if (!descriptor) return defaults;

  const resolved = { ...defaults } as Record<string, unknown>;
  for (const field of descriptor.fields) {
    resolved[field.key] = configFieldValue(fileSection[field.key], field, resolved[field.key]);
  }
  return resolved as ResolvedConfig[T];
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}
