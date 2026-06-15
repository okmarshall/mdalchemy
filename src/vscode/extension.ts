import path from "node:path";
import * as vscode from "vscode";
import { renderProjectBook } from "../book/book-builder.js";
import { loadConfig } from "../config/config-loader.js";
import { gfmMarkdownExtensions, type ResolvedConfig } from "../config/config-schema.js";
import { formatDiagnostic, type Diagnostic } from "../core/diagnostics.js";
import { defaultOutputPath } from "../io/files.js";
import { parseMarkdown } from "../markdown/parser.js";
import { renderDocument } from "../render/html/html-renderer.js";
import { resolveTheme, type ResolvedTheme } from "../theme/theme.js";
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
    const rootUri = await resolveBookRoot(resource);
    const rootPath = rootUri.fsPath;
    const outputPath = path.join(rootPath, "mdalchemy-book.html");
    const outputUri = vscode.Uri.file(outputPath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(rootUri);
    const cwd = workspaceFolder?.uri.fsPath ?? rootPath;
    const environment = await loadRenderEnvironment(cwd, rootPath, outputChannel);
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
  outputChannel: vscode.OutputChannel
): Promise<RenderEnvironment> {
  const configResult = await loadConfig({
    cwd,
    overrides: defaultExtensionOverrides()
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
  if (resource) {
    if (resource.scheme !== "file") throw new Error("mdalchemy can only render books from local folders.");
    if (!(await isDirectory(resource))) throw new Error("Select a folder to generate a project HTML book.");
    return resource;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (workspaceFolders.length === 1) return workspaceFolders[0]!.uri;
  if (workspaceFolders.length > 1) {
    const selected = await vscode.window.showWorkspaceFolderPick({
      placeHolder: "Select a folder to generate an mdalchemy HTML book"
    });
    if (!selected) throw new Error("No folder selected for mdalchemy book generation.");
    return selected.uri;
  }

  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri?.scheme === "file") {
    return vscode.Uri.file(path.dirname(activeUri.fsPath));
  }
  throw new Error("Open a workspace folder before generating an mdalchemy HTML book.");
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
