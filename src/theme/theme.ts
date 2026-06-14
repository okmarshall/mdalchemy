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
  "color.background": "#eef2ef",
  "color.document": "#fffefa",
  "color.surface": "#f6f8fa",
  "color.text": "#1d2428",
  "color.muted": "#657177",
  "color.accent": "#9b3d2e",
  "color.accentSoft": "#e8c8bd",
  "color.secondary": "#2f6f73",
  "color.accentText": "#ffffff",
  "color.border": "#cbd8d0",
  "color.shadow": "rgba(31, 43, 45, 0.14)",
  "color.codeBackground": "#111b22",
  "color.codeText": "#e8eef0",
  "color.codeBorder": "#31424d",
  "syntax.keyword": "#ff9e64",
  "syntax.string": "#9ece6a",
  "syntax.number": "#c7a9ff",
  "syntax.comment": "#80919b",
  "syntax.function": "#7dcfff",
  "syntax.property": "#ffd166",
  "syntax.builtin": "#6be4d8",
  "syntax.operator": "#f7768e",
  "syntax.punctuation": "#a8b7c2",
  "syntax.tag": "#7dcfff",
  "syntax.attribute": "#ffd166",
  "font.body": "ui-serif, Georgia, Cambria, Times New Roman, serif",
  "font.heading": "ui-serif, Georgia, Cambria, Times New Roman, serif",
  "font.mono": "ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace",
  "font.size.base": "18px",
  "font.size.small": "0.9rem",
  "font.size.code": "0.92em",
  "lineHeight.body": "1.68",
  "lineHeight.heading": "1.2",
  "layout.maxWidth": "960px",
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
      "color.background": "#edf2ef",
      "color.document": "#fffefa",
      "color.surface": "#f4f0e8",
      "color.text": "#1e2528",
      "color.muted": "#637177",
      "color.accent": "#9b3d2e",
      "color.accentSoft": "#e8c8bd",
      "color.secondary": "#2f6f73",
      "color.border": "#cbd8d0",
      "color.shadow": "rgba(33, 46, 48, 0.16)",
      "color.codeBackground": "#111b22",
      "color.codeText": "#edf4f5",
      "color.codeBorder": "#31424d"
    }
  },
  sans: {
    name: "sans",
    tokens: {
      ...baseTokens,
      "font.body": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.heading": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.size.base": "17px",
      "color.background": "#eef3f5",
      "color.document": "#ffffff",
      "color.surface": "#f2f6f7",
      "color.accent": "#0f6b6e",
      "color.secondary": "#8f3d2f",
      "color.border": "#ccd8db",
      "color.shadow": "rgba(20, 38, 45, 0.12)"
    }
  },
  technical: {
    name: "technical",
    tokens: {
      ...baseTokens,
      "font.body": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.heading": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.size.base": "16px",
      "layout.maxWidth": "1040px",
      "color.background": "#eef3f5",
      "color.document": "#fbfcfd",
      "color.surface": "#e8f0f3",
      "color.text": "#18212b",
      "color.muted": "#586674",
      "color.accent": "#0f6b6e",
      "color.accentSoft": "#b8dedc",
      "color.secondary": "#9b3d2e",
      "color.border": "#c9d6e2",
      "color.shadow": "rgba(18, 31, 45, 0.14)",
      "color.codeBackground": "#101820",
      "color.codeText": "#e7edf3",
      "color.codeBorder": "#2d4350"
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
        definition = parseThemeDefinition(JSON.parse(await readFile(themePath, "utf8")) as Record<string, unknown>, diagnostics, true);
      } catch (error) {
        diagnostics.push({
          severity: "error",
          code: "MDA_THEME_LOAD_FAILED",
          message: `Could not load theme "${input}": ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
  } else {
    definition = parseThemeDefinition(input, diagnostics);
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

function parseThemeDefinition(raw: Record<string, unknown>, diagnostics: Diagnostic[], requireName = false): ThemeDefinition {
  const name = typeof raw.name === "string" ? raw.name : "custom";
  if (requireName && typeof raw.name !== "string") {
    diagnostics.push({
      severity: "error",
      code: "MDA_THEME_MISSING_NAME",
      message: "Theme files must include a string name."
    });
  }
  const extendsName = typeof raw.extends === "string" ? raw.extends : undefined;
  const rawTokens = isRecord(raw.tokens) ? raw.tokens : {};
  const tokens: ThemeTokens = {};
  for (const [key, value] of Object.entries(rawTokens)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      tokens[key] = value;
    } else {
      diagnostics.push({
        severity: "error",
        code: "MDA_THEME_INVALID_TOKEN_TYPE",
        message: `Theme token "${key}" must be a string, number, or boolean.`
      });
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
      continue;
    }

    const value = tokens[key] ?? "";
    const validation = validateThemeTokenValue(key, value);
    if (validation) {
      diagnostics.push(validation);
    }
  }
  return diagnostics;
}

function validateThemeTokenValue(key: string, value: string): Diagnostic | undefined {
  if (/[;{}]/.test(value) || /\b(?:url|expression)\s*\(/i.test(value)) {
    return invalidThemeTokenValue(key, "unsafe CSS fragments such as semicolons, braces, url(), and expression() are not allowed");
  }

  if (key.startsWith("color.") || key.startsWith("syntax.")) {
    return isColorValue(value) ? undefined : invalidThemeTokenValue(key, "expected a hex, rgb(), rgba(), hsl(), hsla(), transparent, currentColor, or simple named color value");
  }

  if (
    key.startsWith("font.size.")
    || key.startsWith("lineHeight.")
    || key.startsWith("layout.")
    || key.startsWith("space.")
  ) {
    return isLengthLikeValue(value) ? undefined : invalidThemeTokenValue(key, "expected a numeric CSS size, percentage, line-height number, or calc/min/max/clamp expression");
  }

  if (key.startsWith("font.")) {
    return value.trim().length > 0 ? undefined : invalidThemeTokenValue(key, "font tokens must not be empty");
  }

  return undefined;
}

function invalidThemeTokenValue(key: string, reason: string): Diagnostic {
  return {
    severity: "error",
    code: "MDA_THEME_INVALID_TOKEN_VALUE",
    message: `Invalid value for theme token "${key}": ${reason}.`
  };
}

function isColorValue(value: string): boolean {
  const trimmed = value.trim();
  return /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)
    || /^(?:rgb|rgba|hsl|hsla)\(\s*[-+0-9.%\s,]+\)$/.test(trimmed)
    || /^(?:transparent|currentColor)$/i.test(trimmed)
    || /^[A-Za-z]+$/.test(trimmed);
}

function isLengthLikeValue(value: string): boolean {
  const trimmed = value.trim();
  return /^0$/.test(trimmed)
    || /^-?(?:\d+|\d*\.\d+)(?:px|rem|em|ch|ex|lh|vw|vh|vmin|vmax|%|pt)?$/.test(trimmed)
    || /^(?:calc|min|max|clamp)\([0-9a-zA-Z.%+\-*/,\s()]+\)$/.test(trimmed);
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
  min-height: 100vh;
}

.mda-document {
  width: min(100%, var(--mda-layout-maxWidth));
  margin: clamp(18px, 4vw, 56px) auto;
  padding: var(--mda-layout-pagePadding);
  background: var(--mda-color-document);
  border: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 28%);
  border-radius: calc(var(--mda-layout-radius) * 1.6);
  box-shadow: 0 24px 70px var(--mda-color-shadow);
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
  letter-spacing: 0;
}

h1 {
  font-size: clamp(2rem, 6vw, 3.4rem);
  padding-bottom: 0.35em;
  border-bottom: 3px solid var(--mda-color-accentSoft);
}

h2 {
  font-size: 1.8rem;
  color: var(--mda-color-secondary);
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

a:hover {
  color: var(--mda-color-secondary);
}

blockquote {
  margin: 1.5rem 0;
  padding: 0.45rem 1.1rem;
  border-left: 5px solid var(--mda-color-accent);
  border-radius: 0 var(--mda-layout-radius) var(--mda-layout-radius) 0;
  color: var(--mda-color-muted);
  background: color-mix(in srgb, var(--mda-color-surface), transparent 20%);
}

ul,
ol {
  padding-left: 1.5rem;
}

li + li {
  margin-top: var(--mda-space-list);
}

del {
  color: var(--mda-color-muted);
  text-decoration-color: var(--mda-color-accent);
  text-decoration-thickness: 0.12em;
  text-decoration-skip-ink: auto;
}

.mda-task-list {
  padding-left: 0;
  list-style: none;
}

.mda-task-list-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.65rem;
  align-items: start;
}

.mda-task-list-checkbox {
  width: 1rem;
  height: 1rem;
  margin: 0.42em 0 0;
  accent-color: var(--mda-color-accent);
}

.mda-task-list-content {
  min-width: 0;
}

.mda-task-list-content > :first-child {
  margin-top: 0;
}

.mda-task-list-content > :last-child {
  margin-bottom: 0;
}

pre {
  overflow-x: auto;
  position: relative;
  margin: 1.25rem 0;
  padding: calc(var(--mda-space-code) + 0.25rem) var(--mda-space-code) var(--mda-space-code);
  border-radius: var(--mda-layout-radius);
  border: var(--mda-layout-borderWidth) solid var(--mda-color-codeBorder);
  background: var(--mda-color-codeBackground);
  color: var(--mda-color-codeText);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 28px var(--mda-color-shadow);
}

code {
  font-family: var(--mda-font-mono);
  font-size: var(--mda-font-size-code);
}

pre code {
  display: block;
  min-width: max-content;
  padding-right: 3.5rem;
}

pre[data-language]::before {
  content: attr(data-language);
  position: absolute;
  top: 0.65rem;
  right: 0.8rem;
  color: var(--mda-syntax-comment);
  font-family: var(--mda-font-mono);
  font-size: 0.72rem;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:not(pre) > code {
  padding: 0.12em 0.32em;
  border-radius: 0.28em;
  background: color-mix(in srgb, var(--mda-color-surface), var(--mda-color-accentSoft) 18%);
  color: var(--mda-color-accent);
  border: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 35%);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.mda-syntax-keyword {
  color: var(--mda-syntax-keyword);
  font-weight: 650;
}

.mda-syntax-string {
  color: var(--mda-syntax-string);
}

.mda-syntax-number {
  color: var(--mda-syntax-number);
}

.mda-syntax-comment {
  color: var(--mda-syntax-comment);
  font-style: italic;
}

.mda-syntax-function {
  color: var(--mda-syntax-function);
}

.mda-syntax-property {
  color: var(--mda-syntax-property);
}

.mda-syntax-builtin {
  color: var(--mda-syntax-builtin);
}

.mda-syntax-operator {
  color: var(--mda-syntax-operator);
}

.mda-syntax-punctuation {
  color: var(--mda-syntax-punctuation);
}

.mda-syntax-tag {
  color: var(--mda-syntax-tag);
}

.mda-syntax-attribute {
  color: var(--mda-syntax-attribute);
}

hr {
  border: 0;
  border-top: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  margin: 2rem 0;
}

img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1rem auto;
  border-radius: var(--mda-layout-radius);
  border: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 25%);
  box-shadow: 0 14px 34px var(--mda-color-shadow);
}

.mda-table-scroll {
  width: 100%;
  max-width: 100%;
  margin: 1.5rem 0;
  overflow-x: auto;
  overflow-y: hidden;
  border: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  border-radius: var(--mda-layout-radius);
  background: var(--mda-color-document);
  -webkit-overflow-scrolling: touch;
}

.mda-table-scroll:focus {
  outline: 3px solid color-mix(in srgb, var(--mda-color-accent), transparent 45%);
  outline-offset: 3px;
}

table {
  width: 100%;
  min-width: 100%;
  margin: 1.5rem 0;
  border-collapse: collapse;
  overflow: hidden;
  border: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  border-radius: var(--mda-layout-radius);
}

.mda-table-scroll table {
  width: max-content;
  min-width: 100%;
  max-width: none;
  margin: 0;
  border: 0;
  border-radius: 0;
}

th,
td {
  min-width: 7rem;
  max-width: min(34rem, 75vw);
  padding: 0.65rem 0.8rem;
  border-bottom: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: normal;
}

th code,
td code {
  white-space: normal;
}

th {
  background: color-mix(in srgb, var(--mda-color-surface), var(--mda-color-accentSoft) 22%);
  color: var(--mda-color-text);
  font-weight: 700;
}

tr:last-child td {
  border-bottom: 0;
}

.mda-toc {
  margin: 0 0 2rem;
  padding: 1rem;
  border: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  border-radius: var(--mda-layout-radius);
  background: color-mix(in srgb, var(--mda-color-surface), transparent 10%);
}

.mda-toc ol {
  margin: 0.35rem 0 0;
}

.mda-footnote-ref {
  display: inline-block;
  min-width: 1.35em;
  margin-left: 0.12em;
  padding: 0.05em 0.28em;
  border-radius: 999px;
  background: color-mix(in srgb, var(--mda-color-accentSoft), transparent 15%);
  color: var(--mda-color-accent);
  font-size: 0.72em;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  text-decoration: none;
}

.mda-footnotes {
  margin-top: 3rem;
  color: var(--mda-color-muted);
  font-size: var(--mda-font-size-small);
}

.mda-footnotes hr {
  margin-bottom: 1rem;
}

.mda-footnotes ol {
  padding-left: 1.35rem;
}

.mda-footnotes li:target {
  background: color-mix(in srgb, var(--mda-color-accentSoft), transparent 60%);
}

.mda-footnote-backrefs {
  margin-top: 0.5rem;
}

.mda-footnote-backref {
  font-size: 0.85em;
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
    margin: 0;
    padding: 0;
    border: 0;
    box-shadow: none;
  }

  pre,
  blockquote,
  .mda-table-scroll {
    break-inside: avoid;
  }

  .mda-table-scroll {
    overflow: visible;
  }

  .mda-table-scroll table {
    width: 100%;
    max-width: 100%;
  }
}

@media (max-width: 720px) {
  .mda-document {
    margin: 0;
    border-width: 0;
    border-radius: 0;
    box-shadow: none;
  }
}`;
}

function sanitizeCssValue(value: string): string {
  return value.replace(/[;{}]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
