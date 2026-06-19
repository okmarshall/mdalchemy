export const documentControlScriptAttribute = "data-mda-control-script";
export const collapsibleRegionSelector = ".mda-section-details, .mda-toc-details";

export function hasDocumentActionControls(content: string): boolean {
  return content.includes("mda-section-details") || content.includes("mda-toc-details");
}

export function renderFloatingActions(hasCollapsibleRegions: boolean): string {
  const collapseControls = hasCollapsibleRegions
    ? `\n    <button class="mda-floating-action" type="button" data-mda-collapse-all>Collapse all</button>\n    <button class="mda-floating-action" type="button" data-mda-expand-all>Expand all</button>`
    : "";
  return `  <nav class="mda-floating-actions" aria-label="Document shortcuts">\n    <a class="mda-floating-action mda-back-to-top" href="#top">Go to top</a>${collapseControls}\n  </nav>`;
}

export function renderCollapsibleControlsScript(): string {
  return `  <script ${documentControlScriptAttribute}>
    (() => {
      const selector = "${collapsibleRegionSelector}";
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
