import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runCli(args) {
  try {
    const result = await execFileAsync("node", ["dist/cli/main.js", ...args]);
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      exitCode: typeof error.code === "number" ? error.code : 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? ""
    };
  }
}

test("cli renders an input markdown file to html", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "input.md");
  const output = path.join(dir, "output.html");
  await writeFile(input, "# CLI Title\n\nRendered by the CLI.\n", "utf8");

  const result = await execFileAsync("node", ["dist/cli/main.js", input, "-o", output]);
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

  await execFileAsync("node", ["dist/cli/main.js", input, "-o", output, "--gfm"]);
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

  await execFileAsync("node", ["dist/cli/main.js", input, "-o", output, "--gfm", "--frontmatter"]);
  const html = await readFile(output, "utf8");

  assert.doesNotMatch(html, /Hidden Metadata/);
  assert.match(html, /class="mda-task-list"/);
  assert.match(html, /type="checkbox" disabled checked/);
  assert.match(html, /<del>old text<\/del>/);
  assert.match(html, /href="https:\/\/example.com\/docs"/);
  assert.match(html, /&lt;title>Filtered&lt;\/title>/);
  assert.match(html, /class="mda-footnotes"/);
});

test("cli lists and inspects built-in themes", async () => {
  const list = await runCli(["theme", "list"]);
  assert.equal(list.exitCode, 0);
  assert.match(list.stdout, /serif \(default\)/);
  assert.match(list.stdout, /technical/);

  const inspect = await runCli(["theme", "inspect", "serif"]);
  assert.equal(inspect.exitCode, 0);
  const details = JSON.parse(inspect.stdout);
  assert.equal(details.name, "serif");
  assert.equal(details.tokens["layout.maxWidth"], "960px");
});

test("cli exposes top-level and theme help", async () => {
  const help = await runCli(["help"]);
  assert.equal(help.exitCode, 0);
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /mdalchemy book \[root\]/);
  assert.match(help.stdout, /Markdown:/);
  assert.match(help.stdout, /Safety and diagnostics:/);

  const noisyHelp = await runCli(["--help", "--stdout", "-o", "ignored.html", "--format", "pdf"]);
  assert.equal(noisyHelp.exitCode, 0);
  assert.match(noisyHelp.stdout, /Usage:/);

  const themeHelp = await runCli(["help", "theme"]);
  assert.equal(themeHelp.exitCode, 0);
  assert.match(themeHelp.stdout, /mdalchemy theme list/);
  assert.match(themeHelp.stdout, /mdalchemy theme inspect/);

  const bookHelp = await runCli(["help", "book"]);
  assert.equal(bookHelp.exitCode, 0);
  assert.match(bookHelp.stdout, /mdalchemy book \[root\]/);
  assert.match(bookHelp.stdout, /--include <pattern>/);
});

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
  const result = await runCli(["book", dir, "-o", output, "--title", "Project Book", "--collapsible-sections"]);
  const html = await readFile(output, "utf8");

  assert.equal(result.exitCode, 0);
  assert.match(result.stderr, /wrote/);
  assert.match(result.stderr, /\(2 files\)/);
  assert.match(html, /Project Book/);
  assert.match(html, /Root Project/);
  assert.match(html, /Guide Doc/);
  assert.match(html, /Usage/);
  assert.doesNotMatch(html, /Secret Internal Draft/);
  assert.doesNotMatch(html, /Dependency Docs/);
  assert.match(html, /href="#usage"/);
  assert.match(html, /href="#root-project"/);
  assert.match(html, /src="..\/docs\/assets\/diagram.svg"/);
  assert.match(html, /mda-section-collapsible/);
  assert.match(html, /Root footnote/);
  assert.match(html, /Guide footnote/);
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

test("cli returns usage error when output path matches input path", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "same.md");
  await writeFile(input, "# Same\n", "utf8");

  const result = await runCli([input, "-o", input]);

  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /output path must not be the same as input path/);
});

test("cli returns config error for invalid config files", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "input.md");
  const config = path.join(dir, "mdalchemy.config.json");
  await writeFile(input, "# Config\n", "utf8");
  await writeFile(config, JSON.stringify({ html: { tocDepth: "deep" } }), "utf8");

  const result = await runCli([input, "--config", config, "--stdout"]);

  assert.equal(result.exitCode, 4);
  assert.match(result.stderr, /MDA_CONFIG_INVALID_TYPE/);
});

test("cli returns usage errors for invalid argument combinations", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "input.md");
  await writeFile(input, "# Usage\n", "utf8");

  const cases = [
    { args: ["--badflag"], message: /Unknown option '--badflag'/ },
    { args: [input, "extra.md"], message: /Unexpected argument "extra.md"/ },
    { args: [input, "--stdout", "-o", path.join(dir, "out.html")], message: /Use either --stdout or --output/ },
    { args: [input, "--toc", "--no-toc"], message: /Use either --toc or --no-toc/ },
    { args: [input, "--sections", "--no-sections"], message: /Use either --sections or --no-sections/ },
    { args: [input, "--collapsible-sections", "--no-collapsible-sections"], message: /Use either --collapsible-sections or --no-collapsible-sections/ },
    { args: [input, "--no-sections", "--collapsible-sections"], message: /Use either --no-sections or --collapsible-sections/ },
    { args: ["theme", "list", "serif"], message: /theme list does not accept arguments/ }
  ];

  for (const testCase of cases) {
    const result = await runCli(testCase.args);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, testCase.message);
    assert.match(result.stderr, /Usage:/);
  }
});

test("cli returns specific exit codes for input, theme, and output failures", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "input.md");
  await writeFile(input, "# Failures\n", "utf8");

  const missingInput = await runCli([path.join(dir, "missing.md"), "--stdout"]);
  assert.equal(missingInput.exitCode, 3);
  assert.match(missingInput.stderr, /ENOENT/);

  const badTheme = await runCli([input, "--theme", path.join(dir, "missing-theme.json"), "--stdout"]);
  assert.equal(badTheme.exitCode, 5);
  assert.match(badTheme.stderr, /MDA_THEME_LOAD_FAILED/);

  const badOutput = await runCli([input, "-o", path.join(dir, "missing", "out.html")]);
  assert.equal(badOutput.exitCode, 7);
  assert.match(badOutput.stderr, /ENOENT/);
});

test("cli strict mode treats warnings as errors", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-"));
  const input = path.join(dir, "input.md");
  const theme = path.join(dir, "theme.json");
  await writeFile(input, "# Strict\n", "utf8");
  await writeFile(theme, JSON.stringify({
    name: "strict-theme",
    tokens: {
      "unknown.token": "value"
    }
  }), "utf8");

  const result = await runCli([input, "--theme", theme, "--strict", "--stdout"]);

  assert.equal(result.exitCode, 6);
  assert.match(result.stderr, /MDA_THEME_UNKNOWN_TOKEN/);
});
