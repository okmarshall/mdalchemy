import type { ResolvedConfig } from "../../config/config-schema.js";
import type { DocumentOutline, OutlineItem } from "../../document/outline.js";
import { escapeAttribute, escapeText } from "./escape.js";
import { indent } from "./formatting.js";

export function shouldRenderToc(config: ResolvedConfig, outline: DocumentOutline): boolean {
  if (config.html.tableOfContents === false) return false;
  if (config.html.tableOfContents === true) return outline.headings.length > 0;
  return outline.headings.length >= 2;
}

export function renderToc(items: OutlineItem[], depth: number): string {
  const body = renderTocItems(items, depth);
  if (!body) return "";
  return `<nav class="mda-toc" aria-label="Table of contents">\n${indent(body, 2)}\n</nav>`;
}

function renderTocItems(items: OutlineItem[], depth: number): string {
  const filtered = items.filter((item) => item.level <= depth);
  if (filtered.length === 0) return "";
  const list = filtered.map((item) => {
    const childList = renderTocItems(item.children, depth);
    const children = childList ? `\n${indent(childList, 2)}` : "";
    return `<li><a href="#${escapeAttribute(item.id)}">${escapeText(item.title)}</a>${children}</li>`;
  }).join("\n");
  return `<ol>\n${indent(list, 2)}\n</ol>`;
}
