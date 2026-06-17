import type { ResolvedConfig } from "../../config/config-schema.js";
import type { ResolvedTheme } from "../../theme/theme.js";
import { escapeAttribute, escapeText } from "./escape.js";

export function renderStandalone(content: string, config: ResolvedConfig, theme: ResolvedTheme, title: string): string {
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
  <a class="mda-back-to-top" href="#top">Go to top</a>
</body>
</html>
`;
}
