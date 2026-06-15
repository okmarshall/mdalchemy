import type { InlineNode } from "../../markdown/ast.js";
import { hasMarkdownExtension } from "../../markdown/extensions.js";
import { escapeAttribute, escapeText, safeUrl } from "./escape.js";
import { renderFootnoteReference } from "./footnotes.js";
import type { RenderContext } from "./types.js";

export function renderInlines(nodes: InlineNode[], context: RenderContext): string {
  return nodes.map((node) => renderInline(node, context)).join("");
}

export function renderRawHtml(value: string, context: RenderContext): string {
  const renderedValue = hasMarkdownExtension(context.config.markdown.extensions, "gfm-tagfilter")
    ? applyGfmTagFilter(value)
    : value;

  switch (context.config.html.rawHtml) {
    case "allow":
      return renderedValue;
    case "strip":
      return "";
    case "escape":
      return escapeText(renderedValue);
  }
}

function applyGfmTagFilter(value: string): string {
  return value.replace(
    /<\/?(?:title|textarea|style|xmp|iframe|noembed|noframes|script|plaintext)(?=[\s>/])/gi,
    (tag) => `&lt;${tag.slice(1)}`
  );
}

function renderInline(node: InlineNode, context: RenderContext): string {
  switch (node.type) {
    case "text":
      return escapeText(node.value);
    case "softBreak":
      if (context.config.html.softBreak === "space") return " ";
      if (context.config.html.softBreak === "br") return renderBreak(context);
      return "\n";
    case "hardBreak":
      return renderBreak(context);
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

function renderLink(destination: string, title: string | undefined, label: string, context: RenderContext): string {
  const href = context.config.html.safeUrls ? safeUrl(destination) : destination;
  if (href === undefined) {
    context.diagnostics.push({
      severity: "warning",
      code: "MDA_HTML_UNSAFE_URL",
      message: `Skipped unsafe link destination "${destination}".`
    });
    return label;
  }
  const titleAttr = title ? ` title="${escapeAttribute(title)}"` : "";
  const normalizedHref = context.commonmarkCompatible ? normalizeCommonMarkUri(href) : href;
  return `<a href="${escapeAttribute(normalizedHref)}"${titleAttr}>${label}</a>`;
}

function renderImage(destination: string, title: string | undefined, alt: string, context: RenderContext): string {
  const src = context.config.html.safeUrls ? safeUrl(destination) : destination;
  if (src === undefined) {
    context.diagnostics.push({
      severity: "warning",
      code: "MDA_HTML_UNSAFE_URL",
      message: `Skipped unsafe image destination "${destination}".`
    });
    return "";
  }
  const titleAttr = title ? ` title="${escapeAttribute(title)}"` : "";
  const normalizedSrc = context.commonmarkCompatible ? normalizeCommonMarkUri(src) : src;
  const suffix = context.commonmarkCompatible ? " />" : ">";
  return `<img src="${escapeAttribute(normalizedSrc)}" alt="${escapeAttribute(alt)}"${titleAttr}${suffix}`;
}

function renderBreak(context: RenderContext): string {
  return context.commonmarkCompatible ? "<br />\n" : "<br>\n";
}

function normalizeCommonMarkUri(value: string): string {
  const preservedEscapes: string[] = [];
  const placeholderPrefix = "__MDA_URI_ESCAPE_";
  const protectedValue = value.replace(/%[0-9A-Fa-f]{2}/g, (escape) => {
    const index = preservedEscapes.push(escape) - 1;
    return `${placeholderPrefix}${index}__`;
  });
  const encoded = encodeURI(protectedValue);
  return encoded.replace(new RegExp(`${placeholderPrefix}(\\d+)__`, "g"), (_match, index: string) => (
    preservedEscapes[Number.parseInt(index, 10)] ?? ""
  ));
}
