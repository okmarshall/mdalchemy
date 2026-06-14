# Implementation Roadmap

## Strategy

Build mdalchemy in thin vertical slices. Each slice should produce something runnable and tested. The parser will take the longest, so the roadmap intentionally starts with a tiny pipeline and grows toward full CommonMark conformance.

The first useful version does not need every Markdown feature. The first stable version does.

## Feature Status Tracker

This section is the living implementation tracker. Update it whenever a change adds, removes, or meaningfully changes parser behavior, renderer output, CLI flags, config, theming, examples, or tests.

Parser feature rows track implemented and tested behavior in the current custom parser. Exhaustive CommonMark 0.31.2 edge-case closure remains grouped under the planned Phase 5 conformance work and should not keep individually implemented parser features marked partial.

Status labels:

- `[Done]`: implemented in code and covered by tests or checked fixtures.
- `[Partial]`: usable, but important known gaps remain.
- `[Planned]`: not implemented yet, but still part of the roadmap.
- `[Deferred]`: intentionally later than the current stabilization work.

### Current Phase Summary

| Phase | Area | Status | Current notes |
| --- | --- | --- | --- |
| 0 | Project foundation | `[Done]` | TypeScript project, package metadata, build/test scripts, and CLI entrypoint exist. |
| 1 | Minimal end-to-end rendering | `[Done]` | Markdown input can render to standalone styled HTML through the CLI and library API. |
| 2 | Core block parser | `[Done]` | Core block nodes are implemented and covered by parser tests and the complex fixture; exhaustive hard cases remain in planned Phase 5. |
| 3 | Inline parser basics | `[Done]` | Current inline syntax is implemented and covered by parser tests and the complex fixture; exhaustive hard cases remain in planned Phase 5. |
| 4 | Links, images, and references | `[Done]` | Links, images, autolinks, and references are implemented for current scope with tests; exhaustive destination/title behavior remains in planned Phase 5. |
| 5 | CommonMark hard cases | `[Planned]` | No official CommonMark fixture runner yet. |
| 6 | Document analysis | `[Done]` | Title extraction, heading slugs, duplicate slug suffixes, outline, heading anchors, and TOC are implemented; optional section wrappers remain planned. |
| 7 | Theming system | `[Done]` | Built-in themes, CSS variables, token resolution, built-in-theme inheritance, custom JSON themes, and token validation are implemented and tested. |
| 8 | Configuration | `[Done]` | JSON config, discovery, explicit config path, CLI overrides, safe preset, unknown-key warnings, type validation, and supported-extension validation are implemented and tested. |
| 9 | HTML polish | `[Done]` | Default theme, syntax highlighting, responsive layout, print CSS, images, code blocks, blockquotes, scroll-safe tables, and layout/accessibility checklists are implemented. |
| 10 | Release hardening | `[Planned]` | Stable CLI/config freeze, conformance suite, CI matrix, changelog, license review, and contribution docs remain. |

### Product And CLI

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| CLI help and version flags | `[Done]` | `src/cli/args.ts`, `src/cli/main.ts` | Keep help text synced with new flags. |
| Render Markdown file to HTML file | `[Done]` | `test/cli.test.mjs` | Add more end-to-end fixtures as features grow. |
| Default output path inference | `[Done]` | `src/io/files.ts` | Keep behavior documented in CLI docs. |
| `--stdout` output | `[Done]` | `src/cli/main.ts` | Add direct CLI test if behavior changes. |
| `--fragment` output | `[Done]` | `test/renderer.test.mjs` | Add CLI integration coverage if needed. |
| `--format html` | `[Done]` | `src/cli/args.ts`, `src/config/config-loader.ts` | Keep unsupported format errors clear. |
| PDF output | `[Planned]` | Architecture notes only | Choose browser-print or layout-tree strategy after HTML stabilizes. |
| Other export formats | `[Deferred]` | Requirements mention future formats | Revisit after PDF direction is chosen. |
| Watch mode | `[Deferred]` | CLI docs describe future behavior | Implement after normal render pipeline is stable. |
| Theme subcommands | `[Planned]` | CLI docs mention `theme list` and `theme inspect` | Add command routing before documenting as current usage. |
| Diagnostics and exit codes | `[Done]` | `src/core/diagnostics.ts`, `src/cli/main.ts`, `test/cli.test.mjs` | Keep exit codes stable as new diagnostics are added. |

