import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown, renderDocument, renderMarkdown } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";

test("renders collapsible table of contents with nested entries closed", async () => {
  const markdown = `# Main Title

## Section One

### Deep Topic

Text.
`;
  const { document } = parseMarkdown(markdown);
  const config = resolveConfig({}, {
    overrides: {
      html: {
        tableOfContents: true,
        collapsibleTableOfContents: true,
        fragment: true
      }
    }
  });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /<nav class="mda-toc" aria-label="Table of contents">/);
  assert.match(rendered.content, /<details class="mda-toc-details" open><summary class="mda-toc-summary"><a href="#main-title">Main Title<\/a><\/summary>/);
  assert.match(rendered.content, /<details class="mda-toc-details"><summary class="mda-toc-summary"><a href="#section-one">Section One<\/a><\/summary>/);
  assert.match(rendered.content, /<li class="mda-toc-item"><a href="#deep-topic">Deep Topic<\/a><\/li>/);
});

test("renders heading-derived section wrappers when enabled", async () => {
  const markdown = `# Intro

Opening text.

## Details

Nested text.

# Next

Final text.
`;
  const { document } = parseMarkdown(markdown);
  const config = resolveConfig({}, {
    overrides: {
      html: {
        fragment: true,
        sections: true
      }
    }
  });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /<section class="mda-section mda-section-level-1" aria-labelledby="intro">/);
  assert.match(rendered.content, /<section class="mda-section mda-section-level-2" aria-labelledby="details">/);
  assert.match(rendered.content, /<section class="mda-section mda-section-level-1" aria-labelledby="next">/);
  assert.match(rendered.content, /<h1 id="intro"><a class="mda-heading-anchor" href="#intro" aria-hidden="true">#<\/a>Intro<\/h1>/);
  assert.match(rendered.content, /Nested text/);
});

test("renders collapsible heading-derived sections when enabled", async () => {
  const markdown = `# Intro

Opening text.

## Details

Nested text.
`;
  const { document } = parseMarkdown(markdown);
  const config = resolveConfig({}, {
    overrides: {
      html: {
        fragment: true,
        collapsibleSections: true
      }
    }
  });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /<section class="mda-section mda-section-level-1 mda-section-collapsible" aria-labelledby="intro">/);
  assert.match(rendered.content, /<details class="mda-section-details" open>/);
  assert.match(rendered.content, /<summary class="mda-section-summary">/);
  assert.match(rendered.content, /<div class="mda-section-body">/);
  assert.match(rendered.content, /<h1 id="intro">Intro<a class="mda-heading-anchor mda-heading-anchor-after" href="#intro" aria-hidden="true">#<\/a><\/h1>/);
  assert.match(rendered.content, /<section class="mda-section mda-section-level-2 mda-section-collapsible" aria-labelledby="details">/);
});

test("omits section wrappers in CommonMark-compatible output", async () => {
  const markdown = "# Intro\n\nText.\n";
  const config = resolveConfig({}, {
    overrides: {
      html: {
        fragment: true,
        sections: true,
        headingAnchors: false
      }
    }
  });
  const rendered = await renderMarkdown(markdown, { config, commonmarkCompatible: true });

  assert.equal(rendered.content, "<h1>Intro</h1>\n<p>Text.</p>");
});
