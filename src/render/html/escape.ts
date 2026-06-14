export function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

export function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll("\"", "&quot;");
}

export function safeUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) return trimmed;
    return undefined;
  } catch {
    if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed)) return trimmed;
    return undefined;
  }
}
