import type { BlockNode, FootnoteDefinitionNode } from "../../markdown/ast.js";
import { escapeAttribute, escapeText } from "./escape.js";
import { indent } from "./formatting.js";
import type { RenderContext } from "./types.js";

export function renderFootnoteReference(label: string, context: RenderContext): string {
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

export function appendFootnotes(
  content: string,
  context: RenderContext,
  renderDefinitionBlocks: (blocks: BlockNode[], context: RenderContext) => string
): string {
  if (context.footnoteNumbers.size === 0) return content;

  const items = [...context.footnoteNumbers.entries()]
    .sort(([, left], [, right]) => left - right)
    .map(([normalized, number]) => {
      const definition = context.footnoteDefinitions.get(normalized);
      if (!definition) return "";
      const body = renderDefinitionBlocks(definition.children, context);
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

export function collectFootnoteDefinitions(
  blocks: BlockNode[],
  definitions = new Map<string, FootnoteDefinitionNode>()
): Map<string, FootnoteDefinitionNode> {
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
