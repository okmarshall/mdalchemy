import { escapeText } from "./escape.js";
import { highlightWithRules } from "./syntax/engine.js";
import { findSyntaxDefinition } from "./syntax/registry.js";

export function highlightCode(source: string, language: string | undefined): string {
  const definition = findSyntaxDefinition(language);
  return definition ? highlightWithRules(source, definition.rules) : escapeText(source);
}
