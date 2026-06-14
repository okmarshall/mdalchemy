import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Diagnostic } from "../core/diagnostics.js";
import { themeToCss } from "./css.js";
import { baseTokens, builtInThemes } from "./tokens.js";
import type { ResolvedTheme, ThemeDefinition, ThemeTokens } from "./types.js";
import { validateThemeTokens } from "./validation.js";

export { builtInThemes } from "./tokens.js";
export type { ResolvedTheme, ThemeDefinition, ThemeTokens } from "./types.js";

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

  definition ??= builtInThemes["serif"]!;

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
  const name = typeof raw["name"] === "string" ? raw["name"] : "custom";
  if (requireName && typeof raw["name"] !== "string") {
    diagnostics.push({
      severity: "error",
      code: "MDA_THEME_MISSING_NAME",
      message: "Theme files must include a string name."
    });
  }
  const extendsName = typeof raw["extends"] === "string" ? raw["extends"] : undefined;
  const rawTokens = isRecord(raw["tokens"]) ? raw["tokens"] : {};
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
