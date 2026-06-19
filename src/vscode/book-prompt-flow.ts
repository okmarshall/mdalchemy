import {
  resolveBookNavigationPromptPlan,
  type BookPromptSelections,
  type BookSectionMode,
  type BookTocMode
} from "./book-options.js";

export interface BookPromptFlow {
  promptTheme(): Promise<string | "config" | undefined>;
  promptSectionMode(): Promise<BookSectionMode | undefined>;
  promptTocMode(): Promise<BookTocMode | undefined>;
  promptSidebar(tocMode: BookTocMode): Promise<boolean | undefined>;
  promptSearch(): Promise<boolean | undefined>;
  promptNavigationStyle(tocMode: BookTocMode, sidebar: boolean): Promise<boolean | undefined>;
  promptFolderStructure(): Promise<boolean | undefined>;
}

export interface BookNavigationStylePromptCopy {
  collapsibleLabel: string;
  expandedLabel: string;
  title: string;
  placeHolder: string;
}

export async function collectBookPromptSelections(prompts: BookPromptFlow): Promise<BookPromptSelections | undefined> {
  const theme = await prompts.promptTheme();
  if (!theme) return undefined;

  const sectionMode = await prompts.promptSectionMode();
  if (!sectionMode) return undefined;

  const tocMode = await prompts.promptTocMode();
  if (!tocMode) return undefined;

  const sidebar = await prompts.promptSidebar(tocMode);
  if (sidebar === undefined) return undefined;

  const search = await prompts.promptSearch();
  if (search === undefined) return undefined;

  const navigationPromptPlan = resolveBookNavigationPromptPlan({ tocMode, sidebar });
  const collapsibleToc = navigationPromptPlan.outlineStyle
    ? await prompts.promptNavigationStyle(tocMode, sidebar)
    : true;
  if (collapsibleToc === undefined) return undefined;

  const folderStructure = navigationPromptPlan.folderStructure
    ? await prompts.promptFolderStructure()
    : true;
  if (folderStructure === undefined) return undefined;

  const selections: BookPromptSelections = {
    sectionMode,
    tocMode,
    collapsibleToc,
    folderStructure,
    sidebar,
    search
  };
  if (theme !== "config") selections.theme = theme;
  return selections;
}

export function resolveBookNavigationStylePromptCopy(
  tocMode: BookTocMode,
  sidebar: boolean
): BookNavigationStylePromptCopy {
  const sidebarOnly = tocMode === "off" && sidebar;
  const tocOnly = tocMode !== "off" && !sidebar;

  return {
    collapsibleLabel: sidebarOnly
      ? "Collapsible sidebar navigation"
      : tocOnly
        ? "Collapsible table of contents"
        : "Collapsible book navigation",
    expandedLabel: sidebarOnly
      ? "Expanded sidebar navigation"
      : tocOnly
        ? "Standard table of contents"
        : "Expanded book navigation",
    title: sidebarOnly
      ? "mdalchemy: Sidebar Navigation Style"
      : tocOnly
        ? "mdalchemy: Table Of Contents Style"
        : "mdalchemy: Book Navigation Style",
    placeHolder: sidebarOnly
      ? "Choose sidebar nesting behavior"
      : tocOnly
        ? "Choose TOC nesting behavior"
        : "Choose book navigation nesting behavior"
  };
}
