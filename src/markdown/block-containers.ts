import { isBlankLine } from "../core/source.js";
import {
  isThematicBreak,
  matchAtxHeading,
  matchFenceStart,
  matchHtmlBlockStart
} from "./block-leaves.js";

export interface ListMarker {
  ordered: boolean;
  marker: string;
  bullet: "-" | "+" | "*" | null;
  delimiter: "." | ")" | null;
  start: number | null;
  indent: number;
  markerColumns: number;
  padding: number;
  content: string;
}

export interface LineLike {
  text: string;
}

export function stripBlockQuote(text: string): string | undefined {
  const match = /^(?: {0,3})>[ \t]?(.*)$/.exec(text);
  return match?.[1];
}

export function matchListMarker(text: string): ListMarker | undefined {
  const match = /^( {0,3})(?:(-|\+|\*)|([0-9]{1,9})([.)]))([ \t]*)(.*)$/.exec(text);
  if (!match) return undefined;
  const indent = match[1]?.length ?? 0;
  const bullet = (match[2] as "-" | "+" | "*" | undefined) ?? null;
  const orderedDigits = match[3];
  const delimiter = (match[4] as "." | ")" | undefined) ?? null;
  const spaces = match[5] ?? "";
  const content = match[6] ?? "";
  const marker = bullet ?? `${orderedDigits ?? ""}${delimiter ?? ""}`;
  const markerColumns = marker.length;
  const padding = spaces.length > 0 && spaces.length < 5 ? spaces.length : 1;

  return {
    ordered: Boolean(orderedDigits),
    marker,
    bullet,
    delimiter,
    start: orderedDigits ? Number.parseInt(orderedDigits, 10) : null,
    indent,
    markerColumns,
    padding,
    content
  };
}

export function matchTaskListMarker(text: string): { checked: boolean; content: string } | undefined {
  const match = /^\[([ xX])\](?:[ \t]+|$)(.*)$/.exec(text);
  if (!match?.[1]) return undefined;
  return {
    checked: match[1].toLowerCase() === "x",
    content: match[2] ?? ""
  };
}

export function sameList(first: ListMarker, next: ListMarker): boolean {
  if (first.ordered !== next.ordered) return false;
  if (first.ordered) return first.delimiter === next.delimiter;
  return first.bullet === next.bullet;
}

export function isParagraphInterrupt(text: string): boolean {
  if (matchAtxHeading(text)) return true;
  if (matchFenceStart(text)) return true;
  if (stripBlockQuote(text) !== undefined) return true;
  const listMarker = matchListMarker(text);
  if (listMarker) return !listMarker.ordered || listMarker.start === 1;
  if (isThematicBreak(text)) return true;
  if (matchHtmlBlockStart(text)) return true;
  return false;
}

export function findNextNonBlank<TLine extends LineLike>(lines: TLine[], start: number, end: number): number {
  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    if (line && !isBlankLine(line.text)) return index;
  }
  return -1;
}
