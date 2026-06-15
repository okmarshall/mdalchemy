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

test("config loader accepts version 1 and rejects unsupported config versions", async () => {
  const supportedDir = await mkdtemp(path.join(tmpdir(), "mdalchemy-config-"));
  await writeFile(path.join(supportedDir, "mdalchemy.config.json"), JSON.stringify({
    version: 1
  }), "utf8");

  const supported = await loadConfig({ cwd: supportedDir });

  assert.equal(supported.config.version, 1);
  assert.equal(supported.diagnostics.some((diagnostic) => diagnostic.code === "MDA_CONFIG_UNSUPPORTED_VERSION"), false);

  const unsupportedDir = await mkdtemp(path.join(tmpdir(), "mdalchemy-config-"));
  await writeFile(path.join(unsupportedDir, "mdalchemy.config.json"), JSON.stringify({
    version: 2
  }), "utf8");

  const unsupported = await loadConfig({ cwd: unsupportedDir });

  assert.equal(unsupported.diagnostics.some((diagnostic) => (
    diagnostic.code === "MDA_CONFIG_UNSUPPORTED_VERSION"
    && diagnostic.message.includes("version 1")
  )), true);
});

test("config loader validates and resolves collapsible section settings", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-config-"));
  const configPath = path.join(dir, "mdalchemy.config.json");
  await writeFile(configPath, JSON.stringify({
    html: {
      collapsibleSections: "yes"
    }
  }), "utf8");

  const result = await loadConfig({ cwd: dir });

  assert.equal(result.diagnostics.some((diagnostic) => (
    diagnostic.code === "MDA_CONFIG_INVALID_TYPE"
    && diagnostic.message.includes("html.collapsibleSections")
  )), true);

  const config = resolveConfig({
    html: {
      collapsibleSections: true
    }
  });

  assert.equal(config.html.collapsibleSections, true);
  assert.equal(config.html.sections, true);
});

test("config loader validates and resolves book discovery settings", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mdalchemy-config-"));
  const configPath = path.join(dir, "mdalchemy.config.json");
  await writeFile(configPath, JSON.stringify({
    book: {
      include: "**/*.md",
      exclude: [123]
    }
  }), "utf8");

  const result = await loadConfig({ cwd: dir });

  assert.equal(result.diagnostics.some((diagnostic) => (
    diagnostic.code === "MDA_CONFIG_INVALID_TYPE"
    && diagnostic.message.includes("book.include")
  )), true);
  assert.equal(result.diagnostics.some((diagnostic) => (
    diagnostic.code === "MDA_CONFIG_INVALID_TYPE"
    && diagnostic.message.includes("book.exclude")
  )), true);

  const config = resolveConfig({
    book: {
      include: ["docs/**/*.md"],
      exclude: ["docs/private/**"]
    }
  });

  assert.deepEqual(config.book.include, ["docs/**/*.md"]);
  assert.equal(config.book.exclude.includes("node_modules/**"), true);
  assert.equal(config.book.exclude.includes("docs/private/**"), true);
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
        "gfm-tagfilter",
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
