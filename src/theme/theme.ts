import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Diagnostic } from "../core/diagnostics.js";

export type ThemeTokens = Record<string, string | number | boolean>;

export interface ThemeDefinition {
  name: string;
  extends?: string | undefined;
  tokens: ThemeTokens;
}

export interface ResolvedTheme {
  name: string;
  tokens: Record<string, string>;
  css: string;
  diagnostics: Diagnostic[];
}

const baseTokens: Record<string, string> = {
  "color.background": "#ffffff",
  "color.surface": "#f6f8fa",
  "color.text": "#1f2328",
  "color.muted": "#656d76",
  "color.accent": "#0969da",
  "color.accentText": "#ffffff",
  "color.border": "#d0d7de",
  "color.codeBackground": "#f6f8fa",
  "color.codeText": "#24292f",
  "font.body": "ui-serif, Georgia, Cambria, Times New Roman, serif",
  "font.heading": "ui-serif, Georgia, Cambria, Times New Roman, serif",
  "font.mono": "ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace",
  "font.size.base": "18px",
  "font.size.small": "0.9rem",
  "font.size.code": "0.92em",
  "lineHeight.body": "1.68",
  "lineHeight.heading": "1.2",
  "layout.maxWidth": "780px",
  "layout.pagePadding": "clamp(24px, 5vw, 64px)",
  "layout.radius": "8px",
  "layout.borderWidth": "1px",
  "space.block": "1.2rem",
  "space.paragraph": "1rem",
  "space.headingBefore": "2rem",
  "space.headingAfter": "0.75rem",
  "space.list": "0.4rem",
  "space.code": "1rem"
};

export const builtInThemes: Record<string, ThemeDefinition> = {
  serif: {
    name: "serif",
    tokens: {
      ...baseTokens,
      "color.background": "#fffdf9",
      "color.surface": "#f7f1e8",
      "color.text": "#211c18",
      "color.muted": "#6f655c",
      "color.accent": "#7a3f18",
      "color.border": "#ded2c4"
    }
  },
  sans: {
    name: "sans",
    tokens: {
      ...baseTokens,
      "font.body": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.heading": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.size.base": "17px",
      "color.background": "#ffffff",
      "color.surface": "#f3f5f7",
      "color.accent": "#005f73"
    }
  },
  technical: {
    name: "technical",
    tokens: {
      ...baseTokens,
      "font.body": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.heading": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.size.base": "16px",
      "layout.maxWidth": "920px",
      "color.background": "#fbfcfd",
      "color.surface": "#eef3f8",
      "color.text": "#18212b",
      "color.muted": "#586674",
      "color.accent": "#0f6b6e",
      "color.border": "#c9d6e2",
      "color.codeBackground": "#101820",
      "color.codeText": "#e7edf3"
    }
  }
};