### Markdown Parser

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Renderer-neutral AST | `[Done]` | `src/markdown/ast.ts` | Keep new syntax renderer-neutral. |
| Paragraphs and text | `[Done]` | `test/parser.test.mjs` | Add official examples through conformance runner. |
| ATX and Setext headings | `[Done]` | `examples/complex-spec.md` | Harden ambiguity cases against CommonMark examples. |
| Thematic breaks | `[Done]` | `examples/complex-spec.md` | Add parser-specific edge-case tests. |
| Fenced code blocks | `[Done]` | `examples/complex-spec.md` | Preserve info string behavior during syntax-highlighting work. |
| Indented code blocks | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Spaces and tabs are covered for current parser behavior. |
| Block quotes | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Basic, nested, list-containing, fenced-code-containing, and lazy-continuation quotes are covered. |
| Ordered and bullet lists | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Ordered, bullet, nested, tight, loose, and non-1 starts are covered for current parser behavior. |
| Nested containers | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Nested lists and block quotes are covered for current parser behavior. |
| Raw HTML blocks | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Common raw HTML block categories are implemented; exhaustive CommonMark comparison remains Phase 5 work. |
| Link reference definitions | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Add duplicate/reference precedence fixtures. |
| Backslash escapes | `[Done]` | `examples/complex-spec.md` | Compare against official escape examples. |
| Code spans | `[Done]` | `examples/complex-spec.md` | Add whitespace normalization edge cases. |
| Soft and hard breaks | `[Done]` | `examples/complex-spec.md` | Keep config-driven soft break rendering covered. |
| Entity references | `[Done]` | `src/markdown/inline-parser.ts`, `examples/complex-spec.md` | Numeric entities and the current named-entity set are implemented; complete named-entity coverage remains Phase 5 work. |
| Emphasis and strong | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Simple emphasis, strong, and triple delimiter nesting are implemented for current parser behavior. |
| Inline links and titles | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Inline links with titles, escaped destinations, and reference links are covered for current parser behavior. |
| Images and alt text | `[Done]` | `test/parser.test.mjs`, `test/renderer.test.mjs`, `examples/complex-spec.md` | Inline/reference images and rendered alt text are covered. |
| URI and email autolinks | `[Done]` | `examples/complex-spec.md` | Add official examples. |
| Raw HTML inline | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Common inline tags are parsed as raw HTML inline nodes. |
| Source ranges | `[Done]` | `src/core/source.ts`, `test/parser.test.mjs` | Parser nodes carry source ranges for current parsing; precision hardening remains Phase 5 work. |
| CommonMark conformance runner | `[Planned]` | Testing docs describe desired runner | Vendor CommonMark 0.31.2 examples and report pass rates by section. |

### Extensions

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Extension flag plumbing | `[Done]` | `markdown.extensions`, `--gfm` | Keep extensions opt-in. |
| GFM pipe tables | `[Done]` | `test/parser.test.mjs`, `test/renderer.test.mjs` | Add more escaped-pipe and alignment fixtures as needed. |
| Scroll-safe table rendering | `[Done]` | `src/render/html/html-renderer.ts`, `src/theme/theme.ts` | Keep browser checks when table CSS changes. |
| Task lists | `[Planned]` | Requirements extension list | Implement behind a separate extension flag. |
| Strikethrough | `[Planned]` | Requirements extension list | Implement behind a separate extension flag. |
| Footnotes | `[Planned]` | Requirements extension list | Decide syntax and renderer behavior first. |
| Frontmatter | `[Planned]` | Requirements extension list | Keep metadata separate from CommonMark core parsing. |
| Literal autolinks | `[Planned]` | Requirements extension list | Implement as GFM extension behavior, not CommonMark core. |

