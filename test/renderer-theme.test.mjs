import test from "node:test";
import assert from "node:assert/strict";
import { resolveTheme } from "../dist/theme/theme.js";

test("loads a user-defined theme file", async () => {
  const theme = await resolveTheme("examples/themes/warm-report.json", process.cwd());

  assert.equal(theme.name, "warm-report");
  assert.equal(theme.tokens["layout.maxWidth"], "760px");
  assert.equal(theme.diagnostics.some((diagnostic) => diagnostic.severity === "error"), false);
});

test("reports invalid user-defined theme token values", async () => {
  const theme = await resolveTheme({
    name: "invalid-theme",
    tokens: {
      "color.text": "url(https://example.com/color)",
      "layout.maxWidth": "wide"
    }
  });

  assert.equal(theme.diagnostics.filter((diagnostic) => diagnostic.code === "MDA_THEME_INVALID_TOKEN_VALUE").length, 2);
});

test("default theme includes print-friendly CSS rules", async () => {
  const theme = await resolveTheme("serif", process.cwd());

  assert.match(theme.css, /@media print/);
  assert.match(theme.css, /\.mda-document \{\n    width: auto;/);
  assert.match(theme.css, /\.mda-table-scroll \{\n    overflow: visible;/);
  assert.match(theme.css, /\.mda-mermaid \{\n    overflow: visible;/);
});

test("default theme uses responsive width and compact code tab stops", async () => {
  const theme = await resolveTheme("serif", process.cwd());

  assert.equal(theme.tokens["layout.maxWidth"], "1440px");
  assert.match(theme.css, /width: min\(calc\(100% - clamp\(24px, 4vw, 80px\)\), var\(--mda-layout-maxWidth\)\);/);
  assert.match(theme.css, /tab-size: 2;/);
  assert.match(theme.css, /\.mda-mermaid \{/);
  assert.match(theme.css, /\.mda-mermaid-canvas svg \{/);
  assert.match(theme.css, /\.mda-mermaid > \.mermaid \{/);
  assert.match(theme.css, /@media \(max-width: 720px\) \{\n  \.mda-document \{\n    width: 100%;/);
});
