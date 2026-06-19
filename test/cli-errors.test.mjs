import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCli } from "./helpers/cli.mjs";

test("cli lists and inspects built-in themes", async () => {
  const list = await runCli(["theme", "list"]);
  assert.equal(list.exitCode, 0);
  assert.match(list.stdout, /serif \(default\)/);
  assert.match(list.stdout, /technical/);

  const inspect = await runCli(["theme", "inspect", "serif"]);
  assert.equal(inspect.exitCode, 0);
  const details = JSON.parse(inspect.stdout);
  assert.equal(details.name, "serif");
  assert.equal(details.tokens["layout.maxWidth"], "1440px");
});

test("cli exposes top-level and theme help", async () => {
  const help = await runCli(["help"]);
  assert.equal(help.exitCode, 0);
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /mdalchemy book \[root\]/);
  assert.match(help.stdout, /Markdown:/);
  assert.match(help.stdout, /mdalchemy examples\/complex-spec\.md -o examples\/complex-spec\.html --toc --gfm --frontmatter/);
  assert.match(help.stdout, /mdalchemy examples\/mermaid\.md -o examples\/mermaid\.generated\.html/);
  assert.match(help.stdout, /--collapsible-toc/);
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
  assert.match(bookHelp.stdout, /--folder-structure/);
  assert.match(bookHelp.stdout, /--no-sidebar/);
  assert.match(bookHelp.stdout, /--no-search/);
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
    { args: [input, "--collapsible-toc", "--no-collapsible-toc"], message: /Use either --collapsible-toc or --no-collapsible-toc/ },
    { args: [input, "--sections", "--no-sections"], message: /Use either --sections or --no-sections/ },
    { args: [input, "--collapsible-sections", "--no-collapsible-sections"], message: /Use either --collapsible-sections or --no-collapsible-sections/ },
    { args: [input, "--no-sections", "--collapsible-sections"], message: /Use either --no-sections or --collapsible-sections/ },
    { args: ["book", dir, "--folder-structure", "--no-folder-structure"], message: /Use either --folder-structure or --no-folder-structure/ },
    { args: ["book", dir, "--sidebar", "--no-sidebar"], message: /Use either --sidebar or --no-sidebar/ },
    { args: ["book", dir, "--search", "--no-search"], message: /Use either --search or --no-search/ },
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