### Rendering And Document Features

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| HTML standalone renderer | `[Done]` | `test/renderer.test.mjs` | Keep shell stable unless config changes. |
| HTML fragment renderer | `[Done]` | `test/renderer.test.mjs` | Use for future conformance tests. |
| Escaping text and attributes | `[Done]` | `src/render/html/escape.ts` | Expand unsafe URL and raw HTML tests as policies evolve. |
| Raw HTML policies | `[Done]` | `test/renderer.test.mjs` | Add CLI/config integration tests. |
| Safe URL filtering | `[Done]` | `test/renderer.test.mjs` | Add image-specific unsafe URL coverage. |
| Heading-derived title | `[Done]` | `src/document/outline.ts` | Confirm title override behavior in CLI tests. |
| Stable heading slugs | `[Done]` | `src/document/slug.ts` | Add more duplicate and punctuation fixtures. |
| Heading anchors | `[Done]` | `test/renderer.test.mjs` | Keep anchor markup accessible. |
| Table of contents | `[Done]` | `test/renderer.test.mjs` | Add TOC depth and auto-mode coverage. |
| Section wrappers | `[Planned]` | Config field exists, renderer support does not | Implement in document analysis or renderer layer. |
| Images | `[Done]` | `examples/complex-spec.md` | Add image safety and broken path notes if needed. |
| Lightweight syntax highlighting | `[Done]` | `src/render/html/syntax-highlight.ts`, `test/renderer.test.mjs` | Add language fixtures when highlighter expands. |
| C# syntax highlighting | `[Done]` | `test/renderer.test.mjs` | Add additional C# constructs as regressions appear. |

### Theming And HTML Polish

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Default `serif` theme | `[Done]` | `src/theme/theme.ts` | Keep visual fixture current. |
| Built-in `sans` theme | `[Done]` | `src/theme/theme.ts` | Add fixture render if visual differences need review. |
| Built-in `technical` theme | `[Done]` | `src/theme/theme.ts` | Add docs examples if theme becomes user-facing. |
| Theme token model | `[Done]` | `src/theme/theme.ts` | Freeze token names before 1.0. |
| CSS variable generation | `[Done]` | `src/theme/theme.ts` | Add snapshot-style tests if CSS churn grows. |
| User theme JSON loading | `[Done]` | `test/renderer.test.mjs`, `examples/themes/warm-report.json` | Add invalid-file tests. |
| Theme inheritance | `[Done]` | `src/theme/theme.ts`, `docs/rendering-and-theming.md` | Current scope is documented: user themes can extend built-in themes; custom-to-custom inheritance is not implemented. |
| Theme validation | `[Done]` | `src/theme/theme.ts`, `test/renderer.test.mjs` | Unknown tokens warn; invalid token types, unsafe CSS fragments, and invalid color/length/font values report errors. |
| Responsive page layout | `[Done]` | `src/theme/theme.ts` | Keep browser checks for layout-sensitive changes. |
| Print CSS | `[Done]` | `src/theme/theme.ts`, `test/renderer.test.mjs` | Print-friendly document and table rules are covered by renderer tests. |
| Accessibility review | `[Done]` | `test/renderer.test.mjs`, `docs/testing-pipeline.md` | Baseline generated semantics and the manual review checklist are documented and tested. |

### Configuration

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Config schema types | `[Done]` | `src/config/config-schema.ts` | Keep schema synced with CLI/docs. |
| Defaults | `[Done]` | `defaultConfig` | Add tests when defaults change. |
| Config discovery | `[Done]` | `mdalchemy.config.json`, `.mdalchemyrc.json` lookup | Document exact discovery order as current behavior. |
| Explicit `--config` | `[Done]` | `src/config/config-loader.ts` | Add CLI integration test if behavior changes. |
| CLI override precedence | `[Done]` | `cliOverrides`, `resolveConfig` | Add focused tests for every override. |
| Safe preset | `[Done]` | `--safe`, `resolveConfig` | Add CLI integration coverage. |
| Strict mode | `[Done]` | `src/cli/main.ts`, `test/cli.test.mjs` | Warnings are treated as errors and return exit code `6`. |
| Config validation | `[Done]` | `src/config/config-loader.ts`, `test/config.test.mjs` | Unknown keys warn; invalid section shapes, field types, raw HTML policy, TOC depth, profile, format, and unsupported extensions are diagnosed. |
| Config version handling | `[Planned]` | Schema has optional `version` | Decide migration/error behavior. |

