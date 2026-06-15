import * as vscode from "vscode";
import { renderFolderToBook } from "./render-book-command.js";
import { renderMarkdownToHtml } from "./render-markdown-command.js";

const renderMarkdownCommand = "mdalchemy.renderMarkdownToHtml";
const renderBookCommand = "mdalchemy.renderFolderToBook";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("mdalchemy");
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(
    vscode.commands.registerCommand(renderMarkdownCommand, async (resource?: vscode.Uri) => {
      await renderMarkdownToHtml(resource, context, outputChannel);
    }),
    vscode.commands.registerCommand(renderBookCommand, async (resource?: vscode.Uri) => {
      await renderFolderToBook(resource, context, outputChannel);
    })
  );
}

export function deactivate(): void {}
