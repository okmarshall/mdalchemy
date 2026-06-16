import { syntaxDefinitions } from "./languages.js";
import type { SyntaxDefinition } from "./types.js";

const definitionsByAlias = new Map<string, SyntaxDefinition>();

for (const definition of syntaxDefinitions) {
  for (const alias of definition.aliases) {
    definitionsByAlias.set(alias, definition);
  }
}

export function findSyntaxDefinition(language: string | undefined): SyntaxDefinition | undefined {
  const normalized = language?.trim().toLocaleLowerCase();
  return normalized ? definitionsByAlias.get(normalized) : undefined;
}

export function supportedSyntaxDefinitions(): readonly SyntaxDefinition[] {
  return syntaxDefinitions;
}
