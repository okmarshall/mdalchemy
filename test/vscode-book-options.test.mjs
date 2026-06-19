import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  buildBookConfigOverrides,
  defaultBookConfigOverrides,
  defaultBookOutputPath,
  normalizeBookOutputPath
} from "../dist/vscode/book-options.js";

test("VS Code book options resolve default and prompted output paths", () => {
  const rootPath = path.resolve("/workspace/project");
  assert.equal(defaultBookOutputPath(rootPath), path.join(rootPath, "mdalchemy-book.html"));
  assert.equal(normalizeBookOutputPath(rootPath, "docs"), path.join(rootPath, "docs.html"));
  assert.equal(normalizeBookOutputPath(rootPath, "docs/book.htm"), path.join(rootPath, "docs/book.htm"));
  assert.equal(normalizeBookOutputPath(rootPath, path.join(rootPath, "out.html")), path.join(rootPath, "out.html"));
  assert.throws(() => normalizeBookOutputPath(rootPath, "book.pdf"), /only generate .html or .htm/);
});

test("VS Code book options default to collapsible TOCs and folder structure", () => {
  assert.deepEqual(defaultBookConfigOverrides(), {
    html: {
      collapsibleTableOfContents: true
    },
    book: {
      folderStructure: true,
      sidebar: true,
      search: true
    }
  });
});

test("VS Code book options map prompt selections to config overrides", () => {
  assert.deepEqual(
    buildBookConfigOverrides({
      sectionMode: "config",
      tocMode: "config",
      collapsibleToc: true,
      folderStructure: true,
      sidebar: true,
      search: true
    }),
    {
      html: {
        collapsibleTableOfContents: true
      },
      book: {
        folderStructure: true,
        sidebar: true,
        search: true
      }
    }
  );

  assert.deepEqual(
    buildBookConfigOverrides({
      theme: "technical",
      sectionMode: "collapsible",
      tocMode: "on",
      collapsibleToc: true,
      folderStructure: true,
      sidebar: true,
      search: true
    }),
    {
      theme: "technical",
      html: {
        tableOfContents: true,
        collapsibleTableOfContents: true,
        sections: true,
        collapsibleSections: true
      },
      book: {
        folderStructure: true,
        sidebar: true,
        search: true
      }
    }
  );

  assert.deepEqual(
    buildBookConfigOverrides({
      sectionMode: "none",
      tocMode: "off",
      collapsibleToc: false,
      folderStructure: false,
      sidebar: false,
      search: false
    }),
    {
      html: {
        tableOfContents: false,
        collapsibleTableOfContents: false,
        sections: false,
        collapsibleSections: false
      },
      book: {
        folderStructure: false,
        sidebar: false,
        search: false
      }
    }
  );
});
