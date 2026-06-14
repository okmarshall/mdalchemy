import type { HeadingNode, HtmlBlockNode } from "./ast.js";

export interface FenceStart {
  char: "`" | "~";
  length: number;
  indent: number;
  info: string;
}

export interface FootnoteDefinitionStart {
  label: string;
  content: string;
}

export interface LinkReferenceStart {
  label: string;
  destination: string;
  title?: string | undefined;
}

export interface HtmlBlockStart {
  kind: HtmlBlockNode["blockKind"];
  untilBlank: boolean;
  endCondition?: ((line: string) => boolean) | undefined;
}

export function matchFrontmatterFence(text: string): boolean {
  return text.trim() === "---";
}

export function matchAtxHeading(text: string): { level: HeadingNode["level"]; content: string } | undefined {
  const match = /^(?: {0,3})(#{1,6})(?:[ \t]+|$)(.*)$/.exec(text);
  if (!match?.[1]) return undefined;
  let content = match[2] ?? "";
  content = content.replace(/[ \t]+#+[ \t]*$/, "").trim();
  return {
    level: match[1].length as HeadingNode["level"],
    content
  };
}

export function matchSetextHeading(text: string): { level: 1 | 2 } | undefined {
  if (/^ {0,3}=+[ \t]*$/.test(text)) return { level: 1 };
  if (/^ {0,3}-+[ \t]*$/.test(text)) return { level: 2 };
  return undefined;
}

export function isThematicBreak(text: string): boolean {
  const trimmed = text.trim();
  if (!/^ {0,3}[-*_][ \t\-*_]*$/.test(text)) return false;
  const markers = trimmed.replace(/[ \t]/g, "");
  return markers.length >= 3 && /^(?:\*+|-+|_+)$/.test(markers);
}

export function matchFenceStart(text: string): FenceStart | undefined {
  const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(text);
  if (!match?.[2]) return undefined;
  const fence = match[2];
  const char = fence[0] as "`" | "~";
  const info = match[3] ?? "";
  if (char === "`" && info.includes("`")) return undefined;
  return {
    char,
    length: fence.length,
    indent: match[1]?.length ?? 0,
    info
  };
}

export function isFenceClose(text: string, char: "`" | "~", length: number): boolean {
  const pattern = new RegExp(`^ {0,3}${escapeRegExp(char)}{${length},}[ \\t]*$`);
  return pattern.test(text);
}

export function matchFootnoteDefinitionStart(text: string): FootnoteDefinitionStart | undefined {
  const match = /^ {0,3}\[\^([^\]\s]+)\]:[ \t]*(.*)$/.exec(text);
  if (!match?.[1]) return undefined;
  return {
    label: match[1].trim(),
    content: match[2] ?? ""
  };
}

export function parseReferenceDefinition(text: string): LinkReferenceStart | undefined {
  const match = /^ {0,3}\[([^\]\n]+)\]:[ \t]*(\S+)(?:[ \t]+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?[ \t]*$/.exec(text);
  if (!match?.[1] || !match[2]) return undefined;
  let destination = match[2];
  if (destination.startsWith("<") && destination.endsWith(">")) {
    destination = destination.slice(1, -1);
  }
  const title = match[3] ?? match[4] ?? match[5];
  const result: LinkReferenceStart = {
    label: match[1],
    destination
  };
  if (title !== undefined) result.title = title;
  return result;
}

export function matchHtmlBlockStart(text: string): HtmlBlockStart | undefined {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("<")) return undefined;

  if (/^<!--/.test(trimmed)) {
    return { kind: "comment", untilBlank: false, endCondition: (line) => /-->/.test(line) };
  }

  if (/^<\?/.test(trimmed)) {
    return { kind: "processing", untilBlank: false, endCondition: (line) => /\?>/.test(line) };
  }

  if (/^<![A-Z]/i.test(trimmed)) {
    return { kind: "declaration", untilBlank: false, endCondition: (line) => />/.test(line) };
  }

  if (/^<!\[CDATA\[/.test(trimmed)) {
    return { kind: "cdata", untilBlank: false, endCondition: (line) => /\]\]>/.test(line) };
  }

  if (/^<(script|pre|style|textarea)(?:\s|>|$)/i.test(trimmed)) {
    const tag = /^<([A-Za-z0-9-]+)/.exec(trimmed)?.[1]?.toLowerCase() ?? "";
    return { kind: "script", untilBlank: false, endCondition: (line) => new RegExp(`</${tag}>`, "i").test(line) };
  }

  if (/^<\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|\/?>|$)/i.test(trimmed)) {
    return { kind: "block-tag", untilBlank: true };
  }

  if (/^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?>[ \t]*$/.test(trimmed)) {
    return { kind: "complete", untilBlank: true };
  }

  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
