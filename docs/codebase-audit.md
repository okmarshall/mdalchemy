# Codebase Audit

## Summary

The codebase is in good health for the current stage of mdalchemy. The project has a small dependency surface, strict TypeScript, a custom parser/renderer pipeline, focused tests, and current docs that describe the implemented behavior.

This audit tightened compiler enforcement, clarified extension ownership, isolated CLI theme subcommands, split the parser/theme/renderer hotspots, added conformance fixture scaffolding, and documented the remaining coverage expansion work.

The v1 readiness follow-up audit focused on the newer VS Code extension surface. That integration had grown quickly as file rendering, project-book rendering, webview previews, diagnostics, and prompted Command Palette flows were added. The extension now has smaller modules split by responsibility, while the package manifest and public library exports remain unchanged.

The extensibility follow-up audit focused on feature-addition pressure after the
book, collapsible TOC, folder-structure TOC, and document shortcut controls
landed. It reduced change amplification in option handling, split the project
book builder, isolated document controls from the standalone shell, split the
built-in stylesheet into feature fragments, and split broad renderer/CLI tests
without removing coverage.

## Strengths

- The project uses modern TypeScript with ESM, `NodeNext`, declarations, source maps, and no runtime dependencies.
- The parser emits a renderer-neutral AST, which keeps Markdown correctness separate from HTML presentation.
- Config loading validates shape and semantic values before rendering.
- The HTML renderer escapes text and attributes, filters unsafe URLs in safe mode, and keeps raw HTML policy explicit.
- Tests cover parser behavior, renderer behavior, CLI integration, config validation, and the checked complex fixture.
- Docs and the implementation roadmap are close to the current behavior.
- The VS Code extension reuses the same core pipeline as the CLI instead of duplicating parsing or rendering behavior.

## Changes Made In This Audit

- Enabled stricter compiler checks: unused locals, unused parameters, implicit returns, switch fallthrough, and property access from index signatures.
- Made arbitrary JSON access explicit in config and theme loading.
- Moved Markdown extension identifiers and helpers into `src/markdown/extensions.ts`.
- Kept public extension exports stable through the config schema and package entrypoint.
- Split CLI theme subcommands into `src/cli/theme-command.ts`.
- Ignored generated warm-theme example output with `examples/*.warm.html`.
- Split block, inline, theme, and HTML renderer helpers into focused modules.
- Added JSON-driven conformance seed fixture packs and `npm run test:conformance`.

## Extensibility Follow-Up

### Changes Made

- Added `src/config/config-options.ts` so config field metadata drives default
  resolution and shape validation.
- Added `src/cli/options.ts` and `src/cli/help.ts` so top-level and book CLI
  commands share parse options, conflicts, HTML override mapping, extension
  defaults, and help rows.
- Split `src/book/book-builder.ts` into book orchestration, composition, TOC
  construction, link/asset rewriting, and shared types.
- Moved standalone shortcut controls into `src/render/html/document-actions.ts`
  and made the VS Code webview nonce rewrite import the same control-script
  marker.
- Split `src/theme/css.ts` into focused fragments under `src/theme/css/`.
- Refactored VS Code book prompts around a shared quick-pick choice helper and
  corrected folder-structure prompt copy to describe TOC grouping.
- Split broad renderer and CLI tests into behavior-focused files while keeping
  the same assertions.

### Current Assessment

- Adding a new HTML/book option now has clearer extension points: config
  descriptors, shared CLI option helpers, VS Code prompt choices, and focused
  tests.
- `renderProjectBook` is now a small public workflow instead of the owner of
  composition, TOC, cloning, and URL rewriting internals.
- Theme CSS still renders as one standalone stylesheet, but source ownership is
  split by feature.
- Document shortcut controls and webview CSP behavior share code-level
  constants instead of relying on duplicated string knowledge.

## V1 Readiness Follow-Up

### Changes Made

