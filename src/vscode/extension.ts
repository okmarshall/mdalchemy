import path from "node:path";
import * as vscode from "vscode";
import { renderProjectBook } from "../book/book-builder.js";
import { loadConfig } from "../config/config-loader.js";
import { gfmMarkdownExtensions, type ResolvedConfig } from "../config/config-schema.js";
import { formatDiagnostic, type Diagnostic } from "../core/diagnostics.js";
import { defaultOutputPath } from "../io/files.js";
import { parseMarkdown } from "../markdown/parser.js";
import { renderDocument } from "../render/html/html-renderer.js";
import { builtInThemes, resolveTheme, type ResolvedTheme } from "../theme/theme.js";
import {
  buildBookConfigOverrides,
  defaultBookOutputPath,
  normalizeBookOutputPath,
  type BookPromptSelections,
  type BookSectionMode,
  type BookTocMode
} from "./book-options.js";
import { prepareHtmlForWebview } from "./webview-html.js";

const renderMarkdownCommand = "mdalchemy.renderMarkdownToHtml";
const renderBookCommand = "mdalchemy.renderFolderToBook";
const markdownExtensions = new Set([".md", ".markdown"]);

interface RenderEnvironment {
  config: ResolvedConfig;
  configDiagnostics: Diagnostic[];
  theme: ResolvedTheme;
}

interface PreviewOptions {
  context: vscode.ExtensionContext;
  sourceLabel: string;
  localResourceRoot: vscode.Uri;
  resourceBaseDirectory: string;
  outputUri: vscode.Uri;
  html: string;
}

interface BookRenderSettings {
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

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("mdalchemy");
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(
    vscode.commands.registerCommand(renderMarkdownCommand, async (resource?: vscode.Uri) => {
      await renderMarkdownToHtml(resource, context, outputChannel);
    }),
    vscode.commands.registerCommand(renderBookCommand, async (resource?: vscode.Uri) => {
      await renderFolderToBook(resource, context, outputChannel);
    })
  );
}

export function deactivate(): void {}

