import { buildOutline, type DocumentOutline, type OutlineItem } from "../../document/outline.js";
import type {
  BlockNode,
  DocumentNode,
  FootnoteDefinitionNode,
  HeadingNode,
  InlineNode,
  ListItemNode,
  ListNode,
  ParagraphNode,
  TableCellNode,
  TableNode
} from "../../markdown/ast.js";
import { parseMarkdown, type MarkdownOptions } from "../../markdown/parser.js";
import { defaultConfig, type ResolvedConfig } from "../../config/config-schema.js";
import { resolveTheme, type ResolvedTheme } from "../../theme/theme.js";
import { escapeAttribute, escapeText, safeUrl } from "./escape.js";
import { highlightCode } from "./syntax-highlight.js";
import type { Diagnostic } from "../../core/diagnostics.js";

export interface RenderOptions {
  config?: ResolvedConfig;
  markdown?: MarkdownOptions;
  theme?: ResolvedTheme;
  cwd?: string;
}

export interface RenderResult {
  content: string;
  document: DocumentNode;
  diagnostics: Diagnostic[];
  outline: DocumentOutline;
  theme: ResolvedTheme;
}

interface RenderContext {
  config: ResolvedConfig;
  outline: DocumentOutline;
  headingIds: Map<HeadingNode, string>;
  diagnostics: Diagnostic[];
  footnoteDefinitions: Map<string, FootnoteDefinitionNode>;
  footnoteNumbers: Map<string, number>;
  footnoteReferenceIds: Map<string, string[]>;
}

export async function renderMarkdown(markdown: string, options: RenderOptions = {}): Promise<RenderResult> {
  const parsed = parseMarkdown(markdown, options.markdown ?? options.config?.markdown);
  return renderDocument(parsed.document, options);
}

export async function renderDocument(document: DocumentNode, options: RenderOptions = {}): Promise<RenderResult> {
  const config = options.config ?? defaultConfig;
  const theme = options.theme ?? await resolveTheme(config.theme, options.cwd);
  const outline = buildOutline(document, config.html.title || undefined);
  const headingIds = new Map(outline.headings.map((heading) => [heading.node, heading.id]));
  const diagnostics = [...document.diagnostics, ...theme.diagnostics];
  const footnoteDefinitions = collectFootnoteDefinitions(document.children);
  const context: RenderContext = {
    config,
    outline,
    headingIds,
    diagnostics,
    footnoteDefinitions,
    footnoteNumbers: new Map(),
    footnoteReferenceIds: new Map()
  };
  const fragment = renderBlocks(document.children, context);
  const withFootnotes = appendFootnotes(fragment, context);
  const withToc = shouldRenderToc(config, outline)
    ? `${renderToc(outline.tree, config.html.tocDepth)}\n${withFootnotes}`
    : withFootnotes;
  const content = config.output.standalone && !config.html.fragment
    ? renderStandalone(withToc, config, theme, outline.title)
    : withToc;

  return {
    content,
    document,
    diagnostics,
    outline,
    theme
  };
}

function renderStandalone(content: string, config: ResolvedConfig, theme: ResolvedTheme, title: string): string {
  return `<!doctype html>
<html lang="${escapeAttribute(config.html.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeText(title)}</title>
  <style>
${theme.css}
  </style>
</head>
<body>
  <article class="mda-document">
    <main class="mda-content">
${content}
    </main>
  </article>
</body>
</html>
`;
}

function renderBlocks(blocks: BlockNode[], context: RenderContext, parentList?: ListNode): string {
  return blocks
    .filter((block) => (
      block.type !== "linkReferenceDefinition"
      && block.type !== "footnoteDefinition"
      && block.type !== "frontmatter"
    ))
    .map((block) => renderBlock(block, context, parentList))
    .filter(Boolean)
    .join("\n");
}

function renderBlock(block: BlockNode, context: RenderContext, parentList?: ListNode): string {
  switch (block.type) {
    case "paragraph":
      if (parentList?.tight) return renderInlineChildren(block, context);
      return `<p>${renderInlineChildren(block, context)}</p>`;
    case "heading":
      return renderHeading(block, context);
    case "thematicBreak":
      return "<hr>";
    case "blockquote":
      return `<blockquote>\n${renderBlocks(block.children, context)}\n</blockquote>`;
    case "list":
      return renderList(block, context);
    case "table":
      return renderTable(block, context);
    case "listItem":
      return renderListItem(block, context, parentList);
    case "codeBlock":
      return renderCodeBlock(block);
    case "htmlBlock":
      return renderRawHtml(block.literal, context);
    case "linkReferenceDefinition":
    case "footnoteDefinition":
    case "frontmatter":
      return "";
  }
}