- Split VS Code activation from command implementation.
- Moved Markdown file command orchestration into `src/vscode/render-markdown-command.ts`.
- Moved project-book command orchestration into `src/vscode/render-book-command.ts`.
- Moved Command Palette book prompts into `src/vscode/book-prompts.ts`.
- Moved shared config/theme loading into `src/vscode/render-environment.ts`.
- Moved webview preview setup and local resource mapping into `src/vscode/preview.ts`.
- Moved output diagnostics into `src/vscode/diagnostics.ts`.
- Moved Markdown document resolution into `src/vscode/markdown-document.ts`.

### Current Assessment

- `src/vscode/extension.ts` is now a thin activation layer that only creates the output channel and registers commands.
- The VS Code extension code has clearer ownership boundaries and is easier to extend with additional commands.
- The CLI, parser, renderer, book builder, and public API did not need behavioral changes during this pass.
- Existing strict compiler settings are still doing useful work, especially `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.

### Watchlist

- `src/markdown/parser.ts` and `src/markdown/inline-parser.ts` remain the largest handwritten source files. They are complex because Markdown parsing is complex, but future parser changes should keep pushing isolated recognizers into focused helper modules.
- If CLI/config options keep growing, consider using the shared descriptors to
  generate more of the public docs and VS Code prompt choices.
- If project-book features grow again, keep new behavior in the focused
  `src/book/*` modules rather than returning logic to `book-builder.ts`.

## Advisory Status

### Parser Size

Addressed. Parser recognizers are now split by responsibility:

- Block container parsing: `src/markdown/block-containers.ts`.
- Leaf block parsing: `src/markdown/block-leaves.ts`.
- Table parsing: `src/markdown/table-parser.ts`.
- Inline delimiter parsing: `src/markdown/inline-delimiters.ts`.
- Inline link/image parsing: `src/markdown/inline-links.ts`.
- Inline extension parsing: `src/markdown/inline-extensions.ts`.

The orchestration remains in `src/markdown/parser.ts` and `src/markdown/inline-parser.ts`.

### Theme CSS Size

Addressed. Theme responsibilities are now split:

- Built-in token definitions: `src/theme/tokens.ts`.
- Theme types: `src/theme/types.ts`.
- Theme token validation: `src/theme/validation.ts`.
- CSS generation entrypoint: `src/theme/css.ts`.
- CSS feature fragments: `src/theme/css/*.ts`.
- Theme loading and inheritance: `src/theme/theme.ts`.

The public `resolveTheme` API is preserved.

### Renderer Growth

Addressed. HTML rendering is now split by boundary:

- Block rendering: `src/render/html/block-renderer.ts`.
- Inline rendering: `src/render/html/inline-renderer.ts`.
- Footnote rendering: `src/render/html/footnotes.ts`.
- Standalone document shell: `src/render/html/document-shell.ts`.
- Table of contents rendering: `src/render/html/toc-renderer.ts`.
- Standalone document shortcut controls: `src/render/html/document-actions.ts`.
- Shared renderer formatting helpers: `src/render/html/formatting.ts`.

### Conformance

Addressed at the runner level. `test/conformance.test.mjs` reads JSON fixture packs and verifies fragment output for:

- CommonMark 0.31.2 seed fixtures.
- Supported GFM/frontmatter extension seed fixtures.

The full official CommonMark 0.31.2 corpus is now vendored at
`test/fixtures/conformance/commonmark-0.31.2.json`, reportable with
`npm run test:commonmark`, and enforced with `npm run test:commonmark:strict`.
The official enabled GFM 0.29 corpus is now vendored at
`test/fixtures/conformance/gfm-0.29.json`, reportable with `npm run test:gfm`,
and enforced for unexpected failures with `npm run test:gfm:strict`.

### Generated Artifacts

Addressed. `dist/` is ignored and produced by `npm run build`. The checked fixture is `examples/complex-spec.html`; manually rendered warm-theme variants are ignored with `examples/*.warm.html`, and other temporary output should live under `tmp/`.

## Verification

Run before committing changes:

```sh
npm run typecheck
npm test
npm run test:commonmark:strict
```
