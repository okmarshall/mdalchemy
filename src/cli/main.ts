#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { formatDiagnostic } from "../core/diagnostics.js";
import { loadConfig } from "../config/config-loader.js";
import { parseMarkdown } from "../markdown/parser.js";
import { builtInThemes, resolveTheme } from "../theme/theme.js";
import { renderDocument } from "../render/html/html-renderer.js";
import { defaultOutputPath, inferFormat, readMarkdownFile, writeOutputFile } from "../io/files.js";
import { cliOverrides, helpText, parseCliArgs } from "./args.js";

async function main(argv: string[]): Promise<number> {
  if (argv[0] === "theme") {
    return handleThemeCommand(argv.slice(1));
  }

  const args = parseCliArgs(argv);

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

  const markdown = await readMarkdownFile(inputPath);
  const parsed = parseMarkdown(markdown, configResult.config.markdown, inputPath);
  const theme = await resolveTheme(configResult.config.theme, process.cwd());
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
    await writeOutputFile(outputPath, rendered.content, configResult.config.output.createDirs);
    console.error(`mdalchemy: wrote ${path.relative(process.cwd(), outputPath) || outputPath}`);
  }

  return 0;
}

async function handleThemeCommand(argv: string[]): Promise<number> {
  const command = argv[0];
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(themeHelpText);
    return command ? 0 : 2;
  }

  if (command === "list") {
    console.log("Built-in themes:");
    for (const name of Object.keys(builtInThemes)) {
      console.log(`- ${name}${name === "serif" ? " (default)" : ""}`);
    }
    return 0;
  }

  if (command === "inspect") {
    const themeInput = argv[1];
    if (!themeInput) {
      console.error("mdalchemy: missing theme name or path\n");
      console.error(themeHelpText);
      return 2;
    }

    const theme = await resolveTheme(themeInput, process.cwd());
    for (const diagnostic of theme.diagnostics) {
      if (diagnostic.severity === "error" || diagnostic.severity === "warning") {
        console.error(formatDiagnostic(diagnostic));
      }
    }
    if (theme.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      return 4;
    }

    console.log(JSON.stringify({
      name: theme.name,
      tokens: theme.tokens
    }, null, 2));
    return 0;
  }

  console.error(`mdalchemy: unknown theme command "${command}"\n`);
  console.error(themeHelpText);
  return 2;
}

const themeHelpText = `Usage:
  mdalchemy theme list
  mdalchemy theme inspect <name-or-path>`;

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
