import * as vscode from "vscode";
import { loadConfig } from "../config/config-loader.js";
import { gfmMarkdownExtensions, type ResolvedConfig } from "../config/config-schema.js";
import { type Diagnostic } from "../core/diagnostics.js";
import { resolveTheme, type ResolvedTheme } from "../theme/theme.js";
import { showDiagnostics } from "./diagnostics.js";

export interface RenderEnvironment {
  config: ResolvedConfig;
  configDiagnostics: Diagnostic[];
  theme: ResolvedTheme;
}

export async function loadRenderEnvironment(
  cwd: string,
  diagnosticSourcePath: string,
  outputChannel: vscode.OutputChannel,
  configOverrides: Partial<ResolvedConfig> = {}
): Promise<RenderEnvironment> {
  const configResult = await loadConfig({
    cwd,
    overrides: extensionConfigOverrides(configOverrides)
  });

  const configErrors = configResult.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (configErrors.length > 0) {
    showDiagnostics(outputChannel, configResult.diagnostics, configResult.configPath ?? diagnosticSourcePath);
    throw new Error("mdalchemy configuration has errors. See the mdalchemy output channel for details.");
  }

  const theme = await resolveTheme(configResult.config.theme, cwd);
  const themeErrors = theme.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (themeErrors.length > 0) {
    showDiagnostics(outputChannel, theme.diagnostics, diagnosticSourcePath);
    throw new Error("mdalchemy theme has errors. See the mdalchemy output channel for details.");
  }

  return {
    config: configResult.config,
    configDiagnostics: configResult.diagnostics,
    theme
  };
}

function defaultExtensionOverrides(): Partial<ResolvedConfig> {
  return {
    output: { format: "html", standalone: true, createDirs: false },
    markdown: {
      profile: "commonmark",
      extensions: [...gfmMarkdownExtensions, "frontmatter"]
    }
  };
}

function extensionConfigOverrides(configOverrides: Partial<ResolvedConfig>): Partial<ResolvedConfig> {
  const base = defaultExtensionOverrides();
  const merged: Partial<ResolvedConfig> = {
    output: {
      ...base.output!,
      ...configOverrides.output
    },
    markdown: {
      ...base.markdown!,
      ...configOverrides.markdown
    }
  };
  if (configOverrides.html) merged.html = configOverrides.html;
  if (configOverrides.book) merged.book = configOverrides.book;
  if (configOverrides.theme !== undefined) merged.theme = configOverrides.theme;
  if (configOverrides.strict !== undefined) merged.strict = configOverrides.strict;
  return merged;
}
