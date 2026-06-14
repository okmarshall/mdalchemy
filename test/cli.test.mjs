import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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
