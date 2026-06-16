import * as vscode from "vscode";
import { previewMarkdownHtml, saveActiveMarkdownPreviewHtml } from "./preview-markdown-command.js";
import { renderFolderToBook } from "./render-book-command.js";
import { renderMarkdownToHtml } from "./render-markdown-command.js";

const renderMarkdownCommand = "mdalchemy.renderMarkdownToHtml";
const previewMarkdownCommand = "mdalchemy.previewMarkdownHtml";
const savePreviewCommand = "mdalchemy.savePreviewHtml";
const renderBookCommand = "mdalchemy.renderFolderToBook";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("mdalchemy");
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(
    vscode.commands.registerCommand(renderMarkdownCommand, async (resource?: vscode.Uri) => {
      await renderMarkdownToHtml(resource, context, outputChannel);
    }),
    vscode.commands.registerCommand(previewMarkdownCommand, async (resource?: vscode.Uri) => {
      await previewMarkdownHtml(resource, context, outputChannel);
    }),
    vscode.commands.registerCommand(savePreviewCommand, async () => {
      await saveActiveMarkdownPreviewHtml();
    }),
    vscode.commands.registerCommand(renderBookCommand, async (resource?: vscode.Uri) => {
      await renderFolderToBook(resource, context, outputChannel);
    })
  );
}

export function deactivate(): void {}
