import { decodeCharacterReferences } from "./entities.js";

export function normalizeReferenceLabel(label: string): string {
  return decodeCharacterReferences(label.replace(/\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, "$1"))
    .trim()
    .replace(/[ \t\r\n]+/g, " ")
    .toLocaleLowerCase()
    .replaceAll("ß", "ss");
}