async function renderMarkdownToHtml(
  resource: vscode.Uri | undefined,
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    const document = await resolveMarkdownDocument(resource);
    const sourcePath = document.uri.fsPath;
    const outputPath = defaultOutputPath(sourcePath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const cwd = workspaceFolder?.uri.fsPath ?? path.dirname(sourcePath);
    const environment = await loadRenderEnvironment(cwd, sourcePath, outputChannel);

    const parsed = parseMarkdown(document.getText(), environment.config.markdown, sourcePath);
    const rendered = await renderDocument(parsed.document, {
      config: environment.config,
      theme: environment.theme,
      cwd
    });
    const diagnostics = [...environment.configDiagnostics, ...rendered.diagnostics];
    const effectiveErrors = environment.config.strict
      ? diagnostics.filter((diagnostic) => diagnostic.severity === "error" || diagnostic.severity === "warning")
      : diagnostics.filter((diagnostic) => diagnostic.severity === "error");

    if (diagnostics.length > 0) {
      showDiagnostics(outputChannel, diagnostics, sourcePath);
    }
    if (effectiveErrors.length > 0) {
      throw new Error("mdalchemy render failed. See the mdalchemy output channel for details.");
    }

    const outputUri = vscode.Uri.file(outputPath);
    await vscode.workspace.fs.writeFile(outputUri, Buffer.from(rendered.content, "utf8"));
    showPreview({
      context,
      sourceLabel: path.basename(sourcePath),
      localResourceRoot: workspaceFolder?.uri ?? vscode.Uri.file(path.dirname(sourcePath)),
      resourceBaseDirectory: path.dirname(sourcePath),
      outputUri,
      html: rendered.content
    });
    vscode.window.showInformationMessage(`mdalchemy generated ${vscode.workspace.asRelativePath(outputUri, false)}`);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

async function renderFolderToBook(
  resource: vscode.Uri | undefined,
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    const interactive = resource === undefined;
    const rootUri = interactive ? await promptForBookRoot() : await resolveBookRoot(resource);
    if (!rootUri) return;

    const rootPath = rootUri.fsPath;
    const settings = interactive ? await promptForBookSettings(rootUri) : defaultBookRenderSettings(rootPath);
    if (!settings) return;

    const outputPath = settings.outputPath;
    const outputUri = vscode.Uri.file(outputPath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(rootUri);
    const cwd = workspaceFolder?.uri.fsPath ?? rootPath;
    const environment = await loadRenderEnvironment(cwd, rootPath, outputChannel, settings.configOverrides);
    const rendered = await renderProjectBook({
      rootPath,
      outputPath,
      config: environment.config,
      theme: environment.theme,
      cwd
    });
    const diagnostics = [...environment.configDiagnostics, ...rendered.diagnostics];
    const effectiveErrors = environment.config.strict
      ? diagnostics.filter((diagnostic) => diagnostic.severity === "error" || diagnostic.severity === "warning")
      : diagnostics.filter((diagnostic) => diagnostic.severity === "error");

    if (diagnostics.length > 0) {
      showDiagnostics(outputChannel, diagnostics, rootPath);
    }
    if (effectiveErrors.length > 0) {
      throw new Error("mdalchemy book render failed. See the mdalchemy output channel for details.");
    }

    await vscode.workspace.fs.writeFile(outputUri, Buffer.from(rendered.content, "utf8"));
    showPreview({
      context,
      sourceLabel: path.basename(rootPath) || "Project",
      localResourceRoot: workspaceFolder?.uri ?? rootUri,
      resourceBaseDirectory: rootPath,
      outputUri,
      html: rendered.content
    });
    vscode.window.showInformationMessage(
      `mdalchemy generated ${vscode.workspace.asRelativePath(outputUri, false)} from ${rendered.files.length} Markdown files`
    );
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

async function loadRenderEnvironment(
  cwd: string,
  diagnosticSourcePath: string,
  outputChannel: vscode.OutputChannel,
  configOverrides: Partial<ResolvedConfig> = {}
): Promise<RenderEnvironment> {
  const configResult = await loadConfig({
    cwd,
    overrides: extensionConfigOverrides(configOverrides)
  });

  const configErrors = configResult.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (configErrors.length > 0) {
    showDiagnostics(outputChannel, configResult.diagnostics, configResult.configPath ?? diagnosticSourcePath);
    throw new Error("mdalchemy configuration has errors. See the mdalchemy output channel for details.");
  }

  const theme = await resolveTheme(configResult.config.theme, cwd);
  const themeErrors = theme.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (themeErrors.length > 0) {
    showDiagnostics(outputChannel, theme.diagnostics, diagnosticSourcePath);
    throw new Error("mdalchemy theme has errors. See the mdalchemy output channel for details.");
  }

  return {
    config: configResult.config,
    configDiagnostics: configResult.diagnostics,
    theme
  };
}

function defaultExtensionOverrides(): Partial<ResolvedConfig> {
  return {
    output: { format: "html", standalone: true, createDirs: false },
    markdown: {
      profile: "commonmark",
      extensions: [...gfmMarkdownExtensions, "frontmatter"]
    }
  };
}

function extensionConfigOverrides(configOverrides: Partial<ResolvedConfig>): Partial<ResolvedConfig> {
  const base = defaultExtensionOverrides();
  const merged: Partial<ResolvedConfig> = {
    output: {
      ...base.output!,
      ...configOverrides.output
    },
    markdown: {
      ...base.markdown!,
      ...configOverrides.markdown
    }
  };
  if (configOverrides.html) merged.html = configOverrides.html;
  if (configOverrides.book) merged.book = configOverrides.book;
  if (configOverrides.theme !== undefined) merged.theme = configOverrides.theme;
  if (configOverrides.strict !== undefined) merged.strict = configOverrides.strict;
  return merged;
}

async function resolveMarkdownDocument(resource: vscode.Uri | undefined): Promise<vscode.TextDocument> {
  const activeDocument = vscode.window.activeTextEditor?.document;
  const candidate = resource ?? activeDocument?.uri;
  if (!candidate) throw new Error("Open a Markdown file before running mdalchemy.");
  if (candidate.scheme !== "file") throw new Error("mdalchemy can only render saved local Markdown files.");

  const document = activeDocument?.uri.toString() === candidate.toString()
    ? activeDocument
    : await vscode.workspace.openTextDocument(candidate);

  if (!isMarkdownDocument(document)) {
    throw new Error("mdalchemy can only render Markdown files.");
  }
  return document;
}

function isMarkdownDocument(document: vscode.TextDocument): boolean {
  return document.languageId === "markdown"
    || markdownExtensions.has(path.extname(document.uri.fsPath).toLocaleLowerCase());
}

async function resolveBookRoot(resource: vscode.Uri | undefined): Promise<vscode.Uri> {
  if (!resource) throw new Error("Select a folder to generate a project HTML book.");
  if (resource.scheme !== "file") throw new Error("mdalchemy can only render books from local folders.");
  if (!(await isDirectory(resource))) throw new Error("Select a folder to generate a project HTML book.");
  return resource;
}

async function promptForBookRoot(): Promise<vscode.Uri | undefined> {
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

function defaultBookRenderSettings(rootPath: string): BookRenderSettings {
  return {
    outputPath: defaultBookOutputPath(rootPath),
    configOverrides: {}
  };
}

async function promptForBookSettings(rootUri: vscode.Uri): Promise<BookRenderSettings | undefined> {
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

function showPreview(options: PreviewOptions): void {
  const panel = vscode.window.createWebviewPanel(
    "mdalchemyPreview",
    `mdalchemy: ${options.sourceLabel}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      localResourceRoots: [
        options.localResourceRoot,
        options.context.extensionUri
      ]
    }
  );
  panel.webview.html = prepareHtmlForWebview(options.html, {
    cspSource: panel.webview.cspSource,
    mapLocalResource: (reference) => mapLocalResourceReference(reference, options.resourceBaseDirectory, panel.webview)
  });
  panel.title = `mdalchemy: ${vscode.workspace.asRelativePath(options.outputUri, false)}`;
}

function mapLocalResourceReference(reference: string, sourceDirectory: string, webview: vscode.Webview): string | undefined {
  const parts = splitResourceReference(reference);
  if (!parts.path || path.isAbsolute(parts.path)) return undefined;
  const resourceUri = vscode.Uri.file(path.resolve(sourceDirectory, parts.path)).with({
    query: parts.query,
    fragment: parts.fragment
  });
  return webview.asWebviewUri(resourceUri).toString();
}

function splitResourceReference(reference: string): { path: string; query: string; fragment: string } {
  const hashIndex = reference.indexOf("#");
  const beforeHash = hashIndex === -1 ? reference : reference.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : reference.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf("?");
  return {
    path: queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex),
    query: queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1),
    fragment
  };
}

function showDiagnostics(outputChannel: vscode.OutputChannel, diagnostics: Diagnostic[], sourcePath: string): void {
  outputChannel.clear();
  for (const diagnostic of diagnostics) {
    outputChannel.appendLine(formatDiagnostic(diagnostic, sourcePath));
  }
  outputChannel.show(true);
}
