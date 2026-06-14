export function indent(value: string, spaces: number): string {
  if (!value) return "";
  const prefix = " ".repeat(spaces);
  return value.split("\n").map((line) => line ? `${prefix}${line}` : line).join("\n");
}
