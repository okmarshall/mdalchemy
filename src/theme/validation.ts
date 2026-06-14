import type { Diagnostic } from "../core/diagnostics.js";
import { baseTokens } from "./tokens.js";

export function validateThemeTokens(tokens: Record<string, string>): Diagnostic[] {
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
