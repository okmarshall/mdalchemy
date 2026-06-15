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

export function showPreview(options: PreviewOptions): void {
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