### Testing And Documentation

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Typecheck script | `[Done]` | `npm run typecheck` | Keep required before release. |
| Unit tests | `[Done]` | `test/*.test.mjs` | Continue adding focused tests for parser regressions. |
| CLI integration tests | `[Done]` | `test/cli.test.mjs` | Covers file output, GFM, stdout fragments, safe mode, invalid config, strict mode, and usage errors. |
| Complex fixture | `[Done]` | `examples/complex-spec.md`, `examples/complex-spec.html` | Keep synthetic and non-sensitive. |
| Visual/browser verification | `[Done]` | `docs/testing-pipeline.md` | Repeatable desktop and narrow-viewport browser checklist is documented for layout-sensitive changes. |
| CommonMark conformance suite | `[Planned]` | Testing docs only | Add fixture runner and pass/fail reporting. |
| CI workflow | `[Planned]` | Roadmap only | Add after scripts stabilize. |
| User README | `[Done]` | `README.md` | README includes current implementation, usage commands, option summary, examples, and planning document links. |
| Contribution guide | `[Planned]` | Roadmap only | Add before broader collaboration. |
| Changelog | `[Planned]` | Roadmap only | Add before tagged releases. |

### Tracker Maintenance Rules

- Update this tracker in the same change as any new user-visible feature.
- Prefer moving a feature from `[Planned]` to `[Partial]` before claiming `[Done]`.
- When marking `[Done]`, include code evidence and at least one test, fixture, or documented manual verification path.
- Keep sensitive or project-specific sample names out of checked fixtures and docs.
- Keep `docs/conformance-status.md` focused on Markdown/CommonMark correctness; keep this roadmap focused on implementation and product status.

## Phase 0: Project Foundation

### Goals

- Create the TypeScript project.
- Establish test tooling.
- Create the CLI entrypoint.
- Make repository scripts predictable.

### Tasks

- Add `package.json`.
- Add `tsconfig.json`.
- Add test runner config.
- Add lint/format decision.
- Add `src/` layout.
- Add `bin` entry for `mdalchemy`.
- Add `README` usage stub.
- Add CI script placeholders if desired.

### Recommended Scripts

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "dev": "tsx src/cli/main.ts"
  }
}
```

Dependency choices can change, but the project should always have build, test, and typecheck commands.

### Deliverables

- `npm run build` passes.
- `npm test` passes.
- `mdalchemy --help` works in dev mode.

### Definition Of Done

- No parser complexity yet.
- CLI can print help and version.
- Project structure matches the architecture plan.

## Phase 1: Minimal End-To-End Rendering

### Goals

Render a very small Markdown subset into standalone HTML.

### Supported Markdown

- Paragraphs.
- ATX headings.
- Text inlines.
- Basic soft breaks.

### Tasks

- Implement source reader.
- Implement line splitter.
- Implement basic AST.
- Implement minimal block parser.
- Implement minimal inline parser.
- Implement HTML renderer.
- Implement one built-in theme.
- Implement CLI render command.

### Example

Input:

```md
# Hello