export async function resolveTheme(input: string | Record<string, unknown>, cwd = process.cwd()): Promise<ResolvedTheme> {
  const diagnostics: Diagnostic[] = [];
  let definition: ThemeDefinition | undefined;

  if (typeof input === "string") {
    definition = builtInThemes[input];
    if (!definition) {
      const themePath = path.resolve(cwd, input);
      try {
        definition = parseThemeDefinition(JSON.parse(await readFile(themePath, "utf8")) as Record<string, unknown>);
      } catch (error) {
        diagnostics.push({
          severity: "error",
          code: "MDA_THEME_LOAD_FAILED",
          message: `Could not load theme "${input}": ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
  } else {
    definition = parseThemeDefinition(input);
  }

  definition ??= builtInThemes.serif!;

  const resolvedTokens = resolveThemeTokens(definition, diagnostics, new Set());
  diagnostics.push(...validateThemeTokens(resolvedTokens));

  return {
    name: definition.name,
    tokens: resolvedTokens,
    css: themeToCss(resolvedTokens),
    diagnostics
  };
}

function parseThemeDefinition(raw: Record<string, unknown>): ThemeDefinition {
  const name = typeof raw.name === "string" ? raw.name : "custom";
  const extendsName = typeof raw.extends === "string" ? raw.extends : undefined;
  const rawTokens = isRecord(raw.tokens) ? raw.tokens : {};
  const tokens: ThemeTokens = {};
  for (const [key, value] of Object.entries(rawTokens)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      tokens[key] = value;
    }
  }
  const definition: ThemeDefinition = { name, tokens };
  if (extendsName) definition.extends = extendsName;
  return definition;
}

function resolveThemeTokens(
  definition: ThemeDefinition,
  diagnostics: Diagnostic[],
  seen: Set<string>
): Record<string, string> {
  if (seen.has(definition.name)) {
    diagnostics.push({
      severity: "error",
      code: "MDA_THEME_EXTENDS_CYCLE",
      message: `Theme "${definition.name}" is part of an extends cycle.`
    });
    return { ...baseTokens };
  }

  seen.add(definition.name);
  let parentTokens = { ...baseTokens };
  if (definition.extends) {
    const parent = builtInThemes[definition.extends];
    if (parent) {
      parentTokens = resolveThemeTokens(parent, diagnostics, seen);
    } else {
      diagnostics.push({
        severity: "error",
        code: "MDA_THEME_UNKNOWN_PARENT",
        message: `Theme "${definition.name}" extends unknown theme "${definition.extends}".`
      });
    }
  }

  const tokens = { ...parentTokens };
  for (const [key, value] of Object.entries(definition.tokens)) {
    tokens[key] = String(value);
  }
  return tokens;
}

function validateThemeTokens(tokens: Record<string, string>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const key of Object.keys(tokens)) {
    if (!(key in baseTokens)) {
      diagnostics.push({
        severity: "warning",
        code: "MDA_THEME_UNKNOWN_TOKEN",
        message: `Theme token "${key}" is not used by the built-in HTML renderer.`
      });
    }
  }
  return diagnostics;
}

function themeToCss(tokens: Record<string, string>): string {
  const vars = Object.entries(tokens)
    .filter(([key]) => key in baseTokens)
    .map(([key, value]) => `  --mda-${key.replaceAll(".", "-")}: ${sanitizeCssValue(value)};`)
    .join("\n");

  return `:root {
${vars}
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--mda-color-background);
  color: var(--mda-color-text);
  font-family: var(--mda-font-body);
  font-size: var(--mda-font-size-base);
  line-height: var(--mda-lineHeight-body);
}

.mda-document {
  width: min(100%, var(--mda-layout-maxWidth));
  margin: 0 auto;
  padding: var(--mda-layout-pagePadding);
}

.mda-content {
  max-width: 100%;
}

.mda-content > * + * {
  margin-top: var(--mda-space-block);
}

h1,
h2,
h3,
h4,
h5,
h6 {
  color: var(--mda-color-text);
  font-family: var(--mda-font-heading);
  line-height: var(--mda-lineHeight-heading);
  margin: var(--mda-space-headingBefore) 0 var(--mda-space-headingAfter);
}

h1 {
  font-size: clamp(2rem, 6vw, 3.4rem);
}

h2 {
  font-size: 1.8rem;
}

h3 {
  font-size: 1.35rem;
}

p {
  margin: var(--mda-space-paragraph) 0;
}

a {
  color: var(--mda-color-accent);
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.18em;
}

blockquote {
  margin: 1.5rem 0;
  padding: 0.1rem 1rem;
  border-left: 4px solid var(--mda-color-accent);
  color: var(--mda-color-muted);
  background: color-mix(in srgb, var(--mda-color-surface), transparent 38%);
}

ul,
ol {
  padding-left: 1.5rem;
}

li + li {
  margin-top: var(--mda-space-list);
}

pre {
  overflow-x: auto;
  margin: 1.25rem 0;
  padding: var(--mda-space-code);
  border-radius: var(--mda-layout-radius);
  background: var(--mda-color-codeBackground);
  color: var(--mda-color-codeText);
}

code {
  font-family: var(--mda-font-mono);
  font-size: var(--mda-font-size-code);
}

:not(pre) > code {
  padding: 0.12em 0.32em;
  border-radius: 0.28em;
  background: var(--mda-color-codeBackground);
  color: var(--mda-color-codeText);
}

hr {
  border: 0;
  border-top: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  margin: 2rem 0;
}

img {
  max-width: 100%;
  height: auto;
}

.mda-toc {
  margin: 0 0 2rem;
  padding: 1rem;
  border: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  border-radius: var(--mda-layout-radius);
  background: var(--mda-color-surface);
}

.mda-toc ol {
  margin: 0.35rem 0 0;
}

.mda-heading-anchor {
  opacity: 0;
  margin-left: -0.85em;
  padding-right: 0.25em;
  text-decoration: none;
}

h1:hover .mda-heading-anchor,
h2:hover .mda-heading-anchor,
h3:hover .mda-heading-anchor,
h4:hover .mda-heading-anchor,
h5:hover .mda-heading-anchor,
h6:hover .mda-heading-anchor {
  opacity: 0.6;
}

@media print {
  body {
    background: white;
  }

  .mda-document {
    width: auto;
    padding: 0;
  }

  pre,
  blockquote {
    break-inside: avoid;
  }
}`;
}

function sanitizeCssValue(value: string): string {
  return value.replace(/[;{}]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
