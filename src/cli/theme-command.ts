import { formatDiagnostic } from "../core/diagnostics.js";
import { builtInThemes, resolveTheme } from "../theme/theme.js";

export async function handleThemeCommand(argv: string[], cwd = process.cwd()): Promise<number> {
  const command = argv[0];
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(themeHelpText);
    return command ? 0 : 2;
  }

  if (command === "list") {
    if (argv.length > 1) return themeUsageError("theme list does not accept arguments.");
    console.log("Built-in themes:");
    for (const name of Object.keys(builtInThemes)) {
      console.log(`- ${name}${name === "serif" ? " (default)" : ""}`);
    }
    return 0;
  }

  if (command === "inspect") {
    if (argv.length > 2) return themeUsageError("theme inspect accepts exactly one theme name or path.");
    return inspectTheme(argv[1], cwd);
  }

  console.error(`mdalchemy: unknown theme command "${command}"\n`);
  console.error(themeHelpText);
  return 2;
}

function themeUsageError(message: string): number {
  console.error(`mdalchemy: ${message}\n`);
  console.error(themeHelpText);
  return 2;
}

async function inspectTheme(themeInput: string | undefined, cwd: string): Promise<number> {
  if (!themeInput) {
    console.error("mdalchemy: missing theme name or path\n");
    console.error(themeHelpText);
    return 2;
  }

  const theme = await resolveTheme(themeInput, cwd);
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

const themeHelpText = `Usage:
  mdalchemy theme list
  mdalchemy theme inspect <name-or-path>
  mdalchemy help theme`;
