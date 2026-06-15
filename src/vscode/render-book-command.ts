import path from "node:path";
import * as vscode from "vscode";
import { renderProjectBook } from "../book/book-builder.js";
import {
  defaultBookRenderSettings,
  promptForBookRoot,
  promptForBookSettings,
  resolveBookRoot
} from "./book-prompts.js";
import { showDiagnostics } from "./diagnostics.js";
import { showPreview } from "./preview.js";
import { loadRenderEnvironment } from "./render-environment.js";

export async function renderFolderToBook(
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
