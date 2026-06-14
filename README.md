# mdalchemy

mdalchemy is planned as a modern TypeScript CLI that converts Markdown files into polished, human-readable documents. The first production target is beautiful standalone HTML, but the architecture is intentionally document-oriented so future renderers can produce PDF or other formats without replacing the parser.

The project is a learning-focused implementation. It should build its own Markdown parser, keep dependencies minimal, and make each stage of the pipeline understandable: input, parsing, document model, rendering, theming, and CLI orchestration.

## Current Implementation

The repository now contains a working TypeScript CLI and library:

- Custom Markdown parser with block and inline phases.
- Renderer-neutral AST.
- HTML standalone and fragment rendering.
- Built-in `serif`, `sans`, and `technical` themes.
- JSON config loading with CLI overrides.
- Safe mode for raw HTML and unsafe URLs.
- Heading anchors and table of contents generation.
- Node built-in test runner coverage.
- Complex Markdown smoke fixture plus checked HTML output.

Install dependencies:

```sh
npm install
```

Run the checks:

```sh
npm run typecheck
npm test
```

Render the complex fixture:

```sh
npm run render:example
```

Render your own file:

```sh
npm run build
node dist/cli/main.js input.md -o output.html --theme technical --toc
```

Try the example custom theme:

```sh
node dist/cli/main.js examples/complex-spec.md -o examples/complex-spec.warm.html --theme examples/themes/warm-report.json --toc
```

## Planning Documents

- [Requirements](docs/requirements.md) captures the product vision, scope, user stories, spec baseline, non-goals, and acceptance criteria.
- [Architecture](docs/architecture.md) describes the module boundaries, document pipeline, AST model, renderer interface, extension points, and dependency policy.
- [Parser Design](docs/parser-design.md) gives the detailed plan for the custom Markdown parser, including block parsing, inline parsing, CommonMark conformance, and edge cases.
- [Rendering And Theming](docs/rendering-and-theming.md) explains how Markdown becomes beautiful output without tying the whole project to HTML.
- [CLI And Configuration](docs/cli-and-configuration.md) defines commands, flags, config discovery, theme configuration, diagnostics, and filesystem behavior.
- [Implementation Roadmap](docs/implementation-roadmap.md) breaks the project into phases with tasks, deliverables, risk controls, and definitions of done.
- [Testing Pipeline](docs/testing-pipeline.md) explains how to build, test, render fixtures, and compare output.
- [Conformance Status](docs/conformance-status.md) tracks current CommonMark-oriented coverage and known gaps.

## Example Fixture

- [examples/complex-spec.md](examples/complex-spec.md) is a broad Markdown fixture.
- [examples/complex-spec.html](examples/complex-spec.html) is the generated HTML artifact.
- [examples/themes/warm-report.json](examples/themes/warm-report.json) is a custom theme example.
- [mdalchemy.config.example.json](mdalchemy.config.example.json) shows the supported config shape.

The test suite verifies that the current renderer output matches the checked HTML artifact.

## Core Decisions

- Use CommonMark 0.31.2 as the baseline for "full Markdown" conformance.
- Treat GitHub Flavored Markdown as a later extension layer, not part of the initial core parser contract.
- Represent parsed content as a renderer-neutral document AST.
- Build the HTML renderer as the first renderer, with PDF/export formats layered on later.
- Keep theme files declarative and portable, with built-in themes and user-defined themes loaded from config.
- Avoid dependency sprawl. Dependencies must either provide clear platform value, such as CLI argument parsing, or solve a non-core problem we do not intend to learn by rebuilding.

## Why This Exists

Large language models often produce useful Markdown, but raw Markdown and ordinary preview panes are not always pleasant to read. mdalchemy should make Markdown feel like a finished human document: readable typography, clear hierarchy, clean code blocks, thoughtful spacing, and themes that can fit different kinds of writing.
