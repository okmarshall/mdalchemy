import path from "node:path";
import { buildOutline } from "../document/outline.js";
import type { TocItem } from "../render/html/toc-renderer.js";
import type { ComposeResult } from "./types.js";

export function buildBookTocItems(composed: ComposeResult, title: string): TocItem[] {
  const outline = buildOutline(composed.document, title);
  const headingIds = new Map(outline.headings.map((heading) => [heading.node, heading.id]));
  const sourceItems = new Map<string, TocItem>();
  collectTocItems(outline.tree, sourceItems);

  const rootSource = outline.tree[0];
  if (!rootSource) return [];

  const root: TocItem = {
    id: rootSource.id,
    level: 1,
    title: rootSource.title,
    children: [],
    collapsible: false
  };
  const folderItems = new Map<string, TocItem>();

  for (const file of composed.files) {
    const fileId = headingIds.get(file.sectionHeading);
    const sourceItem = fileId ? sourceItems.get(fileId) : undefined;
    if (!sourceItem) continue;

    const folderParts = directoryParts(file.relativePath);
    const fileParent = ensureFolderTocItems(root.children, folderItems, folderParts);
    const fileLevel = folderParts.length > 0 ? 3 : 2;
    fileParent.push(cloneTocItemAtLevel(sourceItem, fileLevel, false));
  }

  return [root];
}

function directoryParts(relativePath: string): string[] {
  const dir = path.posix.dirname(relativePath);
  return dir === "." ? [] : dir.split("/").filter(Boolean);
}

function collectTocItems(items: readonly TocItem[], target: Map<string, TocItem>): void {
  for (const item of items) {
    if (item.id) target.set(item.id, item);
    collectTocItems(item.children, target);
  }
}

function ensureFolderTocItems(
  rootChildren: TocItem[],
  folderItems: Map<string, TocItem>,
  folderParts: readonly string[]
): TocItem[] {
  let children = rootChildren;
  for (const [index, folderName] of folderParts.entries()) {
    const folderPath = folderParts.slice(0, index + 1).join("/");
    let folder = folderItems.get(folderPath);
    if (!folder) {
      folder = {
        level: 2,
        title: folderName,
        children: [],
        collapsible: true
      };
      folderItems.set(folderPath, folder);
      children.push(folder);
    }
    children = folder.children;
  }
  return children;
}

function cloneTocItemAtLevel(
  item: TocItem,
  level: number,
  collapsible: boolean
): TocItem {
  const childBaseLevel = item.level;
  return {
    id: item.id,
    level,
    title: item.title,
    children: item.children.map((child) => cloneTocItemAtLevel(
      child,
      level + Math.max(1, child.level - childBaseLevel),
      collapsible
    )),
    collapsible
  };
}
