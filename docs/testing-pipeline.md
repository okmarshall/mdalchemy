# Testing Pipeline

This document defines the expected local testing pipeline for mdalchemy as the
TypeScript implementation lands. Some commands below depend on the Phase 0
project foundation: `package.json`, `tsconfig.json`, `src/`, and test files.

When those files exist, the package scripts are the source of truth. The
pipeline should stay scriptable so a maintainer can run the same checks locally
and in CI.

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
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "render:example": "npm run build && node dist/cli/main.js examples/complex-spec.md -o examples/complex-spec.html --theme technical --toc --gfm"
  }
}
```

## Pipeline Overview

Run the checks in this order:

1. Install dependencies.
2. Typecheck and build.
3. Run unit tests.
4. Run fixture tests.
5. Render a representative Markdown file.
6. Compare the generated HTML with the expected output.

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

## 5. Render An Example Markdown File

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
node dist/cli/main.js examples/complex-spec.md -o tmp/rendered/complex-spec.html --strict --gfm
```

Expected result:

- Exit code is `0`.
- `tmp/rendered/complex-spec.html` exists.
- Diagnostics are written to stderr, not mixed into the HTML file.
- The output is deterministic across repeated runs from the same input and
  config.

For fragment-specific tests, render to stdout:

```sh
node dist/cli/main.js examples/complex-spec.md --stdout --fragment --gfm > tmp/rendered/complex-spec.fragment.html
```

Fragment output should omit the standalone HTML shell and theme CSS so parser
and renderer mappings are easier to diff.

## 6. Compare HTML Output

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
