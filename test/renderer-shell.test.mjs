import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown, renderDocument } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";

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
  assert.match(rendered.content, /<article id="top" class="mda-document">/);
  assert.match(rendered.content, /<nav class="mda-toc" aria-label="Table of contents">/);
  assert.match(rendered.content, /<a class="mda-floating-action mda-back-to-top" href="#top">Go to top<\/a>/);
  assert.doesNotMatch(rendered.content, /Collapse all/);
  assert.doesNotMatch(rendered.content, /data-mda-control-script/);
  assert.match(rendered.content, /id="main-title"/);
  assert.match(rendered.content, /href="https:\/\/example.com"/);
});

test("renders collapse and expand controls for standalone collapsible output", async () => {
  const markdown = `# Intro

Opening text.

## Details

Nested text.
`;
  const { document } = parseMarkdown(markdown);
  const config = resolveConfig({}, {
    overrides: {
      html: {
        fragment: false,
        collapsibleSections: true
      }
    }
  });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /<button class="mda-floating-action" type="button" data-mda-collapse-all>Collapse all<\/button>/);
  assert.match(rendered.content, /<button class="mda-floating-action" type="button" data-mda-expand-all>Expand all<\/button>/);
  assert.match(rendered.content, /<script data-mda-control-script>/);
  assert.match(rendered.content, /document\.querySelectorAll\(selector\)\.forEach/);
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
