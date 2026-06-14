import type { SourceRange } from "../markdown/ast.js";

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  range?: SourceRange | undefined;
  hint?: string | undefined;
}

export class DiagnosticBag {
  readonly diagnostics: Diagnostic[] = [];

  info(code: string, message: string, range?: SourceRange, hint?: string): void {
    this.add({ severity: "info", code, message, range, hint });
  }

  warning(code: string, message: string, range?: SourceRange, hint?: string): void {
    this.add({ severity: "warning", code, message, range, hint });
  }

  error(code: string, message: string, range?: SourceRange, hint?: string): void {
    this.add({ severity: "error", code, message, range, hint });
  }

  add(diagnostic: Diagnostic): void {
    this.diagnostics.push(diagnostic);
  }

  hasErrors(): boolean {
    return this.diagnostics.some((diagnostic) => diagnostic.severity === "error");
  }

  hasWarnings(): boolean {
    return this.diagnostics.some((diagnostic) => diagnostic.severity === "warning");
  }
}

export function formatDiagnostic(diagnostic: Diagnostic, filePath?: string): string {
  const location = diagnostic.range
    ? ` at ${filePath ?? "<input>"}:${diagnostic.range.start.line}:${diagnostic.range.start.column}`
    : "";
  const hint = diagnostic.hint ? `\n  ${diagnostic.hint}` : "";
  return `${diagnostic.severity} ${diagnostic.code}${location}\n  ${diagnostic.message}${hint}`;
}
