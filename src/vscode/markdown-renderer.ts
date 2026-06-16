import path from "node:path";
import * as vscode from "vscode";
import type { ResolvedConfig } from "../config/config-schema.js";
import { defaultOutputPath } from "../io/files.js";
import { parseMarkdown } from "../markdown/parser.js";
import { renderDocument } from "../render/html/html-renderer.js";
import { showDiagnostics } from "./diagnostics.js";
import { loadRenderEnvironment } from "./render-environment.js";

export interface MarkdownRenderOptions {
  readonly document: vscode.TextDocument;
  readonly outputChannel: vscode.OutputChannel;
  readonly configOverrides?: Partial<ResolvedConfig>;
}

export interface MarkdownRenderResult {
  readonly sourcePath: string;
  readonly outputPath: string;
  readonly cwd: string;
  readonly localResourceRoot: vscode.Uri;
  readonly resourceBaseDirectory: string;
  readonly workspaceFolder: vscode.WorkspaceFolder | undefined;
  readonly html: string;
}

export async function renderMarkdownDocumentToHtml(options: MarkdownRenderOptions): Promise<MarkdownRenderResult> {
  const sourcePath = options.document.uri.fsPath;
  const outputPath = defaultOutputPath(sourcePath);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(options.document.uri);
  const cwd = workspaceFolder?.uri.fsPath ?? path.dirname(sourcePath);
  const environment = await loadRenderEnvironment(cwd, sourcePath, options.outputChannel, options.configOverrides);

  const parsed = parseMarkdown(options.document.getText(), environment.config.markdown, sourcePath);
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
    showDiagnostics(options.outputChannel, diagnostics, sourcePath);
  }
  if (effectiveErrors.length > 0) {
    throw new Error("mdalchemy render failed. See the mdalchemy output channel for details.");
  }

  return {
    sourcePath,
    outputPath,
    cwd,
    localResourceRoot: workspaceFolder?.uri ?? vscode.Uri.file(path.dirname(sourcePath)),
    resourceBaseDirectory: path.dirname(sourcePath),
    workspaceFolder,
    html: rendered.content
  };
}
