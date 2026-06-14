import { buildOutline, type DocumentOutline, type OutlineItem } from "../../document/outline.js";
import type {
  BlockNode,
  DocumentNode,
  HeadingNode,
  InlineNode,
  ListNode,
  ParagraphNode
} from "../../markdown/ast.js";
import { parseMarkdown, type MarkdownOptions } from "../../markdown/parser.js";
import { defaultConfig, type ResolvedConfig } from "../../config/config-schema.js";
import { resolveTheme, type ResolvedTheme } from "../../theme/theme.js";
import { escapeAttribute, escapeText, safeUrl } from "./escape.js";
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
}

export async function renderMarkdown(markdown: string, options: RenderOptions = {}): Promise<RenderResult> {
  const parsed = parseMarkdown(markdown, options.markdown);
  return renderDocument(parsed.document, options);
}

export async function renderDocument(document: DocumentNode, options: RenderOptions = {}): Promise<RenderResult> {
  const config = options.config ?? defaultConfig;
  const theme = options.theme ?? await resolveTheme(config.theme, options.cwd);
  const outline = buildOutline(document, config.html.title || undefined);
  const headingIds = new Map(outline.headings.map((heading) => [heading.node, heading.id]));
  const diagnostics = [...document.diagnostics, ...theme.diagnostics];
  const context: RenderContext = { config, outline, headingIds, diagnostics };
  const fragment = renderBlocks(document.children, context);
  const withToc = shouldRenderToc(config, outline)
    ? `${renderToc(outline.tree, config.html.tocDepth)}\n${fragment}`
    : fragment;
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
    .filter((block) => block.type !== "linkReferenceDefinition")
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
    case "listItem":
      return `<li>${renderBlocks(block.children, context, parentList)}</li>`;
    case "codeBlock":
      return renderCodeBlock(block);
    case "htmlBlock":
      return renderRawHtml(block.literal, context);
    case "linkReferenceDefinition":
      return "";
  }
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
  const items = list.children.map((item) => {
    const content = renderBlocks(item.children, context, list);
    return `<li>${content}</li>`;
  }).join("\n");
  return `<${tag}${start}>\n${items}\n</${tag}>`;
}

function renderCodeBlock(block: Extract<BlockNode, { type: "codeBlock" }>): string {
  const languageClass = block.language ? ` class="language-${escapeAttribute(block.language)}"` : "";
  const languageLabel = block.language ? ` data-language="${escapeAttribute(block.language)}"` : "";
  return `<pre${languageLabel}><code${languageClass}>${escapeText(block.literal)}</code></pre>`;
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
    case "link":
      return renderLink(node.destination, node.title, renderInlines(node.children, context), context);
    case "image":
      return renderImage(node.destination, node.title, node.alt, context);
    case "autoLink":
      return renderLink(node.destination, undefined, escapeText(node.label), context);
    case "htmlInline":
      return renderRawHtml(node.literal, context);
  }
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