function renderTable(table: TableNode, context: RenderContext): string {
  const header = table.header.map((cell) => renderTableCell(cell, context, "th")).join("");
  const rows = table.rows.map((row) => (
    `<tr>${row.map((cell) => renderTableCell(cell, context, "td")).join("")}</tr>`
  )).join("\n");
  const body = rows ? `\n<tbody>\n${rows}\n</tbody>` : "";
  return `<div class="mda-table-scroll" role="region" aria-label="Scrollable table" tabindex="0">\n<table>\n<thead>\n<tr>${header}</tr>\n</thead>${body}\n</table>\n</div>`;
}

function renderTableCell(cell: TableCellNode, context: RenderContext, tag: "th" | "td"): string {
  const alignment = cell.alignment ? ` style="text-align: ${cell.alignment}"` : "";
  return `<${tag}${alignment}>${renderInlines(cell.children, context)}</${tag}>`;
}

function renderHeading(heading: HeadingNode, context: RenderContext): string {
  const id = context.headingIds.get(heading);
  const attrs = id ? ` id="${escapeAttribute(id)}"` : "";
  const anchor = id && context.config.html.headingAnchors
    ? `<a class="mda-heading-anchor" href="#${escapeAttribute(id)}" aria-hidden="true">#</a>`
    : "";
  return `<h${heading.level}${attrs}>${anchor}${renderInlines(heading.children, context)}</h${heading.level}>`;
}

function renderList(list: ListNode, context: RenderContext): string {
  const tag = list.ordered ? "ol" : "ul";
  const start = list.ordered && list.start && list.start !== 1 ? ` start="${list.start}"` : "";
  const taskClass = list.children.some((item) => item.task) ? " class=\"mda-task-list\"" : "";
  const items = list.children.map((item) => renderListItem(item, context, list)).join("\n");
  return `<${tag}${start}${taskClass}>\n${items}\n</${tag}>`;
}

function renderListItem(item: ListItemNode, context: RenderContext, parentList?: ListNode): string {
  const content = renderBlocks(item.children, context, parentList);
  if (!item.task) return `<li>${content}</li>`;
  const checked = item.task.checked ? " checked" : "";
  const label = item.task.checked ? "Completed task" : "Incomplete task";
  return `<li class="mda-task-list-item"><input class="mda-task-list-checkbox" type="checkbox" disabled${checked} aria-label="${label}"><div class="mda-task-list-content">${content}</div></li>`;
}

function renderCodeBlock(block: Extract<BlockNode, { type: "codeBlock" }>): string {
  const languageClass = block.language ? ` class="language-${escapeAttribute(block.language)}"` : "";
  const languageLabel = block.language ? ` data-language="${escapeAttribute(block.language)}"` : "";
  return `<pre${languageLabel}><code${languageClass}>${highlightCode(block.literal, block.language)}</code></pre>`;
}

function renderInlineChildren(block: ParagraphNode | HeadingNode, context: RenderContext): string {
  return renderInlines(block.children, context);
}

function renderInlines(nodes: InlineNode[], context: RenderContext): string {
  return nodes.map((node) => renderInline(node, context)).join("");
}

function renderInline(node: InlineNode, context: RenderContext): string {
  switch (node.type) {
    case "text":
      return escapeText(node.value);
    case "softBreak":
      if (context.config.html.softBreak === "space") return " ";
      if (context.config.html.softBreak === "br") return "<br>\n";
      return "\n";
    case "hardBreak":
      return "<br>\n";
    case "codeSpan":
      return `<code>${escapeText(node.literal)}</code>`;
    case "emphasis":
      return `<em>${renderInlines(node.children, context)}</em>`;
    case "strong":
      return `<strong>${renderInlines(node.children, context)}</strong>`;
    case "strikethrough":
      return `<del>${renderInlines(node.children, context)}</del>`;
    case "link":
      return renderLink(node.destination, node.title, renderInlines(node.children, context), context);
    case "image":
      return renderImage(node.destination, node.title, node.alt, context);
    case "autoLink":
      return renderLink(node.destination, undefined, escapeText(node.label), context);
    case "footnoteReference":
      return renderFootnoteReference(node.label, context);
    case "htmlInline":
      return renderRawHtml(node.literal, context);
  }
}

