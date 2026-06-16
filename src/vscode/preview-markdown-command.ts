import path from "node:path";
import * as vscode from "vscode";
import { defaultOutputPath } from "../io/files.js";
import { escapeText } from "../render/html/escape.js";
import { WatchRenderSession } from "../watch/watch-render-session.js";
import { resolveMarkdownDocument } from "./markdown-document.js";
import { renderMarkdownDocumentToHtml, type MarkdownRenderResult } from "./markdown-renderer.js";
import { createPreviewPanel, type PreviewPanel } from "./preview.js";

const saveHtmlCommand = "save-html";

let activePreviewSession: MarkdownHtmlPreviewSession | undefined;

export async function previewMarkdownHtml(
  resource: vscode.Uri | undefined,
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    const document = await resolveMarkdownDocument(resource);
    activePreviewSession?.dispose();
    const session = new MarkdownHtmlPreviewSession(document, context, outputChannel, () => {
      if (activePreviewSession === session) activePreviewSession = undefined;
    });
    activePreviewSession = session;
    session.start();
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

export async function saveActiveMarkdownPreviewHtml(): Promise<void> {
  if (!activePreviewSession) {
    vscode.window.showWarningMessage("Open an mdalchemy HTML preview before saving preview output.");
    return;
  }

  try {
    await activePreviewSession.saveCurrentHtml();
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

class MarkdownHtmlPreviewSession {
  private readonly sourcePath: string;
  private readonly outputPath: string;
  private readonly panel: PreviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly watchSession: WatchRenderSession<MarkdownRenderResult>;
  private disposed = false;

  constructor(
    private readonly document: vscode.TextDocument,
    context: vscode.ExtensionContext,
    private readonly outputChannel: vscode.OutputChannel,
    private readonly onDispose: () => void
  ) {
    this.sourcePath = document.uri.fsPath;
    this.outputPath = defaultOutputPath(this.sourcePath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const sourceDirectory = path.dirname(this.sourcePath);

    this.panel = createPreviewPanel({
      context,
      viewType: "mdalchemyLivePreview",
      enableScripts: true,
      actions: [
        {
          id: saveHtmlCommand,
          label: "Save HTML",
          title: "Render the current Markdown state and save it as HTML"
        }
      ],
      title: `mdalchemy Preview: ${path.basename(this.sourcePath)}`,
      localResourceRoot: workspaceFolder?.uri ?? vscode.Uri.file(sourceDirectory),
      resourceBaseDirectory: sourceDirectory
    });
    this.panel.update(renderStatusHtml("Rendering preview..."));

    this.watchSession = new WatchRenderSession({
      debounceMs: 150,
      render: () => renderMarkdownDocumentToHtml({ document: this.document, outputChannel: this.outputChannel }),
      onResult: (result) => this.updatePreview(result),
      onError: (error) => this.showRenderError(error)
    });

    this.disposables.push(
      this.panel.onDidDispose(() => this.dispose()),
      this.panel.onDidChangeViewState(() => {
        if (this.panel.webviewPanel.active) activePreviewSession = this;
      }),
      this.panel.onDidReceiveMessage((message) => {
        if (isWebviewCommand(message, saveHtmlCommand)) {
          void this.saveCurrentHtml().catch((error: unknown) => {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
          });
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.toString() === this.document.uri.toString()) {
          this.watchSession.requestRender("editor-change");
        }
      }),
      ...this.createConfigWatchers(workspaceFolder?.uri.fsPath ?? sourceDirectory)
    );
  }

  start(): void {
    this.watchSession.renderNow("initial");
  }

  async saveCurrentHtml(): Promise<void> {
    const rendered = await renderMarkdownDocumentToHtml({
      document: this.document,
      outputChannel: this.outputChannel
    });
    this.updatePreview(rendered);

    const outputUri = vscode.Uri.file(this.outputPath);
    await vscode.workspace.fs.writeFile(outputUri, Buffer.from(rendered.html, "utf8"));
    vscode.window.showInformationMessage(`mdalchemy saved ${vscode.workspace.asRelativePath(outputUri, false)}`);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.watchSession.dispose();
    this.panel.dispose();
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
    this.onDispose();
  }

  private updatePreview(result: MarkdownRenderResult): void {
    this.panel.update(result.html, `mdalchemy Preview: ${path.basename(result.sourcePath)}`);
  }

  private showRenderError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.outputChannel.appendLine(`[preview] ${message}`);
    this.panel.update(
      renderStatusHtml("Preview render failed", `${message}\n\nSee the mdalchemy output channel for details.`),
      `mdalchemy Preview: ${path.basename(this.sourcePath)}`
    );
  }

  private createConfigWatchers(rootPath: string): vscode.Disposable[] {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(rootPath, "{mdalchemy.config.json,.mdalchemyrc.json}")
    );
    const rerender = () => this.watchSession.requestRender("config-change");
    return [
      watcher,
      watcher.onDidChange(rerender),
      watcher.onDidCreate(rerender),
      watcher.onDidDelete(rerender)
    ];
  }
}

function isWebviewCommand(message: unknown, command: string): boolean {
  return typeof message === "object"
    && message !== null
    && "command" in message
    && message.command === command;
}

function renderStatusHtml(title: string, detail = ""): string {
  const detailHtml = detail
    ? `<pre>${escapeText(detail)}</pre>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
body {
  background: #f6f4ee;
  color: #202124;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  margin: 0;
  padding: 32px;
}
main {
  max-width: 760px;
}
pre {
  background: #111923;
  border-radius: 8px;
  color: #d8e1e8;
  overflow: auto;
  padding: 16px;
  white-space: pre-wrap;
}
</style>
</head>
<body>
<main>
<h1>${escapeText(title)}</h1>
${detailHtml}
</main>
</body>
</html>`;
}
