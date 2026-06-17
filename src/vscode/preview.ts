import path from "node:path";
import * as vscode from "vscode";
import { prepareHtmlForWebview } from "./webview-html.js";

export interface PreviewOptions {
  context: vscode.ExtensionContext;
  sourceLabel: string;
  localResourceRoot: vscode.Uri;
  resourceBaseDirectory: string;
  outputUri: vscode.Uri;
  html: string;
}

export interface PreviewPanelOptions {
  context: vscode.ExtensionContext;
  viewType?: string;
  title: string;
  localResourceRoot: vscode.Uri;
  resourceBaseDirectory: string;
}

export interface PreviewPanel {
  readonly webviewPanel: vscode.WebviewPanel;
  update(html: string, title?: string): void;
  reveal(): void;
  dispose(): void;
  onDidDispose(listener: () => void): vscode.Disposable;
  onDidChangeViewState(listener: (event: vscode.WebviewPanelOnDidChangeViewStateEvent) => void): vscode.Disposable;
}

export function showPreview(options: PreviewOptions): void {
  const preview = createPreviewPanel({
    context: options.context,
    title: `mdalchemy: ${options.sourceLabel}`,
    localResourceRoot: options.localResourceRoot,
    resourceBaseDirectory: options.resourceBaseDirectory
  });
  preview.update(options.html, `mdalchemy: ${vscode.workspace.asRelativePath(options.outputUri, false)}`);
}

export function createPreviewPanel(options: PreviewPanelOptions): PreviewPanel {
  const panel = vscode.window.createWebviewPanel(
    options.viewType ?? "mdalchemyPreview",
    options.title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [
        options.localResourceRoot,
        options.context.extensionUri
      ]
    }
  );

  return {
    webviewPanel: panel,
    update: (html, title) => {
      panel.webview.html = prepareHtmlForWebview(html, {
        cspSource: panel.webview.cspSource,
        mapLocalResource: (reference) => mapLocalResourceReference(reference, options.resourceBaseDirectory, panel.webview)
      });
      if (title) panel.title = title;
    },
    reveal: () => panel.reveal(vscode.ViewColumn.Beside),
    dispose: () => panel.dispose(),
    onDidDispose: (listener) => panel.onDidDispose(listener),
    onDidChangeViewState: (listener) => panel.onDidChangeViewState(listener)
  };
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
