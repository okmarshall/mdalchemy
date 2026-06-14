const namedEntities: Record<string, string> = {
  AElig: "\u00c6",
  amp: "&",
  auml: "\u00e4",
  ClockwiseContourIntegral: "\u2232",
  copy: "\u00a9",
  Dcaron: "\u010e",
  DifferentialD: "\u2146",
  frac34: "\u00be",
  gt: ">",
  HilbertSpace: "\u210b",
  lt: "<",
  nbsp: "\u00a0",
  ngE: "\u2267\u0338",
  ouml: "\u00f6",
  quot: "\"",
  reg: "\u00ae",
  trade: "\u2122"
};

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
