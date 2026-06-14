import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadConfig, resolveConfig } from "../dist/config/config-loader.js";

test("config loader warns for unknown keys and preserves valid values", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-config-"));
  const configPath = path.join(dir, "mdalchemy.config.json");
  await writeFile(configPath, JSON.stringify({
    mystery: true,
    html: {
      fragment: true,
      unexpected: "value"
    }
  }), "utf8");

  const result = await loadConfig({ cwd: dir });

  assert.equal(result.config.html.fragment, true);
  assert.equal(result.diagnostics.filter((diagnostic) => diagnostic.code === "MDA_CONFIG_UNKNOWN_KEY").length, 2);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.severity === "error"), false);
});

test("config loader reports invalid config value types without crashing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-config-"));
  const configPath = path.join(dir, "mdalchemy.config.json");
  await writeFile(configPath, JSON.stringify({
    output: "html",
    markdown: {
      extensions: "gfm-table"
    },
    html: {
      safeUrls: "yes"
    }
  }), "utf8");

  const result = await loadConfig({ cwd: dir });

  assert.equal(result.config.markdown.extensions.length, 0);
  assert.equal(result.config.html.safeUrls, true);
  assert.equal(result.diagnostics.filter((diagnostic) => diagnostic.code === "MDA_CONFIG_INVALID_TYPE").length, 3);
});

test("config loader reports unsupported but well-typed extension names", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-config-"));
  const configPath = path.join(dir, "mdalchemy.config.json");
  await writeFile(configPath, JSON.stringify({
    markdown: {
      extensions: ["gfm-table", "task-list"]
    }
  }), "utf8");

  const result = await loadConfig({ cwd: dir });

  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "MDA_MARKDOWN_UNSUPPORTED_EXTENSION"), true);
});

test("config loader accepts the implemented extension names", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-config-"));
  const configPath = path.join(dir, "mdalchemy.config.json");
  await writeFile(configPath, JSON.stringify({
    markdown: {
      extensions: [
        "gfm-table",
        "gfm-task-list",
        "gfm-strikethrough",
        "gfm-footnote",
        "gfm-literal-autolink",
        "frontmatter"
      ]
    }
  }), "utf8");

  const result = await loadConfig({ cwd: dir });

  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "MDA_MARKDOWN_UNSUPPORTED_EXTENSION"), false);
});

test("config markdown extension overrides are additive", () => {
  const config = resolveConfig({
    markdown: {
      extensions: ["frontmatter"]
    }
  }, {
    overrides: {
      markdown: {
        profile: "commonmark",
        extensions: ["gfm-table"]
      }
    }
  });

  assert.deepEqual(config.markdown.extensions, ["frontmatter", "gfm-table"]);
});
