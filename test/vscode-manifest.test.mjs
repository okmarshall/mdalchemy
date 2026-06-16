import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("VS Code manifest describes the extension experience", () => {
  assert.match(packageJson.description, /Preview and generate polished HTML from Markdown in VS Code/);
  assert.deepEqual(packageJson.galleryBanner, {
    color: "#111923",
    theme: "dark"
  });
  assert.equal(packageJson.categories.includes("Visualization"), true);
  assert.equal(packageJson.categories.includes("Formatters"), true);
  assert.equal(packageJson.keywords.includes("markdown-preview"), true);
  assert.equal(packageJson.keywords.includes("html-preview"), true);
  assert.equal(packageJson.keywords.includes("vscode"), true);
});

test("VS Code manifest contributes polished file and folder commands", async () => {
  const commands = new Map(packageJson.contributes.commands.map((command) => [command.command, command]));
  assert.equal(commands.get("mdalchemy.previewMarkdownHtml")?.title, "Preview HTML");
  assert.equal(commands.get("mdalchemy.renderMarkdownToHtml")?.title, "Generate HTML");
  assert.equal(commands.get("mdalchemy.savePreviewHtml")?.title, "Save Preview HTML");
  assert.equal(commands.get("mdalchemy.renderFolderToBook")?.title, "Generate HTML Book");
  assert.notDeepEqual(
    commands.get("mdalchemy.previewMarkdownHtml")?.icon,
    commands.get("mdalchemy.renderMarkdownToHtml")?.icon
  );

  const editorTitleMenu = packageJson.contributes.menus["editor/title"];
  assert.equal(
    editorTitleMenu.some((item) =>
      item.command === "mdalchemy.previewMarkdownHtml"
      && item.when === "resourceLangId == markdown"
    ),
    true
  );

  const explorerMenu = packageJson.contributes.menus["explorer/context"];
  assert.equal(
    explorerMenu.some((item) =>
      item.command === "mdalchemy.previewMarkdownHtml"
      && item.when === "resourceExtname == .md || resourceExtname == .markdown"
    ),
    true
  );
  assert.equal(
    explorerMenu.some((item) =>
      item.command === "mdalchemy.renderFolderToBook"
      && item.when === "explorerResourceIsFolder"
    ),
    true
  );
  assert.equal(
    editorTitleMenu.some((item) =>
      item.command === "mdalchemy.savePreviewHtml"
      && item.when === "activeWebviewPanelId == 'mdalchemyLivePreview'"
    ),
    true
  );
  assert.equal(packageJson.files.includes("media"), true);

  for (const command of commands.values()) {
    for (const iconPath of Object.values(command.icon ?? {})) {
      await access(new URL(`../${iconPath.replace(/^\.\//, "")}`, import.meta.url));
    }
  }
});
