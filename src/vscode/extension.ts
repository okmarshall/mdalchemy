import path from "node:path";
import * as vscode from "vscode";
import { loadConfig } from "../config/config-loader.js";
import { gfmMarkdownExtensions } from "../config/config-schema.js";
import { formatDiagnostic, type Diagnostic } from "../core/diagnostics.js";
import { defaultOutputPath } from "../io/files.js";
import { parseMarkdown } from "../markdown/parser.js";
import { renderDocument } from "../render/html/html-renderer.js";
import { resolveTheme } from "../theme/theme.js";
import { prepareHtmlForWebview } from "./webview-html.js";

const renderCommand = "mdalchemy.renderMarkdownToHtml";
const markdownExtensions = new Set([".md", ".markdown"]);

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("mdalchemy");
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(
    vscode.commands.registerCommand(renderCommand, async (resource?: vscode.Uri) => {
      await renderMarkdownToHtml(resource, context, outputChannel);
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
    const configResult = await loadConfig({
      cwd,
      overrides: {
        output: { format: "html", standalone: true, createDirs: false },
        markdown: {
          profile: "commonmark",
          extensions: [...gfmMarkdownExtensions, "frontmatter"]
        }
      }
    });

    const configErrors = configResult.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    if (configErrors.length > 0) {
      showDiagnostics(outputChannel, configResult.diagnostics, configResult.configPath ?? sourcePath);
      throw new Error("mdalchemy configuration has errors. See the mdalchemy output channel for details.");
    }

    const theme = await resolveTheme(configResult.config.theme, cwd);
    const themeErrors = theme.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    if (themeErrors.length > 0) {
      showDiagnostics(outputChannel, theme.diagnostics, sourcePath);
      throw new Error("mdalchemy theme has errors. See the mdalchemy output channel for details.");
    }

    const parsed = parseMarkdown(document.getText(), configResult.config.markdown, sourcePath);
    const rendered = await renderDocument(parsed.document, {
      config: configResult.config,
      theme,
      cwd
    });
    const diagnostics = [...configResult.diagnostics, ...rendered.diagnostics];
    const effectiveErrors = configResult.config.strict
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
    showPreview(context, document.uri, outputUri, rendered.content, workspaceFolder);
    vscode.window.showInformationMessage(`mdalchemy generated ${vscode.workspace.asRelativePath(outputUri, false)}`);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
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

function showPreview(
  context: vscode.ExtensionContext,
  sourceUri: vscode.Uri,
  outputUri: vscode.Uri,
  html: string,
  workspaceFolder: vscode.WorkspaceFolder | undefined
): void {
  const panel = vscode.window.createWebviewPanel(
    "mdalchemyPreview",
    `mdalchemy: ${path.basename(sourceUri.fsPath)}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      localResourceRoots: [
        workspaceFolder?.uri ?? vscode.Uri.file(path.dirname(sourceUri.fsPath)),
        context.extensionUri
      ]
    }
  );
  const sourceDirectory = path.dirname(sourceUri.fsPath);
  panel.webview.html = prepareHtmlForWebview(html, {
    cspSource: panel.webview.cspSource,
    mapLocalResource: (reference) => mapLocalResourceReference(reference, sourceDirectory, panel.webview)
  });
  panel.title = `mdalchemy: ${vscode.workspace.asRelativePath(outputUri, false)}`;
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
