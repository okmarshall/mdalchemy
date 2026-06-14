export function normalizeReferenceLabel(label: string): string {
  return label.trim().replace(/[ \t\r\n]+/g, " ").toLocaleLowerCase();
}

