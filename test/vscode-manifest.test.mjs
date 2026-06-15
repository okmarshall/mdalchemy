import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("VS Code manifest contributes polished file and folder commands", async () => {
  const commands = new Map(packageJson.contributes.commands.map((command) => [command.command, command]));
  assert.equal(commands.get("mdalchemy.renderMarkdownToHtml")?.title, "Generate HTML");
  assert.equal(commands.get("mdalchemy.renderFolderToBook")?.title, "Generate HTML Book");

  const explorerMenu = packageJson.contributes.menus["explorer/context"];
  assert.equal(
    explorerMenu.some((item) =>
      item.command === "mdalchemy.renderFolderToBook"
      && item.when === "explorerResourceIsFolder"
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
