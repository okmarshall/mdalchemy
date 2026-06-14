import type { Diagnostic } from "../core/diagnostics.js";

export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export interface BaseNode {
  type: string;
  range: SourceRange;
}

export interface DocumentNode extends BaseNode {
  type: "document";
  children: BlockNode[];
  references: ReferenceMap;
  diagnostics: Diagnostic[];
}

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | ThematicBreakNode
  | BlockQuoteNode
  | ListNode
  | ListItemNode
  | CodeBlockNode
  | HtmlBlockNode
  | LinkReferenceDefinitionNode;

export interface ParagraphNode extends BaseNode {
  type: "paragraph";
  children: InlineNode[];
  raw: string;
}

export interface HeadingNode extends BaseNode {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: InlineNode[];
  raw: string;
}

export interface ThematicBreakNode extends BaseNode {
  type: "thematicBreak";
}

export interface BlockQuoteNode extends BaseNode {
  type: "blockquote";
  children: BlockNode[];
}

export interface ListNode extends BaseNode {
  type: "list";
  ordered: boolean;
  start: number | null;
  delimiter: "." | ")" | null;
  bullet: "-" | "+" | "*" | null;
  tight: boolean;
  children: ListItemNode[];
}

export interface ListItemNode extends BaseNode {
  type: "listItem";
  marker: string;
  padding: number;
  children: BlockNode[];
}

export interface CodeBlockNode extends BaseNode {
  type: "codeBlock";
  kind: "indented" | "fenced";
  literal: string;
  info?: string | undefined;
  language?: string | undefined;
  fence?: "`" | "~" | undefined;
}

export interface HtmlBlockNode extends BaseNode {
  type: "htmlBlock";
  literal: string;
  blockKind: "comment" | "processing" | "declaration" | "cdata" | "script" | "block-tag" | "complete";
}

export interface LinkReferenceDefinitionNode extends BaseNode {
  type: "linkReferenceDefinition";
  label: string;
  destination: string;
  title?: string | undefined;
}

export type InlineNode =
  | TextNode
  | SoftBreakNode
  | HardBreakNode
  | CodeSpanNode
  | EmphasisNode
  | StrongNode
  | LinkNode
  | ImageNode
  | AutoLinkNode
  | HtmlInlineNode;

export interface TextNode extends BaseNode {
  type: "text";
  value: string;
}

export interface SoftBreakNode extends BaseNode {
  type: "softBreak";
}

export interface HardBreakNode extends BaseNode {
  type: "hardBreak";
}

export interface CodeSpanNode extends BaseNode {
  type: "codeSpan";
  literal: string;
}

export interface EmphasisNode extends BaseNode {
  type: "emphasis";
  children: InlineNode[];
}

export interface StrongNode extends BaseNode {
  type: "strong";
  children: InlineNode[];
}

export interface LinkNode extends BaseNode {
  type: "link";
  destination: string;
  title?: string | undefined;
  children: InlineNode[];
  referenceKind?: "inline" | "full" | "collapsed" | "shortcut" | undefined;
}

export interface ImageNode extends BaseNode {
  type: "image";
  destination: string;
  title?: string | undefined;
  alt: string;
  children: InlineNode[];
  referenceKind?: "inline" | "full" | "collapsed" | "shortcut" | undefined;
}

export interface AutoLinkNode extends BaseNode {
  type: "autoLink";
  destination: string;
  label: string;
  kind: "uri" | "email";
}

export interface HtmlInlineNode extends BaseNode {
  type: "htmlInline";
  literal: string;
}

export interface LinkReferenceDefinition {
  label: string;
  normalizedLabel: string;
  destination: string;
  title?: string | undefined;
  range: SourceRange;
}

export type ReferenceMap = Map<string, LinkReferenceDefinition>;

export function textContent(nodes: InlineNode[]): string {
  let output = "";
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        output += node.value;
        break;
      case "codeSpan":
        output += node.literal;
        break;
      case "softBreak":
      case "hardBreak":
        output += " ";
        break;
      case "emphasis":
      case "strong":
      case "link":
      case "image":
        output += textContent(node.children);
        break;
      case "autoLink":
        output += node.label;
        break;
      case "htmlInline":
        break;
    }
  }
  return output.replace(/\s+/g, " ").trim();
}
