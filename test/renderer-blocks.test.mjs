import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown, renderDocument } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";

test("renders accessible image alt text and table overflow regions", async () => {
  const markdown = `# Accessible Output

![Descriptive alt](./image.png)

| Name | Value |
| --- | --- |
| Alpha | Beta |
`;
  const { document } = parseMarkdown(markdown, { extensions: ["gfm-table"] });
  const config = resolveConfig({}, { overrides: { html: { fragment: true } } });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /<img src=".\/image.png" alt="Descriptive alt">/);
  assert.match(rendered.content, /<div class="mda-table-scroll" role="region" aria-label="Scrollable table" tabindex="0">/);
});

test("renders GFM tables with header, body, and alignment", async () => {
  const markdown = `| Name | Count |
| :--- | ---: |
| Alpha | **1** |
`;
  const { document } = parseMarkdown(markdown, { extensions: ["gfm-table"] });
  const config = resolveConfig({}, { overrides: { html: { fragment: true } } });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /<div class="mda-table-scroll" role="region" aria-label="Scrollable table" tabindex="0">/);
  assert.match(rendered.content, /<table>/);
  assert.match(rendered.content, /<thead>/);
  assert.match(rendered.content, /<tbody>/);
  assert.match(rendered.content, /<th style="text-align: left">Name<\/th>/);
  assert.match(rendered.content, /<td style="text-align: right"><strong>1<\/strong><\/td>/);
});

test("wraps rendered tables in a horizontal overflow region", async () => {
  const markdown = `| Test | What it verifies |
| --- | --- |
| \`SyntheticReportRenderer_HandlesRidiculouslyLongIdentifierWithoutPageOverflow\` | \`VeryLongConfigurationFlagNameForLayoutTesting\` is present so the table scrolls inside its container. |
`;
  const { document } = parseMarkdown(markdown, { extensions: ["gfm-table"] });
  const config = resolveConfig({}, { overrides: { html: { fragment: true } } });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /class="mda-table-scroll"/);
  assert.match(rendered.content, /aria-label="Scrollable table"/);
  assert.match(rendered.content, /tabindex="0"/);
  assert.match(rendered.content, /SyntheticReportRenderer_HandlesRidiculouslyLongIdentifierWithoutPageOverflow/);
});
