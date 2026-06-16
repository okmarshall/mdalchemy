import { randomBytes } from "node:crypto";
import path from "node:path";
import * as vscode from "vscode";
import { prepareHtmlForWebview, type WebviewAction, type WebviewHtmlOptions } from "./webview-html.js";

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
  enableScripts?: boolean;
  actions?: readonly WebviewAction[];
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
  onDidReceiveMessage(listener: (message: unknown) => void): vscode.Disposable;
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
  const actionNonce = options.actions && options.actions.length > 0 ? createNonce() : undefined;
  const panel = vscode.window.createWebviewPanel(
    options.viewType ?? "mdalchemyPreview",
    options.title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: options.enableScripts ?? false,
      localResourceRoots: [
        options.localResourceRoot,
        options.context.extensionUri
      ]
    }
  );

  return {
    webviewPanel: panel,
    update: (html, title) => {
      const webviewOptions: WebviewHtmlOptions = {
        cspSource: panel.webview.cspSource,
        mapLocalResource: (reference) => mapLocalResourceReference(reference, options.resourceBaseDirectory, panel.webview)
      };
      if (actionNonce && options.actions) {
        webviewOptions.actions = {
          nonce: actionNonce,
          actions: options.actions
        };
      }
      panel.webview.html = prepareHtmlForWebview(html, webviewOptions);
      if (title) panel.title = title;
    },
    reveal: () => panel.reveal(vscode.ViewColumn.Beside),
    dispose: () => panel.dispose(),
    onDidDispose: (listener) => panel.onDidDispose(listener),
    onDidChangeViewState: (listener) => panel.onDidChangeViewState(listener),
    onDidReceiveMessage: (listener) => panel.webview.onDidReceiveMessage(listener)
  };
}

function createNonce(): string {
  return randomBytes(16).toString("base64");
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
