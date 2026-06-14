import type {
  BlockNode,
  HeadingNode,
  ListItemNode,
  ListNode,
  ParagraphNode,
  TableCellNode,
  TableNode
} from "../../markdown/ast.js";
import { escapeAttribute, escapeText } from "./escape.js";
import { highlightCode } from "./syntax-highlight.js";
import { renderInlines, renderRawHtml } from "./inline-renderer.js";
import type { RenderContext } from "./types.js";

export function renderBlocks(blocks: BlockNode[], context: RenderContext, parentList?: ListNode): string {
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
      return context.commonmarkCompatible ? "<hr />" : "<hr>";
    case "blockquote":
      return renderBlockQuote(block.children, context);
    case "list":
      return renderList(block, context);
    case "table":
      return renderTable(block, context);
    case "listItem":
      return renderListItem(block, context, parentList);
    case "codeBlock":
      return renderCodeBlock(block, context);
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

function renderBlockQuote(children: BlockNode[], context: RenderContext): string {
  const content = renderBlocks(children, context);
  if (context.commonmarkCompatible && !content) return "<blockquote>\n</blockquote>";
  return `<blockquote>\n${content}\n</blockquote>`;
}

function renderTableCell(cell: TableCellNode, context: RenderContext, tag: "th" | "td"): string {
  const alignment = cell.alignment ? ` style="text-align: ${cell.alignment}"` : "";
  return `<${tag}${alignment}>${renderInlines(cell.children, context)}</${tag}>`;
}

function renderHeading(heading: HeadingNode, context: RenderContext): string {
  const id = context.commonmarkCompatible ? undefined : context.headingIds.get(heading);
  const attrs = id ? ` id="${escapeAttribute(id)}"` : "";
  const anchor = id && context.config.html.headingAnchors
    ? `<a class="mda-heading-anchor" href="#${escapeAttribute(id)}" aria-hidden="true">#</a>`
    : "";
  return `<h${heading.level}${attrs}>${anchor}${renderInlines(heading.children, context)}</h${heading.level}>`;
}

function renderList(list: ListNode, context: RenderContext): string {
  const tag = list.ordered ? "ol" : "ul";
  const start = list.ordered && list.start !== null && list.start !== 1 ? ` start="${list.start}"` : "";
  const taskClass = list.children.some((item) => item.task) ? " class=\"mda-task-list\"" : "";
  const items = list.children.map((item) => renderListItem(item, context, list)).join("\n");
  return `<${tag}${start}${taskClass}>\n${items}\n</${tag}>`;
}

function renderListItem(item: ListItemNode, context: RenderContext, parentList?: ListNode): string {
  const content = renderBlocks(item.children, context, parentList);
  if (context.commonmarkCompatible && content === "") return "<li></li>";
  if (context.commonmarkCompatible && shouldRenderListItemWithBlockFormatting(item, parentList)) {
    if (parentList?.tight && item.children.length > 1 && item.children[item.children.length - 1]?.type === "paragraph") {
      return `<li>\n${content}</li>`;
    }
    return `<li>\n${content}\n</li>`;
  }
  if (context.commonmarkCompatible && parentList?.tight && item.children.length > 1) {
    return `<li>${content}\n</li>`;
  }

  if (!item.task) return `<li>${content}</li>`;
  const checked = item.task.checked ? " checked" : "";
  const label = item.task.checked ? "Completed task" : "Incomplete task";
  return `<li class="mda-task-list-item"><input class="mda-task-list-checkbox" type="checkbox" disabled${checked} aria-label="${label}"><div class="mda-task-list-content">${content}</div></li>`;
}

function shouldRenderListItemWithBlockFormatting(item: ListItemNode, parentList?: ListNode): boolean {
  if (!parentList?.tight) return true;
  return item.children[0]?.type !== "paragraph";
}

function renderCodeBlock(block: Extract<BlockNode, { type: "codeBlock" }>, context: RenderContext): string {
  const languageClass = block.language ? ` class="language-${escapeAttribute(block.language)}"` : "";
  if (context.commonmarkCompatible) {
    const literal = block.literal === "" ? "" : `${block.literal}\n`;
    return `<pre><code${languageClass}>${escapeText(literal)}</code></pre>`;
  }

  const languageLabel = block.language ? ` data-language="${escapeAttribute(block.language)}"` : "";
  return `<pre${languageLabel}><code${languageClass}>${highlightCode(block.literal, block.language)}</code></pre>`;
}

function renderInlineChildren(block: ParagraphNode | HeadingNode, context: RenderContext): string {
  return renderInlines(block.children, context);
}
