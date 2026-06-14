import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
