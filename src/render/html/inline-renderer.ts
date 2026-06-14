import type { InlineNode } from "../../markdown/ast.js";
import { escapeAttribute, escapeText, safeUrl } from "./escape.js";
import { renderFootnoteReference } from "./footnotes.js";
import type { RenderContext } from "./types.js";

export function renderInlines(nodes: InlineNode[], context: RenderContext): string {
  return nodes.map((node) => renderInline(node, context)).join("");
}

export function renderRawHtml(value: string, context: RenderContext): string {
  switch (context.config.html.rawHtml) {
    case "allow":
      return value;
    case "strip":
      return "";
    case "escape":
      return escapeText(value);
  }
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
