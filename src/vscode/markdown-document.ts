import path from "node:path";
import * as vscode from "vscode";

const markdownExtensions = new Set([".md", ".markdown"]);

export async function resolveMarkdownDocument(resource: vscode.Uri | undefined): Promise<vscode.TextDocument> {
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
