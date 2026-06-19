import path from "node:path";
import * as vscode from "vscode";
import type { ResolvedConfig } from "../config/config-schema.js";
import { builtInThemes } from "../theme/theme.js";
import {
  defaultBookConfigOverrides,
  buildBookConfigOverrides,
  defaultBookOutputPath,
  normalizeBookOutputPath,
  type BookSectionMode,
  type BookTocMode
} from "./book-options.js";
import {
  collectBookPromptSelections,
  resolveBookNavigationStylePromptCopy
} from "./book-prompt-flow.js";

export interface BookRenderSettings {
  outputPath: string;
  configOverrides: Partial<ResolvedConfig>;
}

interface BookRootQuickPickItem extends vscode.QuickPickItem {
  uri?: vscode.Uri | undefined;
  browse?: boolean | undefined;
}

interface ThemeQuickPickItem extends vscode.QuickPickItem {
  theme?: string | undefined;
  custom?: boolean | undefined;
}

interface ChoiceQuickPickItem<T> extends vscode.QuickPickItem {
  value: T;
}

export async function resolveBookRoot(resource: vscode.Uri | undefined): Promise<vscode.Uri> {
  if (!resource) throw new Error("Select a folder to generate a project HTML book.");
  if (resource.scheme !== "file") throw new Error("mdalchemy can only render books from local folders.");
  if (!(await isDirectory(resource))) throw new Error("Select a folder to generate a project HTML book.");
  return resource;
}

export async function promptForBookRoot(): Promise<vscode.Uri | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  const items: BookRootQuickPickItem[] = workspaceFolders.map((folder) => ({
    label: folder.name,
    description: folder.uri.fsPath,
    uri: folder.uri
  }));

  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri?.scheme === "file") {
    const activeFolder = vscode.Uri.file(path.dirname(activeUri.fsPath));
    if (!items.some((item) => item.uri?.toString() === activeFolder.toString())) {
      items.push({
        label: path.basename(activeFolder.fsPath) || activeFolder.fsPath,
        description: activeFolder.fsPath,
        detail: "Folder containing the active editor",
        uri: activeFolder
      });
    }
  }

  items.push({
    label: "Choose another folder...",
    description: "Browse for a local folder",
    browse: true
  });

  const selected = await vscode.window.showQuickPick(items, {
    title: "mdalchemy: Generate HTML Book",
    placeHolder: "Select the folder to scan for Markdown"
  });
  if (!selected) return undefined;
  if (selected.browse) {
    const folders = await vscode.window.showOpenDialog({
      title: "Select folder for mdalchemy HTML book",
      openLabel: "Use Folder",
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false
    });
    return folders?.[0];
  }
  return selected.uri;
}

export function defaultBookRenderSettings(rootPath: string): BookRenderSettings {
  return {
    outputPath: defaultBookOutputPath(rootPath),
    configOverrides: defaultBookConfigOverrides()
  };
}

export async function promptForBookSettings(rootUri: vscode.Uri): Promise<BookRenderSettings | undefined> {
  const selections = await collectBookPromptSelections({
    promptTheme: promptForBookTheme,
    promptSectionMode: promptForSectionMode,
    promptTocMode: promptForTocMode,
    promptSidebar: promptForSidebar,
    promptSearch: promptForSearch,
    promptNavigationStyle: promptForNavigationStyle,
    promptFolderStructure: promptForFolderStructure
  });
  if (!selections) return undefined;

  const outputUri = await vscode.window.showSaveDialog({
    title: "Save mdalchemy HTML book",
    saveLabel: "Generate HTML Book",
    defaultUri: vscode.Uri.file(defaultBookOutputPath(rootUri.fsPath)),
    filters: {
      "HTML": ["html", "htm"]
    }
  });
  if (!outputUri) return undefined;
  if (outputUri.scheme !== "file") throw new Error("mdalchemy can only write HTML books to local files.");

  return {
    outputPath: normalizeBookOutputPath(rootUri.fsPath, outputUri.fsPath),
    configOverrides: buildBookConfigOverrides(selections)
  };
}