This is Markdown.
```

Command:

```text
mdalchemy hello.md -o hello.html
```

Output:

- Standalone HTML file.
- Styled article.
- Correct heading and paragraph.

### Tests

- Source line splitting.
- Paragraph parsing.
- Heading parsing.
- HTML escaping.
- Standalone document rendering.
- CLI integration using a temp directory.

### Definition Of Done

- A user can create a readable HTML file from simple Markdown.
- The pipeline shape is real.

## Phase 2: Core Block Parser

### Goals

Add the most visible block structures.

### Supported Markdown

- Thematic breaks.
- Setext headings.
- Indented code blocks.
- Fenced code blocks.
- Block quotes.
- Bullet lists.
- Ordered lists.
- Blank lines.

### Tasks

- Implement block recognizer interfaces.
- Implement container stack.
- Implement code block handling.
- Implement list tight/loose tracking.
- Add blockquote continuation.
- Add source ranges for block nodes.
- Add block parser fixtures.

### Tests

- One fixture per block type.
- Nested blockquote fixture.
- Nested list fixture.
- Code block whitespace fixture.
- Tight vs loose list fixture.

### Definition Of Done

- Common document structures render correctly.
- Nested containers work for ordinary cases.

## Phase 3: Inline Parser Basics

### Goals

Add common inline formatting.

### Supported Markdown

- Backslash escapes.
- Code spans.
- Hard line breaks.
- Soft line breaks.
- Basic raw HTML inline recognition.
- Basic entity references.
- Emphasis and strong for simple cases.

### Tasks

- Implement inline scanner.
- Implement source ranges for inline nodes.
- Add escaping rules.
- Add code span normalization.
- Add simple delimiter run detection.
- Add initial delimiter stack.

### Tests

- Escapes.
- Code spans.
- Line breaks.
- Entity references.
- Simple emphasis.
- Simple strong.
- HTML escaping.

### Definition Of Done

- Typical prose documents with inline formatting render well.

## Phase 4: Links, Images, And References

### Goals

Support Markdown links and images accurately.

### Supported Markdown

- Inline links.
- Images.
- Autolinks.
- Link reference definitions.
- Full reference links.
- Collapsed reference links.
- Shortcut reference links.

### Tasks

- Implement reference definition parsing.
- Implement reference map normalization.
- Implement bracket stack.
- Implement inline destination parser.
- Implement title parser.
- Implement image alt text extraction.
- Add safe URL renderer behavior.

### Tests

- Inline links.
- Links with titles.
- Escaped characters in destinations.
- Reference links.
- Duplicate references.
- Images.
- Autolinks.
- Unsafe URL handling.

### Definition Of Done

- Links and images work in real documents.
- Safe mode protects obvious unsafe links.

## Phase 5: CommonMark Hard Cases

### Goals

Close gaps against CommonMark.

### Focus Areas

- Emphasis and strong emphasis edge cases.
- HTML block categories.
- Lazy continuation.
- Paragraph interruption.
- List item padding.
- Setext/thematic break ambiguity.
- Entity completeness.

### Tasks

- Import or vendor CommonMark examples.
- Build conformance runner.
- Implement missing HTML block rules.
- Complete delimiter stack behavior.
- Improve list and paragraph rules.
- Track conformance pass rate by section.

### Tests

- CommonMark fixture runner.
- Regression fixtures for every fixed edge case.
- AST debug snapshots where useful.

### Definition Of Done

- Conformance progress is measurable.
- Remaining gaps are documented by section.

## Phase 6: Document Analysis

### Goals

Add higher-level document features that make output feel intentional.

### Features

- Document title extraction.
- Heading slug generation.
- Duplicate heading ID handling.
- Outline model.
- Optional table of contents.
- Optional section wrappers.

### Tasks

- Implement `document/outline.ts`.
- Implement `document/slug.ts`.
- Implement `document/sections.ts`.
- Add renderer support for anchors.
- Add renderer support for TOC.
- Add config flags.

### Tests

- Title extraction.
- Slug generation.
- Duplicate slugs.
- Nested heading outline.
- TOC depth.
- Section wrapper output.

### Definition Of Done

- Long documents become easier to navigate.
- These features can be disabled for conformance fragment tests.

## Phase 7: Theming System

### Goals

Support built-in and user-defined themes.

### Features

- Built-in `serif`.
- Built-in `sans`.
- Built-in `technical`.
- Theme token model.
- Theme inheritance.
- Theme validation.
- CSS variable generation.

### Tasks

- Define theme token types.
- Implement built-ins.
- Implement theme resolver.
- Implement JSON theme loading.
- Implement validation diagnostics.
- Document theme tokens.
- Add CSS generation tests.

### Tests

- Built-in theme resolution.
- User theme extends built-in.
- Unknown token.
- Invalid color.
- Invalid length.
- Extends cycle.
- CSS output snapshots.

### Definition Of Done

- A user can create a custom theme without touching code.
- Built-in themes are visibly distinct.

## Phase 8: Configuration

### Goals

Make behavior configurable in a stable way.

### Features

- `mdalchemy.config.json`.
- Explicit `--config`.
- Defaults.
- CLI override precedence.
- Config validation.
- Safe preset.

### Tasks

- Implement config schema types.
- Implement config loader.
- Implement merge logic.
- Implement validation.
- Add CLI integration.
- Document examples.

### Tests

- No config defaults.
- Explicit config path.
- Discovered config.
- CLI overrides.
- Invalid config.
- Safe preset.

### Definition Of Done

- Project-level config works.
- CLI behavior is predictable.

## Phase 9: HTML Polish

### Goals

Make output genuinely beautiful and robust.

### Features

- Better default typography.
- Responsive layout.
- Print CSS.
- Code block language labels optional.
- Blockquote styling.
- List spacing.
- Link styling.
- Image sizing.
- Mobile readability.

### Tasks

- Tune built-in themes with fixture documents.
- Add visual sample documents.
- Add generated HTML examples.
- Add accessibility review.
- Add print review.

### Tests

- HTML snapshot tests.
- CSS token tests.
- Manual browser checks.
- Accessibility checklist.

### Definition Of Done

- Output feels like a finished document, not a default Markdown preview.

## Phase 10: Release Hardening

### Goals

Prepare 1.0.

### Tasks

- Complete docs.
- Stabilize CLI flags.
- Stabilize config schema.
- Freeze theme token names.
- Review dependency tree.
- Run conformance suite.
- Run integration tests on macOS, Linux, and Windows if CI exists.
- Add changelog.
- Add license.
- Add contribution notes.

### Definition Of Done

- The project can be installed and used as a CLI.
- Important behavior is documented.
- Known limitations are explicit.
- The codebase is ready for extension.

## Suggested Milestone Releases

### `0.1.0`

- Minimal pipeline.
- Simple CLI.
- Simple HTML.
- One theme.

### `0.2.0`

- Core blocks.
- Basic inline formatting.
- Better tests.

### `0.3.0`

- Links/images/references.
- Nested containers.
- Basic config.

### `0.4.0`

- Conformance runner.
- CommonMark gap closure.
- Diagnostics.

### `0.5.0`

- Themes.
- TOC.
- Heading anchors.
- Safe mode.

### `1.0.0`

- Stable CLI.
- Stable config.
- CommonMark 0.31.2 core conformance suite passing in `commonmark` mode.
- Production-ready HTML output.

## Work Breakdown By Area

### Parser

- AST types.
- Source positions.
- Block parser.
- Inline parser.
- Reference definitions.
- Conformance runner.
- Debug output.

### Renderer

- Renderer interface.
- HTML fragment renderer.
- HTML standalone renderer.
- Escaping.
- Safe URLs.
- Raw HTML policy.
- Heading anchors.
- TOC.

### Theme

- Token model.
- Built-ins.
- User theme loader.
- Validation.
- CSS generation.
- Print CSS.

### CLI

- Args.
- Config.
- IO.
- Diagnostics.
- Exit codes.
- Help.

### Tests

- Unit tests.
- Fixture tests.
- Snapshot tests.
- Integration tests.
- Conformance tests.

### Documentation

- User guide.
- Config reference.
- Theme reference.
- Architecture guide.
- Parser notes.
- Contribution guide.

## Risk Register

### Risk: Parser Complexity

Impact:

- High.

Cause:

- Markdown has many ambiguous-looking edge cases.

Mitigation:

- Follow CommonMark phases.
- Build conformance runner early.
- Add regression fixtures.
- Keep extensions off by default.

### Risk: Emphasis Parsing Takes Too Long

Impact:

- Medium to high.

Mitigation:

- Implement simple emphasis first.
- Isolate delimiter stack.
- Use CommonMark examples as guide.
- Document remaining failures by section.

### Risk: Theming Becomes Too Powerful

Impact:

- Medium.

Cause:

- Arbitrary CSS or JS could create security and maintenance issues.

Mitigation:

- Token-based themes first.
- No theme JavaScript.
- Optional raw CSS only after explicit design.

### Risk: HTML Beauty Distracts From Correctness

Impact:

- Medium.

Mitigation:

- Use fragment renderer for conformance.
- Keep styling in themes.
- Do not let renderer compensate for parser bugs.

### Risk: Future PDF Needs Change Everything

Impact:

- Medium.

Mitigation:

- Keep AST renderer-neutral.
- Keep HTML-specific logic in HTML renderer.
- Use document analysis layer for shared features.

### Risk: Dependency Creep

Impact:

- Medium.

Mitigation:

- Require dependency review.
- Keep parser dependency-free.
- Prefer Node platform APIs where practical.

## Definition Of Done For Features

Every feature should include:

- Typed implementation.
- Unit tests.
- At least one fixture test if user-facing.
- Diagnostics for invalid user input where relevant.
- Documentation update if the feature changes CLI, config, theme tokens, or Markdown behavior.

## First Implementation Sprint

Recommended first sprint tasks:

1. Scaffold TypeScript project.
2. Add CLI `--help`.
3. Add `SourceText` and line splitting.
4. Add AST types.
5. Parse ATX headings and paragraphs.
6. Render standalone HTML with one theme.
7. Add CLI integration test.

This produces a tiny but complete mdalchemy loop. From there, every Markdown feature becomes an incremental improvement rather than an abstract architecture exercise.
