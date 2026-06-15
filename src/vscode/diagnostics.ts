import * as vscode from "vscode";
import { formatDiagnostic, type Diagnostic } from "../core/diagnostics.js";

export function showDiagnostics(outputChannel: vscode.OutputChannel, diagnostics: Diagnostic[], sourcePath: string): void {
  outputChannel.clear();
  for (const diagnostic of diagnostics) {
    outputChannel.appendLine(formatDiagnostic(diagnostic, sourcePath));
  }
  outputChannel.show(true);
}
