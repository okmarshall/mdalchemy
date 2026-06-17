import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execCli, runCli } from "./helpers/cli.mjs";

test("cli renders an input markdown file to html", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "input.md");
  const output = path.join(dir, "output.html");
  await writeFile(input, "# CLI Title\n\nRendered by the CLI.\n", "utf8");

  const result = await execCli([input, "-o", output]);
  const html = await readFile(output, "utf8");

  assert.match(result.stderr, /wrote/);
  assert.match(html, /CLI Title/);
  assert.match(html, /Rendered by the CLI/);
});

test("cli enables GFM table rendering with --gfm", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "table.md");
  const output = path.join(dir, "table.html");
  await writeFile(input, "| A | B |\n| --- | ---: |\n| one | two |\n", "utf8");

  await execCli([input, "-o", output, "--gfm"]);
  const html = await readFile(output, "utf8");

  assert.match(html, /<table>/);
  assert.match(html, /<td style="text-align: right">two<\/td>/);
});

test("cli enables supported GFM extensions and frontmatter parsing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "extensions.md");
  const output = path.join(dir, "extensions.html");
  await writeFile(input, `---
title: Hidden Metadata
---

- [x] Finished task
- [ ] Pending task with ~~old text~~

Literal link: https://example.com/docs.

Raw HTML: <title>Filtered</title>.

Footnote reference.[^demo]

[^demo]: Footnote body.
`, "utf8");

  await execCli([input, "-o", output, "--gfm", "--frontmatter"]);
  const html = await readFile(output, "utf8");

  assert.doesNotMatch(html, /Hidden Metadata/);
  assert.match(html, /class="mda-task-list"/);
  assert.match(html, /type="checkbox" disabled checked/);
  assert.match(html, /<del>old text<\/del>/);
  assert.match(html, /href="https:\/\/example.com\/docs"/);
  assert.match(html, /&lt;title>Filtered&lt;\/title>/);
  assert.match(html, /class="mda-footnotes"/);
});

test("cli writes fragment output to stdout", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "fragment.md");
  await writeFile(input, "# Fragment Title\n\nFragment body.\n", "utf8");

  const result = await runCli([input, "--stdout", "--fragment"]);

  assert.equal(result.exitCode, 0);
  assert.doesNotMatch(result.stdout, /<!doctype html>/);
  assert.match(result.stdout, /<h1 id="fragment-title">/);
  assert.match(result.stdout, /Fragment body/);
});

test("cli enables and disables heading-derived section wrappers", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "sections.md");
  const config = path.join(dir, "mdalchemy.config.json");
  await writeFile(input, "# Overview\n\nIntro text.\n\n## Details\n\nMore text.\n", "utf8");

  const enabled = await runCli([input, "--stdout", "--fragment", "--sections"]);

  assert.equal(enabled.exitCode, 0);
  assert.match(enabled.stdout, /<section class="mda-section mda-section-level-1" aria-labelledby="overview">/);
  assert.match(enabled.stdout, /<section class="mda-section mda-section-level-2" aria-labelledby="details">/);

  const collapsible = await runCli([input, "--stdout", "--fragment", "--collapsible-sections"]);

  assert.equal(collapsible.exitCode, 0);
  assert.match(collapsible.stdout, /mda-section-collapsible/);
  assert.match(collapsible.stdout, /<details class="mda-section-details" open>/);
  assert.match(collapsible.stdout, /<summary class="mda-section-summary">/);

  await writeFile(config, JSON.stringify({ html: { sections: true, collapsibleSections: true } }), "utf8");
  const staticSections = await runCli([input, "--stdout", "--fragment", "--config", config, "--no-collapsible-sections"]);

  assert.equal(staticSections.exitCode, 0);
  assert.match(staticSections.stdout, /<section class="mda-section mda-section-level-1" aria-labelledby="overview">/);
  assert.doesNotMatch(staticSections.stdout, /mda-section-collapsible/);

  const disabled = await runCli([input, "--stdout", "--fragment", "--config", config, "--no-sections"]);

  assert.equal(disabled.exitCode, 0);
  assert.doesNotMatch(disabled.stdout, /class="mda-section/);
  assert.match(disabled.stdout, /<h1 id="overview">/);
});

test("cli safe mode escapes raw html and omits unsafe links", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "safe.md");
  await writeFile(input, `<script>alert("x")</script>\n\n[bad](javascript:alert(1))\n`, "utf8");

  const result = await runCli([input, "--stdout", "--fragment", "--safe"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /&lt;script&gt;/);
  assert.doesNotMatch(result.stdout, /<script>/);
  assert.doesNotMatch(result.stdout, /javascript:/);
  assert.match(result.stderr, /MDA_HTML_UNSAFE_URL/);
});
