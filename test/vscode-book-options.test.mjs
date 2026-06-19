import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  buildBookConfigOverrides,
  defaultBookConfigOverrides,
  defaultBookOutputPath,
  normalizeBookOutputPath,
  resolveBookNavigationPromptPlan
} from "../dist/vscode/book-options.js";
import {
  collectBookPromptSelections,
  resolveBookNavigationStylePromptCopy
} from "../dist/vscode/book-prompt-flow.js";

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

test("VS Code book options prompt for navigation details only when an outline can render", () => {
  assert.deepEqual(
    resolveBookNavigationPromptPlan({
      tocMode: "off",
      sidebar: false
    }),
    {
      outlineStyle: false,
      folderStructure: false
    }
  );

  assert.deepEqual(
    resolveBookNavigationPromptPlan({
      tocMode: "off",
      sidebar: true
    }),
    {
      outlineStyle: true,
      folderStructure: true
    }
  );

  assert.deepEqual(
    resolveBookNavigationPromptPlan({
      tocMode: "on",
      sidebar: false
    }),
    {
      outlineStyle: true,
      folderStructure: true
    }
  );

  assert.deepEqual(
    resolveBookNavigationPromptPlan({
      tocMode: "config",
      sidebar: false
    }),
    {
      outlineStyle: true,
      folderStructure: true
    }
  );
});

test("VS Code book prompt flow asks sidebar and search after hiding the table of contents", async () => {
  const calls = [];
  const selections = await collectBookPromptSelections({
    promptTheme: async () => {
      calls.push("theme");
      return "config";
    },
    promptSectionMode: async () => {
      calls.push("section");
      return "config";
    },
    promptTocMode: async () => {
      calls.push("toc");
      return "off";
    },
    promptSidebar: async (tocMode) => {
      calls.push(`sidebar:${tocMode}`);
      return false;
    },
    promptSearch: async () => {
      calls.push("search");
      return true;
    },
    promptNavigationStyle: async () => {
      calls.push("navigation-style");
      return false;
    },
    promptFolderStructure: async () => {
      calls.push("folder-structure");
      return false;
    }
  });

  assert.deepEqual(calls, ["theme", "section", "toc", "sidebar:off", "search"]);
  assert.deepEqual(selections, {
    sectionMode: "config",
    tocMode: "off",
    collapsibleToc: true,
    folderStructure: true,
    sidebar: false,
    search: true
  });
});

test("VS Code book prompt flow uses sidebar wording when TOC is hidden but sidebar is enabled", async () => {
  const calls = [];
  const selections = await collectBookPromptSelections({
    promptTheme: async () => {
      calls.push("theme");
      return "technical";
    },
    promptSectionMode: async () => {
      calls.push("section");
      return "sections";
    },
    promptTocMode: async () => {
      calls.push("toc");
      return "off";
    },
    promptSidebar: async (tocMode) => {
      calls.push(`sidebar:${tocMode}`);
      return true;
    },
    promptSearch: async () => {
      calls.push("search");
      return false;
    },
    promptNavigationStyle: async (tocMode, sidebar) => {
      calls.push(`navigation-style:${tocMode}:${sidebar}`);
      return false;
    },
    promptFolderStructure: async () => {
      calls.push("folder-structure");
      return false;
    }
  });

  assert.deepEqual(calls, [
    "theme",
    "section",
    "toc",
    "sidebar:off",
    "search",
    "navigation-style:off:true",
    "folder-structure"
  ]);
  assert.deepEqual(selections, {
    theme: "technical",
    sectionMode: "sections",
    tocMode: "off",
    collapsibleToc: false,
    folderStructure: false,
    sidebar: true,
    search: false
  });

  const copy = resolveBookNavigationStylePromptCopy("off", true);
  const sidebarCopy = [
    copy.collapsibleLabel,
    copy.expandedLabel,
    copy.title,
    copy.placeHolder
  ].join(" ");
  assert.doesNotMatch(sidebarCopy, /toc|table of contents/i);
  assert.match(sidebarCopy, /sidebar/i);
});
