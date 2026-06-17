import type { ResolvedConfig } from "../../config/config-schema.js";
import type { DocumentOutline } from "../../document/outline.js";
import { escapeAttribute, escapeText } from "./escape.js";
import { indent } from "./formatting.js";

export interface TocItem {
  id?: string | undefined;
  level: number;
  title: string;
  children: TocItem[];
  collapsible?: boolean | undefined;
}

export function shouldRenderToc(config: ResolvedConfig, outline: DocumentOutline): boolean {
  if (config.html.tableOfContents === false) return false;
  if (config.html.tableOfContents === true) return outline.headings.length > 0;
  return outline.headings.length >= 2;
}

export interface TocRenderOptions {
  collapsible?: boolean | undefined;
}

export function renderToc(items: readonly TocItem[], depth: number, options: TocRenderOptions = {}): string {
  const body = options.collapsible
    ? renderCollapsibleTocItems(items, depth, 0)
    : renderTocItems(items, depth);
  if (!body) return "";
  return `<nav class="mda-toc" aria-label="Table of contents">\n${indent(body, 2)}\n</nav>`;
}

function renderTocItems(items: readonly TocItem[], depth: number): string {
  const filtered = items.filter((item) => item.level <= depth);
  if (filtered.length === 0) return "";
  const list = filtered.map((item) => {
    const childList = renderTocItems(item.children, depth);
    const children = childList ? `\n${indent(childList, 2)}` : "";
    return `<li>${renderTocLabel(item)}${children}</li>`;
  }).join("\n");
  return `<ol>\n${indent(list, 2)}\n</ol>`;
}

function renderCollapsibleTocItems(items: readonly TocItem[], depth: number, nestingLevel: number): string {
  const filtered = items.filter((item) => item.level <= depth);
  if (filtered.length === 0) return "";
  const list = filtered.map((item) => {
    const childList = renderCollapsibleTocItems(item.children, depth, nestingLevel + 1);
    if (!childList || item.collapsible === false) {
      const children = childList ? `\n${indent(childList, 2)}` : "";
      return `<li class="mda-toc-item">${renderTocLabel(item)}${children}</li>`;
    }

    const forcedCollapsible = item.collapsible === true;
    const open = nestingLevel === 0 ? " open" : "";
    const detailsOpen = forcedCollapsible ? "" : open;
    return `<li class="mda-toc-item mda-toc-item-has-children"><details class="mda-toc-details"${detailsOpen}><summary class="mda-toc-summary">${renderTocLabel(item)}</summary>\n${indent(childList, 2)}\n</details></li>`;
  }).join("\n");
  return `<ol>\n${indent(list, 2)}\n</ol>`;
}

function renderTocLabel(item: TocItem): string {
  if (item.id) return `<a href="#${escapeAttribute(item.id)}">${escapeText(item.title)}</a>`;
  return `<span class="mda-toc-label">${escapeText(item.title)}</span>`;
}
