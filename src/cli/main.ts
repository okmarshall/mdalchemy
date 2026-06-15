#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { formatDiagnostic } from "../core/diagnostics.js";
import { loadConfig } from "../config/config-loader.js";
import { parseMarkdown } from "../markdown/parser.js";
import { resolveTheme } from "../theme/theme.js";
import { renderDocument } from "../render/html/html-renderer.js";
import { defaultOutputPath, inferFormat, readMarkdownFile, writeOutputFile } from "../io/files.js";
import { CliUsageError, cliOverrides, helpText, parseCliArgs } from "./args.js";
import { handleThemeCommand } from "./theme-command.js";

async function main(argv: string[]): Promise<number> {
  if (argv[0] === "help") {
    const topic = argv[1];
    if (!topic) {
      console.log(helpText);
      return 0;
    }
    if (topic === "theme") {
      return handleThemeCommand(["help"]);
    }

    console.error(`mdalchemy: unknown help topic "${topic}"\n`);
    console.error(helpText);
    return 2;
  }

  if (argv[0] === "theme") {
    return handleThemeCommand(argv.slice(1));
  }

  let args;
  try {
    args = parseCliArgs(argv);
  } catch (error) {
    if (error instanceof CliUsageError) {
      console.error(`mdalchemy: ${error.message}\n`);
      console.error(helpText);
      return 2;
    }
    throw error;
  }

  if (args.help) {
    console.log(helpText);
    return 0;
  }

  if (args.version) {
    console.log(await readVersion());
    return 0;
  }

  if (!args.input) {
    console.error("mdalchemy: missing input file\n");
    console.error(helpText);
    return 2;
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const outputPath = args.stdout ? undefined : path.resolve(process.cwd(), args.output ?? defaultOutputPath(inputPath));
  if (outputPath && outputPath === inputPath) {
    console.error("mdalchemy: output path must not be the same as input path");
    return 2;
  }

  try {
    inferFormat(outputPath);
  } catch (error) {
    console.error(`mdalchemy: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }

  const configResult = await loadConfig({
    cwd: process.cwd(),
    configPath: args.configPath,
    overrides: cliOverrides(args),
    safe: args.safe,
    strict: args.strict
  });

  const configErrors = configResult.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (configErrors.length > 0) {
    for (const diagnostic of configResult.diagnostics) {
      console.error(formatDiagnostic(diagnostic, configResult.configPath));
    }
    return 4;
  }

  let markdown;
  try {
    markdown = await readMarkdownFile(inputPath);
  } catch (error) {
    console.error(`mdalchemy: ${error instanceof Error ? error.message : String(error)}`);
    return 3;
  }

  const parsed = parseMarkdown(markdown, configResult.config.markdown, inputPath);
  const theme = await resolveTheme(configResult.config.theme, process.cwd());

  const themeErrors = theme.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (themeErrors.length > 0) {
    for (const diagnostic of theme.diagnostics) {
      if (diagnostic.severity === "error" || diagnostic.severity === "warning" || args.debug) {
        console.error(formatDiagnostic(diagnostic, inputPath));
      }
    }
    return 5;
  }

  const rendered = await renderDocument(parsed.document, {
    config: configResult.config,
    theme,
    cwd: process.cwd()
  });

  const diagnostics = [...configResult.diagnostics, ...rendered.diagnostics];
  const effectiveErrors = configResult.config.strict
    ? diagnostics.filter((diagnostic) => diagnostic.severity === "error" || diagnostic.severity === "warning")
    : diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  for (const diagnostic of diagnostics) {
    const formatted = formatDiagnostic(diagnostic, inputPath);
    if (diagnostic.severity === "error" || diagnostic.severity === "warning") {
      console.error(formatted);
    } else if (args.debug) {
      console.error(formatted);
    }
  }

  if (effectiveErrors.length > 0) {
    return 6;
  }

  if (args.stdout) {
    process.stdout.write(rendered.content);
  } else if (outputPath) {
    try {
      await writeOutputFile(outputPath, rendered.content, configResult.config.output.createDirs);
    } catch (error) {
      console.error(`mdalchemy: ${error instanceof Error ? error.message : String(error)}`);
      return 7;
    }
    console.error(`mdalchemy: wrote ${path.relative(process.cwd(), outputPath) || outputPath}`);
  }

  return 0;
}

async function readVersion(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const packagePath = path.resolve(here, "../../package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as { version?: string };
  return packageJson.version ?? "0.0.0";
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
