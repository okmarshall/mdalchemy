import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const npm = "npm";
const binName = process.platform === "win32" ? "mdalchemy.cmd" : "mdalchemy";
const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const workDir = await mkdtemp(path.join(tmpdir(), "mdalchemy-install-smoke-"));
const smokeEnv = {
  ...process.env,
  npm_config_cache: path.join(workDir, "npm-cache")
};

try {
  const packDir = path.join(workDir, "pack");
  const projectDir = path.join(workDir, "project");
  await mkdir(packDir);
  await mkdir(projectDir);

  const { stdout: packStdout } = await runCommand(npm, ["pack", "--json", "--ignore-scripts", repoRoot], {
    cwd: packDir,
    env: smokeEnv,
    maxBuffer: 1024 * 1024 * 10
  });
  const packed = JSON.parse(packStdout);
  assert.equal(Array.isArray(packed), true);
  assert.equal(packed.length, 1);

  const tarballPath = path.join(packDir, packed[0].filename);
  await writeFile(path.join(projectDir, "package.json"), JSON.stringify({
    private: true,
    type: "module"
  }), "utf8");

  await runCommand(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath], {
    cwd: projectDir,
    env: smokeEnv,
    maxBuffer: 1024 * 1024 * 10
  });

  const binPath = path.join(projectDir, "node_modules", ".bin", binName);
  const { stdout: versionStdout } = await runCommand(binPath, ["--version"], {
    cwd: projectDir
  });
  assert.equal(versionStdout.trim(), packageJson.version);

  const { stdout: helpStdout } = await runCommand(binPath, ["help"], {
    cwd: projectDir
  });
  assert.match(helpStdout, /mdalchemy <input\.md>/);
  assert.match(helpStdout, /mdalchemy book \[root\]/);

  await writeFile(path.join(projectDir, "README.md"), [
    "# Install Smoke",
    "",
    "| Feature | Status |",
    "| --- | --- |",
    "| Packed binary | Works |",
    "",
    "```csharp",
    "public sealed class SmokeTest { }",
    "```",
    ""
  ].join("\n"), "utf8");

  await runCommand(binPath, ["README.md", "-o", "README.html", "--gfm", "--toc"], {
    cwd: projectDir,
    maxBuffer: 1024 * 1024 * 10
  });
  const renderedHtml = await readFile(path.join(projectDir, "README.html"), "utf8");
  assert.match(renderedHtml, /<!doctype html>/i);
  assert.match(renderedHtml, /<table>/);
  assert.match(renderedHtml, /SmokeTest/);

  await writeFile(path.join(projectDir, "guide.md"), [
    "# Guide",
    "",
    "Return to the [README](README.md#install-smoke).",
    ""
  ].join("\n"), "utf8");

  await runCommand(binPath, ["book", ".", "-o", "book.html"], {
    cwd: projectDir,
    maxBuffer: 1024 * 1024 * 10
  });
  const bookHtml = await readFile(path.join(projectDir, "book.html"), "utf8");
  assert.match(bookHtml, /Documentation/);
  assert.match(bookHtml, /href="#install-smoke"/);
} finally {
  await rm(workDir, { recursive: true, force: true });
}

function runCommand(command, args, options = {}) {
  return execFileAsync(command, args, {
    ...options,
    shell: process.platform === "win32",
    windowsHide: true
  });
}
