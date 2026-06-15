import path from "node:path";
import * as vscode from "vscode";
import { defaultOutputPath } from "../io/files.js";
import { parseMarkdown } from "../markdown/parser.js";
import { renderDocument } from "../render/html/html-renderer.js";
import { showDiagnostics } from "./diagnostics.js";
import { resolveMarkdownDocument } from "./markdown-document.js";
import { showPreview } from "./preview.js";
import { loadRenderEnvironment } from "./render-environment.js";

export async function renderMarkdownToHtml(
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
