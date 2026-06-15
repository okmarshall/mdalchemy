# Testing Pipeline

This document defines the local testing pipeline for the current TypeScript
implementation. The package scripts are the source of truth, and the pipeline
should stay scriptable so a maintainer can run the same checks locally and in CI.

## Prerequisites

- Node.js installed.
- npm installed.
- Project dependencies installed with `npm install` after `package.json` exists.
- The CLI entrypoint available through `npm run render:example` or the compiled
  `dist/cli/main.js` file after `npm run build`.

The package should expose at least these baseline scripts:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "npm run build && node --test test/*.test.mjs",
    "test:unit": "npm run build && node --test test/parser.test.mjs test/renderer.test.mjs test/cli.test.mjs",
    "test:fixtures": "npm run build && node --test test/example-fixture.test.mjs",
    "test:conformance": "npm run build && node --test test/conformance.test.mjs",
    "test:commonmark": "npm run build && node test/commonmark-corpus-report.mjs",
    "test:commonmark:strict": "npm run build && node test/commonmark-corpus-report.mjs --strict",
    "test:gfm": "npm run build && node test/gfm-corpus-report.mjs",
    "test:gfm:strict": "npm run build && node test/gfm-corpus-report.mjs --strict",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "render:example": "npm run build && node dist/cli/main.js examples/complex-spec.md -o examples/complex-spec.html --toc --gfm --frontmatter",
    "verify": "npm run typecheck && npm test && npm run test:commonmark:strict && npm run test:gfm:strict",
    "pack:dry-run": "npm pack --dry-run",
    "prepack": "npm run build"
  }
}
```

## Pipeline Overview

Run the checks in this order:

1. Install dependencies.
2. Typecheck and build.
3. Run unit tests.
4. Run fixture tests.
5. Run conformance seed fixtures.
6. Run the full CommonMark corpus report when changing parser behavior.
7. Run the full GFM corpus report when changing extension behavior.
8. Render a representative Markdown file.
9. Render a representative project book when changing discovery or cross-file
   links.
10. Compare the generated HTML with the expected output.

This order catches fast structural failures before slower parser and renderer
fixtures.

## 1. Install Dependencies

Run this after cloning the repository or after dependency changes:

```sh
npm install
```

If a lockfile is added, CI should use `npm ci` instead of `npm install` for a
reproducible dependency tree.

## 2. Build And Typecheck

Run the typecheck first when the script exists:

```sh
npm run typecheck
```

Then build the package:

```sh
npm run build
```

Expected result:

- TypeScript emits no type errors.
- The build output is generated in the configured output directory.
- No test fixtures or example files are required to be modified by the build.

If `typecheck` and `build` are the same command for an early version, keep both
scripts available anyway. CI can call both and the implementation can decide
whether `build` emits files or only validates source.

The GitHub CI workflow runs the verification pipeline on Node 20, 22, and 24.
It installs with `npm ci`, then runs typecheck, tests, strict CommonMark/GFM
corpus checks, and `npm run pack:dry-run`.

## 3. Run Unit Tests

Unit tests should cover small modules with narrow inputs and outputs:

- Source line normalization.
- Column and indentation helpers.
- Block recognizers.
- Inline scanners.
- Link reference normalization.
- HTML escaping.
- Safe URL handling.
- Config merging and validation.
- Theme token validation.

Preferred command today:

```sh
npm test
```

Preferred command after a dedicated unit script exists:

```sh
npm run test:unit
```

Fallback command using the same Node test runner directly:

```sh
node --test test/*.test.mjs
```

Expected result:

- Unit tests do not read or write persistent fixture output.
- Failures identify the module and behavior that regressed.
- Parser edge cases discovered during implementation get a focused regression
  test in addition to any broad fixture coverage.

## 4. Run Fixture Tests

Fixture tests should exercise complete Markdown documents through the parser and
renderer. They are the best place to catch interactions between block parsing,
inline parsing, document analysis, and HTML rendering.

Preferred command after a dedicated script exists:

```sh
npm run test:fixtures
```

Until that split exists, fixture coverage should be included in the aggregate
test command:

```sh
npm test
```

Fallback command using the Node test runner directly, once fixture tests exist:

```sh
node --test test/fixtures/*.test.mjs
```

Recommended fixture layers:

- Parser fixtures compare Markdown input with a stable AST snapshot.
- HTML fragment fixtures compare Markdown input with CommonMark-like HTML.
- Standalone HTML fixtures compare the full mdalchemy document shell, theme CSS,
  heading anchors, and optional table of contents.
- Regression fixtures capture every fixed parser bug that involved ambiguity,
  nesting, escaping, or reference resolution.

Use fragment output for CommonMark conformance checks. Use standalone output for
mdalchemy product behavior.

## 5. Run Conformance Seed Fixtures

The strict conformance seed runner reads JSON fixture packs from
`test/fixtures/conformance` and renders HTML fragments for comparison. It
currently includes seed fixtures for CommonMark 0.31.2 behavior and the
supported GFM/frontmatter extension surface.

```sh
npm run test:conformance
```

## 6. Run Full CommonMark Corpus Report

The repository also vendors the official CommonMark 0.31.2 corpus in
`test/fixtures/conformance/commonmark-0.31.2.json`. Use this report before and
after parser changes to see section-level pass rates:

```sh
npm run test:commonmark
```

`npm run test:commonmark:strict` uses the same corpus as an all-examples gate
and should stay green for parser changes.

## 7. Run Full GFM Corpus Report

The repository also vendors the official enabled GFM 0.29 corpus in
`test/fixtures/conformance/gfm-0.29.json`. Use this report before and after
GFM extension changes to see section-level exact, accepted, and unexpected
failure counts:

```sh
npm run test:gfm
```

`npm run test:gfm:strict` exits non-zero on unexpected failures. The report
accepts the documented CommonMark-version emphasis differences between the
GFM 0.29 baseline and mdalchemy's CommonMark 0.31.2 core target.

## 8. Render An Example Markdown File

The repository includes a broad Markdown smoke fixture at
`examples/complex-spec.md`. It intentionally exercises many CommonMark features
in one document.

Use the package shortcut when it exists:

```sh
npm run render:example
```

That command writes `examples/complex-spec.html`.

For temporary manual output, create the output directory before rendering. The
CLI design says mdalchemy should not create missing parent directories unless a
future explicit flag is added.

```sh
mkdir -p tmp/rendered
```

Build and render through the compiled entrypoint:

```sh
npm run build
node dist/cli/main.js examples/complex-spec.md -o tmp/rendered/complex-spec.html --strict --gfm --frontmatter
```

Expected result:

- Exit code is `0`.
- `tmp/rendered/complex-spec.html` exists.
- Diagnostics are written to stderr, not mixed into the HTML file.
- The output is deterministic across repeated runs from the same input and
  config.

## 9. Render A Project Book

When changing `src/book`, CLI command dispatch, config discovery, heading IDs,
or link rendering, run a project-book render in addition to the normal fixture:

```sh
npm run build
node dist/cli/main.js book . -o tmp/rendered/mdalchemy-book.html --title "mdalchemy Documentation"
```

Expected result:

- Exit code is `0`.
- The output contains a project-wide table of contents.
- Links between included Markdown files point to generated `#anchor` targets.
- Files with leading `mdalchemy.include: false` or nested
  `mdalchemy: include: false` frontmatter are omitted.
- Relative image paths from nested Markdown files still resolve from the HTML
  output location.

For fragment-specific tests, render to stdout:

```sh
node dist/cli/main.js examples/complex-spec.md --stdout --fragment --gfm --frontmatter > tmp/rendered/complex-spec.fragment.html
```

Fragment output should omit the standalone HTML shell and theme CSS so parser
and renderer mappings are easier to diff.

## 10. Compare HTML Output

Use a plain unified diff for deterministic HTML snapshots:

```sh
diff -u test/fixtures/html/complex-spec.expected.html tmp/rendered/complex-spec.html
```

Use the fragment output when the goal is CommonMark behavior:

```sh
diff -u test/fixtures/html/complex-spec.fragment.expected.html tmp/rendered/complex-spec.fragment.html
```

The expected file should be updated only when the rendering change is intentional.
Review snapshot changes before committing them. In particular, check for:

- Lost text or reordered blocks.
- Incorrect nesting around lists, blockquotes, and raw HTML.
- Unescaped text in HTML attributes.
- Missing `class="language-..."` on fenced code where an info string exists.
- Unexpected changes to heading IDs, table of contents output, or theme CSS.
- Raw HTML behavior that differs from the selected safety policy.

If whitespace-only diffs become noisy, prefer improving renderer formatting or
the fixture comparison helper over weakening the fixture. HTML snapshots should
remain useful to read in code review.

## 11. Browser Layout Verification

Run browser checks for visual or layout-sensitive changes, especially changes to
themes, page width, code blocks, tables, images, the table of contents, or mobile
CSS.

Use the checked example artifact:

```sh
npm run render:example
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/examples/complex-spec.html
```

Minimum desktop checks:

- The document surface is centered and does not create page-level horizontal
  overflow.
- Code blocks remain readable and scroll internally when needed.
- Wide tables stay inside `.mda-table-scroll` and scroll horizontally inside the
  table region rather than widening the page.
- The table of contents, heading anchors, images, blockquotes, lists, and inline
  code remain visually coherent.

Minimum narrow viewport checks, using a width around `390px`:

- The document fills the viewport without horizontal page overflow.
- Tables and code blocks scroll internally where needed.
- Text does not overlap controls, headings, images, or table content.
- Padding remains comfortable enough for touch reading.

Record the checked viewport sizes and any notable measurements in the change
summary when layout changes are intentional.

## 12. Accessibility Checklist

Run this checklist whenever renderer structure or theme CSS changes:

- Standalone documents keep one main content region inside `.mda-document`.
- Generated table of contents uses `aria-label="Table of contents"`.
- Wide Markdown tables are wrapped in a focusable region with
  `role="region"` and `aria-label="Scrollable table"`.
- Images preserve Markdown alt text in the rendered `alt` attribute.
- Heading anchors do not replace the readable heading text.
- Link text remains visible and distinguishable from normal prose.
- Keyboard focus styles remain visible on interactive or focusable generated
  elements.
- Color changes preserve readable contrast for body text, links, inline code,
  code blocks, and table headers.

The current automated tests cover the generated TOC label, image alt text, and
scrollable table region. Contrast and keyboard review remain manual checks when
theme colors or focus styles change.

## Suggested CI Shape

A minimal CI job should run:

```sh
npm ci
npm run typecheck
npm run build
npm test
```

After dedicated test splits exist, CI can run:

```sh
npm ci
npm run typecheck
npm run build
npm run test:unit
npm run test:fixtures
```

The fixture render and diff can either be part of `npm run test:fixtures` or a
separate CI step. Keeping it in the fixture test suite is usually easier because
the test runner can create temporary directories, compare snapshots, and produce
actionable failure messages.

## Acceptance Checklist

Before a parser or renderer change is considered complete:

- `npm run typecheck` passes.
- `npm run build` passes.
- Unit tests for the changed module pass.
- Fixture tests covering the changed Markdown behavior pass.
- `examples/complex-spec.md` renders without warnings in strict mode, or the
  remaining warnings are documented as known gaps.
- HTML diff changes are reviewed and intentional.
