# mdalchemy

mdalchemy is a modern TypeScript CLI that converts Markdown files into polished, human-readable documents. The first production target is beautiful standalone HTML, but the architecture is intentionally document-oriented so future renderers can produce PDF or other formats without replacing the parser.

The project is a learning-focused implementation. It should build its own Markdown parser, keep dependencies minimal, and make each stage of the pipeline understandable: input, parsing, document model, rendering, theming, and CLI orchestration.

## Current Implementation

The repository now contains a working TypeScript CLI and library:

- Custom Markdown parser with block and inline phases.
- Full official CommonMark 0.31.2 fixture-corpus pass in core mode.
- Renderer-neutral AST.
- HTML standalone and fragment rendering.
- Built-in `serif`, `sans`, and `technical` themes. The default is `serif`.
- Built-in syntax highlighting for JS/TS, C#, JSON, HTML/XML, CSS, shell, and Markdown fences.
- JSON config loading with CLI overrides, unknown-key warnings, type validation, and strict-mode diagnostics.
- Safe mode for raw HTML and unsafe URLs.
- GFM pipe tables, task lists, strikethrough, footnotes, and literal autolinks through `--gfm` or `markdown.extensions`, with scroll-safe HTML output for wide tables.
- Optional leading YAML-style frontmatter parsing through `--frontmatter` or `markdown.extensions`.
- Theme token validation for custom themes.
- Heading anchors and table of contents generation.
- Node built-in test runner coverage.
- Complex Markdown smoke fixture plus checked HTML output.

Install dependencies:

```sh
npm install
```

## Usage

Build the CLI:

```sh
npm run build
```

Render a Markdown file to standalone HTML:

```sh
node dist/cli/main.js input.md -o output.html
```

Enable the supported GitHub Flavored Markdown extension bundle:

```sh
node dist/cli/main.js input.md -o output.html --gfm
```

Parse leading frontmatter:

```sh
node dist/cli/main.js input.md -o output.html --frontmatter
```

Render a fragment to stdout:

```sh
node dist/cli/main.js input.md --stdout --fragment
```

Use safe mode when rendering untrusted Markdown:

```sh
node dist/cli/main.js input.md -o output.html --safe
```

Useful options:

| Option | Purpose |
| --- | --- |
| `-o, --output <path>` | Write rendered HTML to a file. |
| `--stdout` | Write rendered HTML to stdout. |
| `--fragment` | Omit the standalone HTML shell and inline theme CSS. |
| `--theme <name-or-path>` | Use a built-in theme or a JSON theme file. |
| `--config <path>` | Load a specific config file. |
| `--safe` | Escape raw HTML and reject unsafe URLs. |
| `--strict` | Treat warnings as errors. |
| `--gfm` | Enable supported GFM extensions: pipe tables, task lists, strikethrough, footnotes, and literal autolinks. |
| `--frontmatter` | Parse a leading YAML-style frontmatter block and omit it from visible HTML. |
| `--toc` / `--no-toc` | Force table of contents on or off. |

Theme helpers:

```sh
node dist/cli/main.js theme list
node dist/cli/main.js theme inspect serif
node dist/cli/main.js theme inspect examples/themes/warm-report.json
```

## Development

Run the checks:

```sh
npm run typecheck
npm test
npm run test:conformance
npm run test:commonmark
npm run test:commonmark:strict
```

Render the complex fixture:

```sh
npm run render:example
```

Try the example custom theme:

```sh
node dist/cli/main.js examples/complex-spec.md -o examples/complex-spec.warm.html --theme examples/themes/warm-report.json --toc --gfm --frontmatter
```

## Planning Documents

- [Requirements](docs/requirements.md) captures the product vision, scope, user stories, spec baseline, non-goals, and acceptance criteria.
- [Architecture](docs/architecture.md) describes the module boundaries, document pipeline, AST model, renderer interface, extension points, and dependency policy.
- [Parser Design](docs/parser-design.md) gives the detailed plan for the custom Markdown parser, including block parsing, inline parsing, CommonMark conformance, and edge cases.
- [Rendering And Theming](docs/rendering-and-theming.md) explains how Markdown becomes beautiful output without tying the whole project to HTML.
- [CLI And Configuration](docs/cli-and-configuration.md) defines commands, flags, config discovery, theme configuration, diagnostics, and filesystem behavior.
- [Implementation Roadmap](docs/implementation-roadmap.md) tracks implemented, partial, planned, and deferred features alongside phased delivery plans.
- [Codebase Audit](docs/codebase-audit.md) records current quality findings, cleanup work, and maintainability follow-ups.
- [Testing Pipeline](docs/testing-pipeline.md) explains how to build, test, render fixtures, and compare output.
- [Conformance Status](docs/conformance-status.md) tracks current CommonMark-oriented coverage and known gaps.

## Example Fixture

- [examples/complex-spec.md](examples/complex-spec.md) is a broad Markdown fixture.
- [examples/complex-spec.html](examples/complex-spec.html) is the generated HTML artifact.
- [examples/images](examples/images) contains local image fixtures used by the generated example.
- [examples/themes/warm-report.json](examples/themes/warm-report.json) is a custom theme example.
- [mdalchemy.config.example.json](mdalchemy.config.example.json) shows the supported config shape.

The test suite verifies that the current renderer output matches the checked HTML artifact.

GitHub Flavored Markdown extensions can be enabled with `--gfm` or this config. Rendered tables are wrapped in a keyboard-focusable overflow region so long technical rows do not push the document off the page. Frontmatter is separate from the GFM bundle and stays opt-in.

```json
{
  "markdown": {
    "extensions": [
      "gfm-table",
      "gfm-task-list",
      "gfm-strikethrough",
      "gfm-footnote",
      "gfm-literal-autolink",
      "frontmatter"
    ]
  }
}
```

## Core Decisions

- Use CommonMark 0.31.2 as the baseline for "full Markdown" conformance.
- Treat GitHub Flavored Markdown as an extension layer, not part of the core CommonMark parser contract.
- Represent parsed content as a renderer-neutral document AST.
- Build the HTML renderer as the first renderer, with PDF/export formats layered on later.
- Keep theme files declarative and portable, with built-in themes and user-defined themes loaded from config.
- Avoid dependency sprawl. Dependencies must either provide clear platform value, such as CLI argument parsing, or solve a non-core problem we do not intend to learn by rebuilding.

## Why This Exists

Large language models often produce useful Markdown, but raw Markdown and ordinary preview panes are not always pleasant to read. mdalchemy should make Markdown feel like a finished human document: readable typography, clear hierarchy, clean code blocks, thoughtful spacing, and themes that can fit different kinds of writing.
