# Codebase Audit

## Summary

The codebase is in good health for the current stage of mdalchemy. The project has a small dependency surface, strict TypeScript, a custom parser/renderer pipeline, focused tests, and current docs that describe the implemented behavior.

This audit tightened compiler enforcement, clarified extension ownership, isolated CLI theme subcommands, and documented the remaining maintainability work that should be handled in planned slices.

## Strengths

- The project uses modern TypeScript with ESM, `NodeNext`, declarations, source maps, and no runtime dependencies.
- The parser emits a renderer-neutral AST, which keeps future HTML/PDF/export work possible.
- Config loading validates shape and semantic values before rendering.
- The HTML renderer escapes text and attributes, filters unsafe URLs in safe mode, and keeps raw HTML policy explicit.
- Tests cover parser behavior, renderer behavior, CLI integration, config validation, and the checked complex fixture.
- Docs and the implementation roadmap are close to the current behavior.

## Changes Made In This Audit

- Enabled stricter compiler checks: unused locals, unused parameters, implicit returns, switch fallthrough, and property access from index signatures.
- Made arbitrary JSON access explicit in config and theme loading.
- Moved Markdown extension identifiers and helpers into `src/markdown/extensions.ts`.
- Kept public extension exports stable through the config schema and package entrypoint.
- Split CLI theme subcommands into `src/cli/theme-command.ts`.
- Ignored generated warm-theme example output with `examples/*.warm.html`.

## Current Risks And Follow-Ups

### Parser Size

`src/markdown/parser.ts` and `src/markdown/inline-parser.ts` are the largest and highest-churn files. They are still readable, but future parser work will be safer if recognizers are split by responsibility:

- Block container parsing: lists and block quotes.
- Leaf block parsing: headings, code, HTML blocks, tables, footnotes, frontmatter.
- Inline delimiter parsing.
- Inline link/image parsing.
- Inline extension parsing.

Do this alongside new tests rather than as a pure file move.

### Theme CSS Size

`src/theme/theme.ts` owns token definitions, theme resolution, validation, and CSS generation. The CSS template is long enough that theme behavior would be easier to audit if split into:

- Built-in token definitions.
- Theme loading and inheritance.
- Theme token validation.
- CSS generation.

This should preserve the current public `resolveTheme` API.

### Renderer Growth

`src/render/html/html-renderer.ts` is still manageable, but footnotes, tables, task lists, TOC, and raw HTML policy now share one file. Split renderer helpers once another major HTML feature lands. A good boundary would be:

- Block rendering.
- Inline rendering.
- Footnote rendering.
- Standalone document shell.

### Conformance

The current tests are useful product tests, not an official CommonMark/GFM conformance suite. Before claiming full Markdown compatibility, add fixture runners for CommonMark 0.31.2 and the supported GFM extensions.

### Generated Artifacts

`dist/` is intentionally ignored and produced by `npm run build`. The checked fixture is `examples/complex-spec.html`; other manually rendered variants should stay ignored or live under `tmp/`.

## Verification

Run before committing changes:

```sh
npm run typecheck
npm test
```
