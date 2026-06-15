import { namedEntities } from "./entities.generated.js";

export function decodeCharacterReference(entity: string): string | undefined {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    return codePointToString(Number.parseInt(entity.slice(2), 16));
  }

  if (entity.startsWith("#")) {
    return codePointToString(Number.parseInt(entity.slice(1), 10));
  }

  return namedEntities[entity];
}

export function decodeCharacterReferences(value: string): string {
  return value.replace(/&(#x[0-9A-Fa-f]+|#X[0-9A-Fa-f]+|#[0-9]+|[A-Za-z][A-Za-z0-9]+);/g, (match, entity: string) => (
    decodeCharacterReference(entity) ?? match
  ));
}

function codePointToString(codePoint: number): string | undefined {
  if (!Number.isFinite(codePoint) || codePoint > 0x10ffff) {
    return undefined;
  }

  if (codePoint <= 0) {
    return "\ufffd";
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "\ufffd";
  }
}
