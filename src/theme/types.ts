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
