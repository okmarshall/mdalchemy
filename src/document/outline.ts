import type { DocumentNode, HeadingNode } from "../markdown/ast.js";
import { textContent } from "../markdown/ast.js";

export interface OutlineItem {
  id: string;
  level: HeadingNode["level"];
  title: string;
  children: OutlineItem[];
}

export interface FlatHeading {
  id: string;
  level: HeadingNode["level"];
  title: string;
  node: HeadingNode;
}

export interface DocumentOutline {
  title: string;
  headings: FlatHeading[];
  tree: OutlineItem[];
}

export function buildOutline(document: DocumentNode, explicitTitle?: string): DocumentOutline {
  const counts = new Map<string, number>();
  const headings = collectHeadings(document).map((heading) => {
    const title = textContent(heading.children) || heading.raw;
    const base = slugify(title) || `heading-${heading.range.start.line}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    return { id, level: heading.level, title, node: heading };
  });

  return {
    title: explicitTitle || headings.find((heading) => heading.level === 1)?.title || "Markdown Document",
    headings,
    tree: nestHeadings(headings)
  };
}

export function slugify(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function collectHeadings(document: DocumentNode): HeadingNode[] {
  const headings: HeadingNode[] = [];

  function visitBlocks(blocks: DocumentNode["children"]): void {
    for (const block of blocks) {
      if (block.type === "heading") headings.push(block);
      if (block.type === "blockquote" || block.type === "listItem") {
        visitBlocks(block.children);
      }
      if (block.type === "list") {
        for (const item of block.children) visitBlocks(item.children);
      }
    }
  }

  visitBlocks(document.children);
  return headings;
}

function nestHeadings(headings: FlatHeading[]): OutlineItem[] {
  const roots: OutlineItem[] = [];
  const stack: OutlineItem[] = [];

  for (const heading of headings) {
    const item: OutlineItem = {
      id: heading.id,
      level: heading.level,
      title: heading.title,
      children: []
    };

    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= heading.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(item);
    else roots.push(item);
    stack.push(item);
  }

  return roots;
}