function renderFootnoteReference(label: string, context: RenderContext): string {
  const normalized = normalizeFootnoteLabel(label);
  if (!context.footnoteDefinitions.has(normalized)) {
    return escapeText(`[^${label}]`);
  }

  let number = context.footnoteNumbers.get(normalized);
  if (!number) {
    number = context.footnoteNumbers.size + 1;
    context.footnoteNumbers.set(normalized, number);
  }

  const referenceIds = context.footnoteReferenceIds.get(normalized) ?? [];
  const referenceId = `fnref-${number}${referenceIds.length > 0 ? `-${referenceIds.length + 1}` : ""}`;
  referenceIds.push(referenceId);
  context.footnoteReferenceIds.set(normalized, referenceIds);

  return `<sup id="${escapeAttribute(referenceId)}"><a class="mda-footnote-ref" href="#fn-${number}" role="doc-noteref">${number}</a></sup>`;
}

function appendFootnotes(content: string, context: RenderContext): string {
  if (context.footnoteNumbers.size === 0) return content;

  const items = [...context.footnoteNumbers.entries()]
    .sort(([, left], [, right]) => left - right)
    .map(([normalized, number]) => {
      const definition = context.footnoteDefinitions.get(normalized);
      if (!definition) return "";
      const body = renderBlocks(definition.children, context);
      const backrefs = (context.footnoteReferenceIds.get(normalized) ?? [])
        .map((referenceId) => (
          `<a class="mda-footnote-backref" href="#${escapeAttribute(referenceId)}" aria-label="Back to footnote reference ${number}">Back</a>`
        ))
        .join(" ");
      const backrefBlock = backrefs ? `<p class="mda-footnote-backrefs">${backrefs}</p>` : "";
      return `<li id="fn-${number}">\n${indent([body, backrefBlock].filter(Boolean).join("\n"), 2)}\n</li>`;
    })
    .filter(Boolean)
    .join("\n");

  if (!items) return content;
  return `${content}\n<section class="mda-footnotes" role="doc-endnotes">\n<hr>\n<ol>\n${items}\n</ol>\n</section>`;
}

function collectFootnoteDefinitions(blocks: BlockNode[], definitions = new Map<string, FootnoteDefinitionNode>()): Map<string, FootnoteDefinitionNode> {
  for (const block of blocks) {
    switch (block.type) {
      case "footnoteDefinition": {
        const normalized = normalizeFootnoteLabel(block.label);
        if (!definitions.has(normalized)) definitions.set(normalized, block);
        collectFootnoteDefinitions(block.children, definitions);
        break;
      }
      case "blockquote":
      case "listItem":
        collectFootnoteDefinitions(block.children, definitions);
        break;
      case "list":
        for (const item of block.children) collectFootnoteDefinitions(item.children, definitions);
        break;
      case "paragraph":
      case "heading":
      case "thematicBreak":
      case "table":
      case "codeBlock":
      case "htmlBlock":
      case "linkReferenceDefinition":
      case "frontmatter":
        break;
    }
  }
  return definitions;
}

function normalizeFootnoteLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

function renderLink(destination: string, title: string | undefined, label: string, context: RenderContext): string {
  const href = context.config.html.safeUrls ? safeUrl(destination) : destination;
  if (!href) {
    context.diagnostics.push({
      severity: "warning",
      code: "MDA_HTML_UNSAFE_URL",
      message: `Skipped unsafe link destination "${destination}".`
    });
    return label;
  }
  const titleAttr = title ? ` title="${escapeAttribute(title)}"` : "";
  return `<a href="${escapeAttribute(href)}"${titleAttr}>${label}</a>`;
}

function renderImage(destination: string, title: string | undefined, alt: string, context: RenderContext): string {
  const src = context.config.html.safeUrls ? safeUrl(destination) : destination;
  if (!src) {
    context.diagnostics.push({
      severity: "warning",
      code: "MDA_HTML_UNSAFE_URL",
      message: `Skipped unsafe image destination "${destination}".`
    });
    return "";
  }
  const titleAttr = title ? ` title="${escapeAttribute(title)}"` : "";
  return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"${titleAttr}>`;
}

function renderRawHtml(value: string, context: RenderContext): string {
  switch (context.config.html.rawHtml) {
    case "allow":
      return value;
    case "strip":
      return "";
    case "escape":
      return escapeText(value);
  }
}

function shouldRenderToc(config: ResolvedConfig, outline: DocumentOutline): boolean {
  if (config.html.tableOfContents === false) return false;
  if (config.html.tableOfContents === true) return outline.headings.length > 0;
  return outline.headings.length >= 2;
}

function renderToc(items: OutlineItem[], depth: number): string {
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

function indent(value: string, spaces: number): string {
  if (!value) return "";
  const prefix = " ".repeat(spaces);
  return value.split("\n").map((line) => line ? `${prefix}${line}` : line).join("\n");
}
