import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCli } from "./helpers/cli.mjs";

test("cli builds a project documentation book from a markdown tree", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-book-"));
  const docsDir = path.join(dir, "docs");
  const assetsDir = path.join(docsDir, "assets");
  const outputDir = path.join(dir, "out");
  await mkdir(assetsDir, { recursive: true });
  await mkdir(outputDir);
  await mkdir(path.join(dir, "node_modules"), { recursive: true });

  await writeFile(path.join(dir, "README.md"), `# Root Project

See the [guide](docs/guide.md#usage) and the generated diagram.

![Diagram](docs/assets/diagram.svg)

Root note.[^1]

[^1]: Root footnote.
`, "utf8");
  await writeFile(path.join(docsDir, "guide.md"), `---
title: Guide Doc
---

# Guide Doc

## Usage

Return to the [root readme](../README.md).

Guide note.[^1]

[^1]: Guide footnote.
`, "utf8");
  await writeFile(path.join(docsDir, "skip.md"), `---
mdalchemy:
  include: false
---

# Secret Internal Draft
`, "utf8");
  await writeFile(path.join(dir, "node_modules", "ignored.md"), "# Dependency Docs\n", "utf8");
  await writeFile(path.join(assetsDir, "diagram.svg"), "<svg></svg>\n", "utf8");

  const output = path.join(outputDir, "book.html");
  const result = await runCli(["book", dir, "-o", output, "--title", "Project Book", "--toc", "--collapsible-toc", "--collapsible-sections"]);
  const html = await readFile(output, "utf8");

  assert.equal(result.exitCode, 0);
  assert.match(result.stderr, /wrote/);
  assert.match(result.stderr, /\(2 files\)/);
  assert.match(html, /<body class="mda-book-layout">/);
  assert.match(html, /<aside class="mda-book-sidebar" aria-label="Book navigation">/);
  assert.match(html, /<a class="mda-book-sidebar-title" href="#top">Project Book<\/a>/);
  assert.match(html, /<div class="mda-book-search" role="search" data-mda-book-search>/);
  assert.match(html, /<input class="mda-book-search-input" id="mda-book-search-input" type="search"/);
  assert.match(html, /<script data-mda-book-search-script>/);
  assert.match(html, /document\.querySelectorAll\("\.mda-content h1\[id\]/);
  assert.match(html, /Project Book/);
  assert.match(html, /Root Project/);
  assert.match(html, /Guide Doc/);
  assert.match(html, /Usage/);
  assert.doesNotMatch(html, /Secret Internal Draft/);
  assert.doesNotMatch(html, /Dependency Docs/);
  assert.match(html, /href="#usage"/);
  assert.match(html, /href="#root-project"/);
  assert.match(html, /src="..\/docs\/assets\/diagram.svg"/);
  assert.match(html, /<a href="#project-book">Project Book<\/a>/);
  assert.match(html, /<details class="mda-toc-details"><summary class="mda-toc-summary"><span class="mda-toc-label">docs<\/span><\/summary>/);
  assert.match(html, /<a href="#guide-doc">Guide Doc<\/a>/);
  assert.doesNotMatch(html, /<h2 id="docs">docs<\/h2>/);
  assert.match(html, /<a class="mda-floating-action mda-back-to-top" href="#top">Go to top<\/a>/);
  assert.match(html, /data-mda-collapse-all>Collapse all<\/button>/);
  assert.match(html, /data-mda-expand-all>Expand all<\/button>/);
  assert.match(html, /mda-section-collapsible/);
  assert.match(html, /Root footnote/);
  assert.match(html, /Guide footnote/);

  const flat = await runCli(["book", dir, "--stdout", "--fragment", "--title", "Project Book", "--no-folder-structure"]);

  assert.equal(flat.exitCode, 0);
  assert.doesNotMatch(flat.stdout, /mda-book-sidebar/);
  assert.doesNotMatch(flat.stdout, /data-mda-book-search-script/);
  assert.doesNotMatch(flat.stdout, /<span class="mda-toc-label">docs<\/span>/);
  assert.match(flat.stdout, /<h2 id="guide-doc">/);

  const searchWithoutSidebar = await runCli(["book", dir, "--stdout", "--title", "Project Book", "--no-sidebar"]);

  assert.equal(searchWithoutSidebar.exitCode, 0);
  assert.doesNotMatch(searchWithoutSidebar.stdout, /<body class="mda-book-layout">/);
  assert.doesNotMatch(searchWithoutSidebar.stdout, /<aside class="mda-book-sidebar"/);
  assert.match(searchWithoutSidebar.stdout, /<section class="mda-book-search-panel" aria-label="Book search">/);
  assert.match(searchWithoutSidebar.stdout, /<script data-mda-book-search-script>/);

  const withoutBookChrome = await runCli(["book", dir, "--stdout", "--title", "Project Book", "--no-sidebar", "--no-search"]);

  assert.equal(withoutBookChrome.exitCode, 0);
  assert.doesNotMatch(withoutBookChrome.stdout, /<body class="mda-book-layout">/);
  assert.doesNotMatch(withoutBookChrome.stdout, /<aside class="mda-book-sidebar"/);
  assert.doesNotMatch(withoutBookChrome.stdout, /<div class="mda-book-search" role="search"/);
  assert.doesNotMatch(withoutBookChrome.stdout, /data-mda-book-search-script/);
});
