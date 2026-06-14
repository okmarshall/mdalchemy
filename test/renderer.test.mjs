import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown, renderDocument, renderMarkdown } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";
import { resolveTheme } from "../dist/theme/theme.js";

test("renders standalone themed HTML with heading anchors and toc", async () => {
  const markdown = `# Main Title

## Section One

Text with [a link](https://example.com).
`;
  const { document } = parseMarkdown(markdown);
  const config = resolveConfig({}, {
    overrides: {
      html: {
        tableOfContents: true,
        fragment: false
      }
    }
  });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /<!doctype html>/);
  assert.match(rendered.content, /<nav class="mda-toc"/);
  assert.match(rendered.content, /id="main-title"/);
  assert.match(rendered.content, /href="https:\/\/example.com"/);
});

test("escapes raw html in safe mode", async () => {
  const markdown = `<script>alert("x")</script>`;
  const { document } = parseMarkdown(markdown);
  const config = resolveConfig({}, { safe: true, overrides: { html: { fragment: true } } });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /&lt;script&gt;/);
  assert.doesNotMatch(rendered.content, /<script>/);
});

test("omits unsafe links when safe urls are enabled", async () => {
  const markdown = `[bad](javascript:alert(1))`;
  const { document } = parseMarkdown(markdown);
  const config = resolveConfig({}, { overrides: { html: { fragment: true, safeUrls: true } } });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /bad/);
  assert.doesNotMatch(rendered.content, /javascript:/);
  assert.equal(rendered.diagnostics.some((diagnostic) => diagnostic.code === "MDA_HTML_UNSAFE_URL"), true);
});

test("loads a user-defined theme file", async () => {
  const theme = await resolveTheme("examples/themes/warm-report.json", process.cwd());

  assert.equal(theme.name, "warm-report");
  assert.equal(theme.tokens["layout.maxWidth"], "760px");
  assert.equal(theme.diagnostics.some((diagnostic) => diagnostic.severity === "error"), false);
});

test("renders GFM tables with header, body, and alignment", async () => {
  const markdown = `| Name | Count |
| :--- | ---: |
| Alpha | **1** |
`;
  const { document } = parseMarkdown(markdown, { extensions: ["gfm-table"] });
  const config = resolveConfig({}, { overrides: { html: { fragment: true } } });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /<table>/);
  assert.match(rendered.content, /<thead>/);
  assert.match(rendered.content, /<tbody>/);
  assert.match(rendered.content, /<th style="text-align: left">Name<\/th>/);
  assert.match(rendered.content, /<td style="text-align: right"><strong>1<\/strong><\/td>/);
});

test("renderMarkdown respects markdown extensions from config", async () => {
  const config = resolveConfig({
    markdown: {
      extensions: ["gfm-table"]
    },
    html: {
      fragment: true
    }
  });
  const rendered = await renderMarkdown("| A |\n| --- |\n| B |\n", { config });

  assert.match(rendered.content, /<table>/);
});
