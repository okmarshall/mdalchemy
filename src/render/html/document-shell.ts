import type { ResolvedConfig } from "../../config/config-schema.js";
import type { ResolvedTheme } from "../../theme/theme.js";
import { escapeAttribute, escapeText } from "./escape.js";
import { hasMermaidDiagrams, renderMermaidInitializerScript, renderMermaidRuntimeScript } from "./mermaid.js";

export async function renderStandalone(
  content: string,
  config: ResolvedConfig,
  theme: ResolvedTheme,
  title: string
): Promise<string> {
  const hasCollapsibleRegions = content.includes("mda-section-details") || content.includes("mda-toc-details");
  const hasMermaid = hasMermaidDiagrams(content);
  const controls = renderFloatingControls(hasCollapsibleRegions);
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

function renderFloatingControls(hasCollapsibleRegions: boolean): string {
  const collapseControls = hasCollapsibleRegions
    ? `\n    <button class="mda-floating-action" type="button" data-mda-collapse-all>Collapse all</button>\n    <button class="mda-floating-action" type="button" data-mda-expand-all>Expand all</button>`
    : "";
  return `  <nav class="mda-floating-actions" aria-label="Document shortcuts">\n    <a class="mda-floating-action mda-back-to-top" href="#top">Go to top</a>${collapseControls}\n  </nav>`;
}

function renderCollapsibleControlsScript(): string {
  return `  <script data-mda-control-script>
    (() => {
      const selector = ".mda-section-details, .mda-toc-details";
      const setAll = (open) => {
        document.querySelectorAll(selector).forEach((details) => {
          details.open = open;
        });
      };
      document.querySelector("[data-mda-collapse-all]")?.addEventListener("click", () => setAll(false));
      document.querySelector("[data-mda-expand-all]")?.addEventListener("click", () => setAll(true));
    })();
  </script>`;
}
