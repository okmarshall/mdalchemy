import type { ResolvedConfig } from "../../config/config-schema.js";
import type { ResolvedTheme } from "../../theme/theme.js";
import { hasDocumentActionControls, renderCollapsibleControlsScript, renderFloatingActions } from "./document-actions.js";
import { escapeAttribute, escapeText } from "./escape.js";

export function renderStandalone(content: string, config: ResolvedConfig, theme: ResolvedTheme, title: string): string {
  const hasCollapsibleRegions = hasDocumentActionControls(content);
  const controls = renderFloatingActions(hasCollapsibleRegions);
  const script = hasCollapsibleRegions ? `\n${renderCollapsibleControlsScript()}` : "";

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
