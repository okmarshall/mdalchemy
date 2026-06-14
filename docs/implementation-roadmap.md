# Implementation Roadmap

## Strategy

Build mdalchemy in thin vertical slices. Each slice should produce something runnable and tested. The parser will take the longest, so the roadmap intentionally starts with a tiny pipeline and grows toward full CommonMark conformance.

The first useful version does not need every Markdown feature. The first stable version does.

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
