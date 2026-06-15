# VS Code Extension

mdalchemy can run as a VS Code extension as well as a CLI. The extension adds
commands that render Markdown through the same parser, renderer, configuration,
theme, and project-book pipeline used by the command line.

## Commands

When a Markdown file is open, run:

```text
mdalchemy: Generate HTML
```

This command is available from:

- The Command Palette.
- The Markdown editor title menu.
- The Markdown editor context menu.
- The Explorer context menu for `.md` and `.markdown` files.

To build one recursive HTML documentation book from a folder, right-click a
folder in the Explorer and run:

```text
mdalchemy: Generate HTML Book
```

The book command is also available from the Command Palette. When no Explorer
folder is supplied, it uses the open workspace folder, prompts in multi-root
workspaces, or falls back to the active file's folder outside a workspace.

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

The generated book is the same kind of standalone HTML artifact produced by:

```sh
mdalchemy book . -o mdalchemy-book.html
```

## Webview Preview

The preview uses VS Code's webview API. Local image references are rewritten for
the webview so relative images inside the workspace can render in the preview.
The written HTML file keeps normal relative paths, so it remains portable as an
ordinary HTML document.

Scripts are disabled in the preview webview, and the extension injects a
restrictive content security policy for the in-editor view. The underlying
rendered HTML still follows the configured mdalchemy raw HTML policy. Use the
existing `html.rawHtml` and `html.safeUrls` config options for untrusted content.

## Development

From a clone:

```sh
npm install
npm run build
```

Open the repository in VS Code and run the `Run mdalchemy Extension` launch
configuration. In the Extension Development Host, open a Markdown file and run
`mdalchemy: Generate HTML`, or right-click a folder and run
`mdalchemy: Generate HTML Book`.

The VS Code extension entry point is `src/vscode/extension.ts`. The package
manifest points VS Code at `dist/vscode/extension.js`, while the npm library API
continues to resolve through the package `exports` map.
