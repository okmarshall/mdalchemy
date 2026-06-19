import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";

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

test("renders Mermaid fences as diagram-ready HTML with escaped source", async () => {
  const markdown = "```mermaid\ngraph TD\n  A[Start] --> B{\"Ship <safe> HTML?\"}\n```\n";
  const config = resolveConfig({}, { overrides: { html: { fragment: true } } });
  const rendered = await renderMarkdown(markdown, { config });
  const alias = await renderMarkdown("```mmd\nsequenceDiagram\n  A->>B: Works\n```\n", { config });

  assert.match(rendered.content, /<figure class="mda-mermaid" data-mda-mermaid role="region" aria-label="Mermaid diagram" tabindex="0">/);
  assert.match(rendered.content, /<div class="mda-mermaid-canvas" data-mda-mermaid-canvas><\/div>/);
  assert.match(rendered.content, /<pre class="mermaid" data-mda-mermaid-source>graph TD\n  A\[Start\] --&gt; B\{&quot;Ship &lt;safe&gt; HTML\?&quot;\}<\/pre>/);
  assert.doesNotMatch(rendered.content, /data-language="mermaid"/);
  assert.doesNotMatch(rendered.content, /language-mermaid/);
  assert.match(alias.content, /<figure class="mda-mermaid" data-mda-mermaid/);
  assert.doesNotMatch(alias.content, /language-mmd/);
});

test("preserves Mermaid fences as code in CommonMark-compatible output", async () => {
  const markdown = "```mermaid\ngraph TD\n  A --> B\n```\n";
  const config = resolveConfig({}, {
    overrides: {
      html: {
        fragment: true,
        headingAnchors: false
      }
    }
  });
  const rendered = await renderMarkdown(markdown, { config, commonmarkCompatible: true });

  assert.equal(rendered.content, "<pre><code class=\"language-mermaid\">graph TD\n  A --&gt; B\n</code></pre>");
});

test("highlights C# fenced code blocks", async () => {
  const markdown = "```csharp\n[Fact(DisplayName = \"renders records\")]\npublic sealed record Demo(string Value)\n{\n    public string Render() => Value.Trim();\n}\n```\n";
  const rendered = await renderMarkdown(markdown, {
    config: resolveConfig({}, { overrides: { html: { fragment: true } } })
  });

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
