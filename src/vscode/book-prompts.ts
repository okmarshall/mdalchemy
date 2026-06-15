import path from "node:path";
import * as vscode from "vscode";
import type { ResolvedConfig } from "../config/config-schema.js";
import { builtInThemes } from "../theme/theme.js";
import {
  buildBookConfigOverrides,
  defaultBookOutputPath,
  normalizeBookOutputPath,
  type BookPromptSelections,
  type BookSectionMode,
  type BookTocMode
} from "./book-options.js";

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

interface SectionQuickPickItem extends vscode.QuickPickItem {
  sectionMode: BookSectionMode;
}

interface TocQuickPickItem extends vscode.QuickPickItem {
  tocMode: BookTocMode;
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
    configOverrides: {}
  };
}

export async function promptForBookSettings(rootUri: vscode.Uri): Promise<BookRenderSettings | undefined> {
  const theme = await promptForBookTheme();
  if (!theme) return undefined;

  const sectionMode = await promptForSectionMode();
  if (!sectionMode) return undefined;

  const tocMode = await promptForTocMode();
  if (!tocMode) return undefined;

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

  const selections: BookPromptSelections = {
    sectionMode,
    tocMode
  };
  if (theme !== "config") selections.theme = theme;

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
  const selected = await vscode.window.showQuickPick<SectionQuickPickItem>([
    {
      label: "Config/default",
      description: "Use html.sections and html.collapsibleSections from config",
      sectionMode: "config"
    },
    {
      label: "No sections",
      description: "Render headings without section wrappers",
      sectionMode: "none"
    },
    {
      label: "Sections",
      description: "Wrap heading-led content in section elements",
      sectionMode: "sections"
    },
    {
      label: "Collapsible sections",
      description: "Add native expand/collapse controls to heading sections",
      sectionMode: "collapsible"
    }
  ], {
    title: "mdalchemy: Section Rendering",
    placeHolder: "Choose section behavior"
  });
  return selected?.sectionMode;
}

async function promptForTocMode(): Promise<BookTocMode | undefined> {
  const selected = await vscode.window.showQuickPick<TocQuickPickItem>([
    {
      label: "Config/default",
      description: "Use html.tableOfContents from config",
      tocMode: "config"
    },
    {
      label: "Show table of contents",
      description: "Force the book table of contents on",
      tocMode: "on"
    },
    {
      label: "Hide table of contents",
      description: "Force the book table of contents off",
      tocMode: "off"
    }
  ], {
    title: "mdalchemy: Table Of Contents",
    placeHolder: "Choose TOC behavior"
  });
  return selected?.tocMode;
}

async function isDirectory(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.Directory) === vscode.FileType.Directory;
  } catch {
    return false;
  }
}
