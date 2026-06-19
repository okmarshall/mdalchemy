# VS Code Extension

mdalchemy can run as a VS Code extension as well as a CLI. The extension adds
commands that render Markdown through the same parser, renderer, configuration,
theme, and project-book pipeline used by the command line.

## Commands

When a Markdown file is open, run:

```text
mdalchemy: Preview HTML
```

This opens a temporary live HTML preview beside the editor. The preview renders
through the same mdalchemy pipeline as generated files, but it does not write an
HTML file to disk. As you edit the Markdown document in VS Code, mdalchemy
debounces changes and updates the preview panel. The preview title bar includes
`Save Preview HTML` for rendering the current editor state and writing the
standard sibling HTML file, near VS Code's native editor actions.

When the live preview panel is active, run:

```text
mdalchemy: Save Preview HTML
```

This renders the current Markdown state and writes it to the standard sibling
HTML path, for example `README.md -> README.html`.

To write HTML immediately without opening a temporary live preview, run:

```text
mdalchemy: Generate HTML
```

The Markdown preview and generate commands are available from:

- The Command Palette.
- The Markdown editor title menu.
- The Markdown editor context menu.
- The Explorer context menu for `.md` and `.markdown` files.

To build one recursive HTML documentation book from a folder, right-click a
folder in the Explorer and run:

```text
mdalchemy: Generate HTML Book
```

The book command is also available from the Command Palette. When launched from
the Command Palette, mdalchemy walks through a guided flow for the root folder,
theme, section rendering, table of contents behavior, sidebar, search,
navigation style, folder grouping, and output file. Navigation style and folder
grouping prompts appear only when the selected TOC/sidebar choices can use them.
When launched from the Explorer folder context menu, it uses the configured
defaults and writes the standard `mdalchemy-book.html` file immediately.

## File Behavior

`mdalchemy: Generate HTML`:

1. Reads the active Markdown document, including unsaved editor changes.
2. Loads `mdalchemy.config.json` or `.mdalchemyrc.json` from the workspace root
   when present.
3. Enables the supported GFM bundle and frontmatter parsing by default, matching
   common README expectations.
4. Renders standalone HTML using the configured theme.
5. Writes a sibling HTML file next to the Markdown file.
6. Opens the rendered output in a VS Code webview panel beside the editor.

For example:

```text
docs/architecture.md -> docs/architecture.html
README.md -> README.html
```

The generated file is a normal standalone HTML artifact and can be opened outside
VS Code as well.

`mdalchemy: Preview HTML` follows the same render steps, but keeps the generated
HTML in the webview only. It watches the open editor for Markdown changes and
the workspace-root `mdalchemy.config.json` / `.mdalchemyrc.json` files for config
changes. The preview title-bar `Save Preview HTML` action renders the current
editor state, updates the preview, and persists that HTML to disk.

## Book Behavior

`mdalchemy: Generate HTML Book`:

1. Recursively discovers `.md` and `.markdown` files in the selected folder.
2. Applies the configured `book.include` and `book.exclude` settings.
3. Honors leading frontmatter opt-out metadata:

   ```yaml
   ---
   mdalchemy:
     include: false
   ---
   ```

4. Enables the supported GFM bundle and frontmatter parsing by default.
5. Rewrites included cross-file Markdown links into same-page HTML anchors.
6. Writes `mdalchemy-book.html` inside the selected folder.
7. Opens the generated book in a VS Code webview.

From the Command Palette, the generated file path and selected render options
come from the guided prompts. Any prompt left on `Config/default` inherits
`mdalchemy.config.json` or `.mdalchemyrc.json`, with mdalchemy's built-in
defaults used when no config value exists. The guided flow also lets readers
choose whether to include the generated sidebar and book search. When an inline
TOC or sidebar will be rendered, the flow also asks whether navigation should be
collapsible or expanded and whether file entries should be grouped by folder.
VS Code book generation defaults to collapsible navigation controls,
folder-structure navigation groups, the sidebar, and local search so large
project books stay easier to scan without changing the main document body.

The generated book is the same kind of standalone HTML artifact produced by:

```sh
mdalchemy book . -o mdalchemy-book.html
```

## Webview Preview

The preview uses VS Code's webview API. Local image references are rewritten for
the webview so relative images inside the workspace can render in the preview.
The written HTML file keeps normal relative paths, so it remains portable as an
ordinary HTML document.

The preview webview enables scripts only so mdalchemy's first-party document
shortcut controls and bundled Mermaid renderer can run. The extension injects a
restrictive content security policy with a nonce for those generated scripts, so
user-authored raw scripts remain blocked in the in-editor view. Mermaid fenced
blocks render from mdalchemy's local pinned runtime and keep a readable source
fallback if a diagram cannot be parsed. The underlying rendered HTML still
follows the configured mdalchemy raw HTML policy. Use the existing
`html.rawHtml` and `html.safeUrls` config options for untrusted content.

## Development

From a clone:

```sh
npm install
npm run build
```

Open the repository in VS Code and run the `Run mdalchemy Extension` launch
configuration. In the Extension Development Host, open a Markdown file and run
`mdalchemy: Preview HTML` or `mdalchemy: Generate HTML`, or right-click a folder and run
`mdalchemy: Generate HTML Book`.

The VS Code extension entry point is `src/vscode/extension.ts`. The package
manifest points VS Code at `dist/vscode/extension.js`, while the npm library API
continues to resolve through the package `exports` map.

## Packaging

Build a local VSIX with:

```sh
vsce package
```

VSCE runs `npm run vscode:prepublish`, so the TypeScript output is rebuilt
before packaging. The extension uses the `files` allowlist in `package.json` as
the single packaging strategy for both npm and VSIX output. Do not add a
`.vscodeignore` file unless the `files` allowlist is removed first; VSCE rejects
packages that combine both strategies.