async function promptForBookTheme(): Promise<string | "config" | undefined> {
  const themeItems: ThemeQuickPickItem[] = [
    {
      label: "Config/default",
      description: "Use mdalchemy.config.json, otherwise serif"
    },
    ...Object.keys(builtInThemes).map((theme) => ({
      label: theme,
      description: theme === "serif" ? "Default editorial theme" : "Built-in theme",
      theme
    })),
    {
      label: "Custom theme file...",
      description: "Choose a JSON theme file",
      custom: true
    }
  ];

  const selected = await vscode.window.showQuickPick(themeItems, {
    title: "mdalchemy: Book Theme",
    placeHolder: "Choose a theme"
  });
  if (!selected) return undefined;
  if (selected.custom) {
    const files = await vscode.window.showOpenDialog({
      title: "Select mdalchemy theme JSON",
      openLabel: "Use Theme",
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        "JSON": ["json"],
        "All files": ["*"]
      }
    });
    const themeFile = files?.[0];
    if (!themeFile) return undefined;
    if (themeFile.scheme !== "file") throw new Error("mdalchemy can only load local theme files.");
    return themeFile.fsPath;
  }
  return selected.theme ?? "config";
}

async function promptForSectionMode(): Promise<BookSectionMode | undefined> {
  return promptChoice<BookSectionMode>([
    {
      label: "Config/default",
      description: "Use html.sections and html.collapsibleSections from config",
      value: "config"
    },
    {
      label: "No sections",
      description: "Render headings without section wrappers",
      value: "none"
    },
    {
      label: "Sections",
      description: "Wrap heading-led content in section elements",
      value: "sections"
    },
    {
      label: "Collapsible sections",
      description: "Add native expand/collapse controls to heading sections",
      value: "collapsible"
    }
  ], {
    title: "mdalchemy: Section Rendering",
    placeHolder: "Choose section behavior"
  });
}

async function promptForTocMode(): Promise<BookTocMode | undefined> {
  return promptChoice<BookTocMode>([
    {
      label: "Config/default",
      description: "Use TOC visibility from config with collapsible book navigation",
      value: "config"
    },
    {
      label: "Show table of contents",
      description: "Force the book table of contents on",
      value: "on"
    },
    {
      label: "Hide table of contents",
      description: "Force the book table of contents off",
      value: "off"
    }
  ], {
    title: "mdalchemy: Table Of Contents",
    placeHolder: "Choose TOC behavior"
  });
}

async function promptForNavigationStyle(tocMode: BookTocMode, sidebar: boolean): Promise<boolean | undefined> {
  const copy = resolveBookNavigationStylePromptCopy(tocMode, sidebar);

  return promptChoice<boolean>([
    {
      label: copy.collapsibleLabel,
      description: "Nested branches collapse by default",
      value: true
    },
    {
      label: copy.expandedLabel,
      description: "Show nested entries as an expanded ordered list",
      value: false
    }
  ], {
    title: copy.title,
    placeHolder: copy.placeHolder
  });
}

async function promptForFolderStructure(): Promise<boolean | undefined> {
  return promptChoice<boolean>([
    {
      label: "Show folder groups",
      description: "Group book navigation entries by traversed folders",
      value: true
    },
    {
      label: "Flat file list",
      description: "Render file entries without folder groups",
      value: false
    }
  ], {
    title: "mdalchemy: Book Folder Structure",
    placeHolder: "Choose how source folders appear in the book"
  });
}

async function promptForSidebar(tocMode: BookTocMode): Promise<boolean | undefined> {
  return promptChoice<boolean>([
    {
      label: "Show navigation sidebar",
      description: "Keep book navigation visible beside the document",
      value: true
    },
    {
      label: "Hide navigation sidebar",
      description: tocMode === "off"
        ? "Generate without a persistent navigation rail"
        : "Use inline navigation and the document body only",
      value: false
    }
  ], {
    title: "mdalchemy: Book Sidebar",
    placeHolder: "Choose sidebar behavior"
  });
}

async function promptForSearch(): Promise<boolean | undefined> {
  return promptChoice<boolean>([
    {
      label: "Show book search",
      description: "Add client-side search to the generated HTML book",
      value: true
    },
    {
      label: "Hide book search",
      description: "Generate the book without search controls",
      value: false
    }
  ], {
    title: "mdalchemy: Book Search",
    placeHolder: "Choose search behavior"
  });
}

async function promptChoice<T>(
  items: readonly ChoiceQuickPickItem<T>[],
  options: vscode.QuickPickOptions
): Promise<T | undefined> {
  const selected = await vscode.window.showQuickPick(items, options);
  return selected?.value;
}

async function isDirectory(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.Directory) === vscode.FileType.Directory;
  } catch {
    return false;
  }
}
