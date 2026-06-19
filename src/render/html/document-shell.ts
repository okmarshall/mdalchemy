import type { ResolvedConfig } from "../../config/config-schema.js";
import type { ResolvedTheme } from "../../theme/theme.js";
import { hasDocumentActionControls, renderCollapsibleControlsScript, renderFloatingActions } from "./document-actions.js";
import { escapeAttribute, escapeText } from "./escape.js";
import { hasMermaidDiagrams, renderMermaidInitializerScript, renderMermaidRuntimeScript } from "./mermaid.js";

export async function renderStandalone(
  content: string,
  config: ResolvedConfig,
  theme: ResolvedTheme,
  title: string
): Promise<string> {
  const hasCollapsibleRegions = hasDocumentActionControls(content);
  const hasMermaid = hasMermaidDiagrams(content);
  const controls = renderFloatingActions(hasCollapsibleRegions);
  const scripts = [
    hasCollapsibleRegions ? renderCollapsibleControlsScript() : "",
    hasMermaid ? await renderMermaidRuntimeScript() : "",
    hasMermaid ? renderMermaidInitializerScript() : ""
  ].filter(Boolean);
  const script = scripts.length > 0 ? `\n${scripts.join("\n")}` : "";

  return `<!doctype html>
<html lang="${escapeAttribute(config.html.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeText(title)}</title>
  <style>
${theme.css}
  </style>
</head>
<body>
  <article id="top" class="mda-document">
    <main class="mda-content">
${content}
    </main>
  </article>
${controls}${script}
</body>
</html>
`;
}
