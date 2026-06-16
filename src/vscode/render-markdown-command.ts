import * as vscode from "vscode";
import path from "node:path";
import { resolveMarkdownDocument } from "./markdown-document.js";
import { renderMarkdownDocumentToHtml } from "./markdown-renderer.js";
import { showPreview } from "./preview.js";

export async function renderMarkdownToHtml(
  resource: vscode.Uri | undefined,
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    const document = await resolveMarkdownDocument(resource);
    const rendered = await renderMarkdownDocumentToHtml({ document, outputChannel });

    const outputUri = vscode.Uri.file(rendered.outputPath);
    await vscode.workspace.fs.writeFile(outputUri, Buffer.from(rendered.html, "utf8"));
    showPreview({
      context,
      sourceLabel: path.basename(rendered.sourcePath),
      localResourceRoot: rendered.localResourceRoot,
      resourceBaseDirectory: rendered.resourceBaseDirectory,
      outputUri,
      html: rendered.html
    });
    vscode.window.showInformationMessage(`mdalchemy generated ${vscode.workspace.asRelativePath(outputUri, false)}`);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}
