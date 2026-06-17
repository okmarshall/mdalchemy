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
  assert.match(rendered.content, /<article id="top" class="mda-document">/);
  assert.match(rendered.content, /<nav class="mda-toc" aria-label="Table of contents">/);
  assert.match(rendered.content, /<a class="mda-floating-action mda-back-to-top" href="#top">Go to top<\/a>/);
  assert.doesNotMatch(rendered.content, /Collapse all/);
  assert.doesNotMatch(rendered.content, /data-mda-control-script/);
  assert.match(rendered.content, /id="main-title"/);
  assert.match(rendered.content, /href="https:\/\/example.com"/);
});

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
});

test("default theme uses responsive width and compact code tab stops", async () => {
  const theme = await resolveTheme("serif", process.cwd());

  assert.equal(theme.tokens["layout.maxWidth"], "1440px");
  assert.match(theme.css, /width: min\(calc\(100% - clamp\(24px, 4vw, 80px\)\), var\(--mda-layout-maxWidth\)\);/);
  assert.match(theme.css, /tab-size: 2;/);
  assert.match(theme.css, /@media \(max-width: 720px\) \{\n  \.mda-document \{\n    width: 100%;/);
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

test("renders opted-in GFM extensions and omits frontmatter", async () => {
  const markdown = `---
title: Hidden Metadata
---

- [x] Finished task
- [ ] Pending task with ~~old text~~

Literal links: www.example.com and person@example.com.

Raw HTML: <title>hidden</title>.

Footnote reference.[^demo]

[^demo]: Footnote body with **strong** text.
`;
  const config = resolveConfig({
    markdown: {
      extensions: [
        "frontmatter",
        "gfm-task-list",
        "gfm-strikethrough",
        "gfm-footnote",
        "gfm-literal-autolink",
        "gfm-tagfilter"
      ]
    },
    html: {
      fragment: true
    }
  });
  const rendered = await renderMarkdown(markdown, { config });

  assert.doesNotMatch(rendered.content, /Hidden Metadata/);
  assert.match(rendered.content, /class="mda-task-list"/);
  assert.match(rendered.content, /type="checkbox" disabled checked/);
  assert.match(rendered.content, /type="checkbox" disabled aria-label="Incomplete task"/);
  assert.match(rendered.content, /<del>old text<\/del>/);
  assert.match(rendered.content, /href="http:\/\/www.example.com"/);
  assert.match(rendered.content, /href="mailto:person@example.com"/);
  assert.match(rendered.content, /&lt;title>hidden&lt;\/title>/);
  assert.match(rendered.content, /class="mda-footnotes"/);
  assert.match(rendered.content, /role="doc-endnotes"/);
  assert.match(rendered.content, /Footnote body with <strong>strong<\/strong> text/);
});

test("highlights C# fenced code blocks", async () => {
  const markdown = "```csharp\n[Fact(DisplayName = \"renders records\")]\npublic sealed record Demo(string Value)\n{\n    public string Render() => Value.Trim();\n}\n```\n";
  const { document } = parseMarkdown(markdown);
  const config = resolveConfig({}, { overrides: { html: { fragment: true } } });
  const rendered = await renderDocument(document, { config });

  assert.match(rendered.content, /language-csharp/);
  assert.match(rendered.content, /mda-syntax-attribute">\[Fact\(DisplayName = &quot;renders records&quot;\)\]/);
  assert.match(rendered.content, /mda-syntax-keyword">public/);
  assert.match(rendered.content, /mda-syntax-keyword">record/);
  assert.match(rendered.content, /mda-syntax-function">Render/);
  assert.match(rendered.content, /mda-syntax-function">Trim/);
});

const expandedSyntaxHighlightCases = [
  {
    name: "Python",
    language: "python",
    source: `@task
def render(value: str) -> str:
    # keep the rendered output tidy
    return f"{value.strip()}"`,
    checks: [
      /language-python/,
      /mda-syntax-attribute">@task/,
      /mda-syntax-keyword">def/,
      /mda-syntax-builtin">str/,
      /mda-syntax-comment"># keep the rendered output tidy/
    ]
  },
  {
    name: "Java",
    language: "java",
    source: `@Deprecated
public final class Demo {
    public String render(String value) {
        return value.trim();
    }
}`,
    checks: [
      /language-java/,
      /mda-syntax-attribute">@Deprecated/,
      /mda-syntax-keyword">public/,
      /mda-syntax-builtin">String/,
      /mda-syntax-function">render/
    ]
  },
  {
    name: "Go",
    language: "go",
    source: `package main

func render(value string) string {
    return strings.TrimSpace(value)
}`,
    checks: [
      /language-go/,
      /mda-syntax-keyword">package/,
      /mda-syntax-keyword">func/,
      /mda-syntax-builtin">string/,
      /mda-syntax-function">render/
    ]
  },
  {
    name: "Rust",
    language: "rust",
    source: `#[derive(Debug)]
pub fn render(value: &str) -> String {
    println!("{}", value);
    value.trim().to_string()
}`,
    checks: [
      /language-rust/,
      /mda-syntax-attribute">#\[derive\(Debug\)\]/,
      /mda-syntax-keyword">pub/,
      /mda-syntax-builtin">str/,
      /mda-syntax-function">println!/
    ]
  },
  {
    name: "SQL",
    language: "sql",
    source: `SELECT status, COUNT(*) AS total
FROM reports
WHERE status = 'ready' AND total >= 1
GROUP BY status;`,
    checks: [
      /language-sql/,
      /mda-syntax-keyword">SELECT/,
      /mda-syntax-function">COUNT/,
      /mda-syntax-string">'ready'/,
      /mda-syntax-number">1/
    ]
  },
  {
    name: "YAML",
    language: "yaml",
    source: `name: demo
enabled: true
items:
  - &default readable
copy: *default`,
    checks: [
      /language-yaml/,
      /mda-syntax-property">name/,
      /mda-syntax-property">enabled/,
      /mda-syntax-keyword">true/,
      /mda-syntax-attribute">&amp;default/
    ]
  },
  {
    name: "Dockerfile",
    language: "dockerfile",
    source: `FROM node:24
WORKDIR /app
COPY package*.json ./
RUN npm ci
CMD ["npm", "start"]`,
    checks: [
      /language-dockerfile/,
      /mda-syntax-keyword">FROM/,
      /mda-syntax-number">24/,
      /mda-syntax-keyword">RUN/,
      /mda-syntax-string">&quot;npm&quot;/
    ]
  },
  {
    name: "PowerShell",
    language: "powershell",
    source: `param([string]$Name)
Write-Host "Hello $Name"
if ($Name -eq "demo") { return }`,
    checks: [
      /language-powershell/,
      /mda-syntax-keyword">param/,
      /mda-syntax-property">\$Name/,
      /mda-syntax-function">Write-Host/,
      /mda-syntax-operator">-eq/
    ]
  },
  {
    name: "diff",
    language: "diff",
    source: `diff --git a/guide.md b/guide.md
@@ -1,2 +1,2 @@
-old heading
+new heading`,
    checks: [
      /language-diff/,
      /mda-syntax-keyword">diff --git/,
      /mda-syntax-keyword">@@ -1,2 \+1,2 @@/,
      /mda-syntax-operator">-old heading/,
      /mda-syntax-string">\+new heading/
    ]
  }
];

for (const syntaxCase of expandedSyntaxHighlightCases) {
  test(`highlights ${syntaxCase.name} fenced code blocks`, async () => {
    const rendered = await renderMarkdown(fencedCodeBlock(syntaxCase.language, syntaxCase.source), {
      config: resolveConfig({}, { overrides: { html: { fragment: true } } })
    });

    for (const check of syntaxCase.checks) {
      assert.match(rendered.content, check);
    }
  });
}

function fencedCodeBlock(language, source) {
  return `\`\`\`${language}\n${source}\n\`\`\`\n`;
}
