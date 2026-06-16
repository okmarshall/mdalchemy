# mdalchemy

[![npm version](https://img.shields.io/npm/v/mdalchemy.svg)](https://www.npmjs.com/package/mdalchemy)

mdalchemy previews and generates polished, human-readable HTML from Markdown in VS Code or from the command line.

The project is a learning-focused implementation. It should build its own Markdown parser, keep dependencies minimal, and make each stage of the pipeline understandable: input, parsing, document model, rendering, theming, and CLI orchestration.

## VS Code Features

When installed as a VS Code extension, mdalchemy adds:

- `mdalchemy: Preview HTML`: open a temporary live HTML preview beside a Markdown editor.
- In-preview `Save HTML`: render the current Markdown state and write the sibling `.html` file.
- `mdalchemy: Generate HTML`: write a sibling standalone HTML file immediately.
- `mdalchemy: Generate HTML Book`: recursively build one standalone HTML documentation book from a folder of Markdown files.

The live preview updates as you edit, uses the same custom parser and themes as the CLI, supports the configured GFM/frontmatter behavior, and keeps generated HTML off disk until you choose to save it.

## Current Implementation

The repository now contains a working TypeScript CLI and library:

- Custom Markdown parser with block and inline phases.
- Full official CommonMark 0.31.2 fixture-corpus pass in core mode.
- Renderer-neutral AST.
- HTML standalone and fragment rendering.
- Built-in `serif`, `sans`, and `technical` themes. The default is `serif`.
- Built-in syntax highlighting for JS/TS, C#, Python, Java, Go, Rust, SQL, YAML, Dockerfile, PowerShell, diff, JSON, HTML/XML, CSS, shell, and Markdown fences.
- JSON config loading with CLI overrides, unknown-key warnings, type validation, and strict-mode diagnostics.
- Safe mode for raw HTML and unsafe URLs.
- GFM pipe tables, task lists, strikethrough, footnotes, literal autolinks, and tagfilter through `--gfm` or `markdown.extensions`, with scroll-safe HTML output for wide tables.
- Optional leading YAML-style frontmatter parsing through `--frontmatter` or `markdown.extensions`.
- Theme token validation for custom themes.
- Heading anchors, table of contents generation, optional section wrappers, and optional collapsible sections.
- Project documentation books through `mdalchemy book`, with recursive Markdown discovery, frontmatter opt-out, and cross-file links rewritten into one standalone HTML document.
- VS Code extension commands for live previewing Markdown as temporary HTML, saving the current preview state, generating a sibling HTML file, or building a recursive project documentation book from a folder, with integrated webview previews.
- Node built-in test runner coverage.
- Complex Markdown smoke fixture plus checked HTML output.

## Installation

Install the CLI from npm:

```sh
npm install -g mdalchemy
mdalchemy --version
```

When working from a clone, install dependencies and build first:

```sh
npm install
npm run build
```

Then replace `mdalchemy` in the examples below with `node dist/cli/main.js`.

## Usage

Render a Markdown file to standalone HTML:

```sh
mdalchemy input.md -o output.html
```

Build one standalone documentation book from a project Markdown tree:

```sh
mdalchemy book . -o project-docs.html
```

When installed as a VS Code extension, run `mdalchemy: Preview HTML` from a
Markdown editor to open a temporary live HTML preview that updates as you edit.
Use the in-preview `Save HTML` button or `mdalchemy: Save Preview HTML` when
you want to render the current Markdown state and persist it. Run
`mdalchemy: Generate HTML` to write a sibling
`.html` file immediately and open the rendered document in a VS Code webview.
Right-click a folder in the Explorer and run
`mdalchemy: Generate HTML Book` to recursively build `mdalchemy-book.html` from
the folder's Markdown files. Running the book command from the Command Palette
opens a guided flow for folder, theme, section, table-of-contents, and output
settings.

Show CLI help:

```sh
mdalchemy help
mdalchemy help book
mdalchemy help theme
```

Enable the supported GitHub Flavored Markdown extension bundle:

```sh
mdalchemy input.md -o output.html --gfm
```

Parse leading frontmatter:

```sh
mdalchemy input.md -o output.html --frontmatter
```

Render a fragment to stdout:

```sh
mdalchemy input.md --stdout --fragment
```

Use safe mode when rendering untrusted Markdown:

```sh
mdalchemy input.md -o output.html --safe
```

Wrap heading-led content in semantic sections:

```sh
mdalchemy input.md -o output.html --sections
```

Add native expand/collapse controls to heading-led sections:

```sh
mdalchemy input.md -o output.html --collapsible-sections
```

Theme helpers:

```sh
mdalchemy theme list
mdalchemy theme inspect serif
mdalchemy theme inspect examples/themes/warm-report.json
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
| `--debug` | Show extra diagnostics. |
| `--gfm` | Enable supported GFM extensions: pipe tables, task lists, strikethrough, footnotes, literal autolinks, and tagfilter. |
| `--frontmatter` | Parse a leading YAML-style frontmatter block and omit it from visible HTML. |
| `--toc` / `--no-toc` | Force table of contents on or off. |
| `--sections` / `--no-sections` | Force heading-derived section wrappers on or off. |
| `--collapsible-sections` / `--no-collapsible-sections` | Force native section expand/collapse controls on or off. |

Project book controls:

| Option | Purpose |
| --- | --- |
| `mdalchemy book [root]` | Recursively scan a project for Markdown and render one standalone HTML documentation book. |
| `--include <pattern>` | Include matching Markdown paths; repeat for multiple patterns. |
| `--exclude <pattern>` | Exclude matching paths or directories; repeat for multiple patterns. |

`mdalchemy book` enables the supported GFM bundle and frontmatter parsing by default because project READMEs commonly use GitHub Flavored Markdown. Opt a file out of a project book with leading frontmatter:

```yaml
---
mdalchemy:
  include: false
---
```

## Known Limitations

- HTML is the only supported output format for v1.
- CLI watch mode is not implemented yet. The VS Code live preview already uses
  mdalchemy's reusable debounced watch-render controller.
- Config discovery only checks the current working directory for
  `mdalchemy.config.json` and `.mdalchemyrc.json`.
- The syntax highlighter is lightweight and intentionally smaller than a full
  programming-language grammar engine.
- Raw HTML is allowed by default for trusted documents. Use `--safe` for
  untrusted Markdown.
- GFM corpus checks target supported GFM behavior on top of the project's
  CommonMark 0.31.2 core; the report documents accepted CommonMark-version
  differences.

## Development

Run the checks:

```sh
npm run verify
npm run typecheck
npm test
npm run test:conformance
npm run test:commonmark
npm run test:commonmark:strict
npm run test:gfm
npm run test:gfm:strict
npm run test:install
```

Check the npm package contents before a release:

```sh
npm run pack:dry-run
```

Render the complex fixture:

```sh
npm run render:example
```

Try the example custom theme:

```sh
node dist/cli/main.js examples/complex-spec.md -o examples/complex-spec.warm.html --theme examples/themes/warm-report.json --toc --gfm --frontmatter
```

Release preparation is documented in [docs/release.md](docs/release.md).

## Planning Documents

- [Requirements](docs/requirements.md) captures the product vision, scope, user stories, spec baseline, non-goals, and acceptance criteria.
- [Architecture](docs/architecture.md) describes the module boundaries, document pipeline, AST model, renderer interface, extension points, and dependency policy.
- [Parser Design](docs/parser-design.md) gives the detailed plan for the custom Markdown parser, including block parsing, inline parsing, CommonMark conformance, and edge cases.
- [Rendering And Theming](docs/rendering-and-theming.md) explains how Markdown becomes beautiful semantic HTML.
- [CLI And Configuration](docs/cli-and-configuration.md) defines commands, flags, config discovery, theme configuration, diagnostics, and filesystem behavior.
- [Implementation Roadmap](docs/implementation-roadmap.md) tracks implemented, partial, planned, and deferred features alongside phased delivery plans.
- [Codebase Audit](docs/codebase-audit.md) records current quality findings, cleanup work, and maintainability follow-ups.
- [Testing Pipeline](docs/testing-pipeline.md) explains how to build, test, render fixtures, and compare output.
- [Conformance Status](docs/conformance-status.md) tracks current CommonMark-oriented coverage and known gaps.
- [Release Process](docs/release.md) defines the v1 release gates, npm trusted-publishing setup, and tag flow.
- [VS Code Extension](docs/vscode-extension.md) explains the extension command, webview preview behavior, and local development flow.

## Example Fixture

- [examples/complex-spec.md](examples/complex-spec.md) is a broad Markdown fixture.
- [examples/complex-spec.html](examples/complex-spec.html) is the generated HTML artifact.
- [examples/images](examples/images) contains local image fixtures used by the generated example.
- [examples/skills/mdalchemy-markdown-authoring](examples/skills/mdalchemy-markdown-authoring) is an agent-facing skill for writing Markdown that renders well through mdalchemy.
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
      "gfm-tagfilter",
      "frontmatter"
    ]
  }
}
```

## Core Decisions

- Use CommonMark 0.31.2 as the baseline for "full Markdown" conformance.
- Treat GitHub Flavored Markdown as an extension layer, not part of the core CommonMark parser contract.
- Represent parsed content as a renderer-neutral document AST.
- Keep HTML rendering separate from parsing so Markdown correctness and presentation can evolve independently.
- Keep theme files declarative and portable, with built-in themes and user-defined themes loaded from config.
- Avoid dependency sprawl. Dependencies must either provide clear platform value, such as CLI argument parsing, or solve a non-core problem we do not intend to learn by rebuilding.

## Why This Exists

Large language models often produce useful Markdown, but raw Markdown and ordinary preview panes are not always pleasant to read. mdalchemy should make Markdown feel like a finished human document: readable typography, clear hierarchy, clean code blocks, thoughtful spacing, and themes that can fit different kinds of writing.
