# Implementation Roadmap

## Strategy

Build mdalchemy in thin vertical slices. Each slice should produce something runnable and tested. The parser will take the longest, so the roadmap intentionally starts with a tiny pipeline and grows toward full CommonMark conformance.

The first useful version does not need every Markdown feature. The first stable version does.

## Feature Status Tracker

This section is the living implementation tracker. Update it whenever a change adds, removes, or meaningfully changes parser behavior, renderer output, CLI flags, config, theming, examples, or tests.

Parser feature rows track implemented and tested behavior in the current custom parser. CommonMark 0.31.2 core behavior is guarded by the strict official corpus command, while extension-specific fixture depth is tracked separately.

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
| 2 | Core block parser | `[Done]` | Core block nodes are implemented and covered by parser tests, the complex fixture, and the strict CommonMark corpus. |
| 3 | Inline parser basics | `[Done]` | Core inline syntax is implemented and covered by parser tests, seed fixtures, and the strict CommonMark corpus. |
| 4 | Links, images, and references | `[Done]` | Links, images, autolinks, and references are implemented with CommonMark bracket-stack behavior and strict corpus coverage. |
| 5 | CommonMark hard cases | `[Done]` | Official CommonMark 0.31.2 corpus is vendored and `npm run test:commonmark:strict` passes all 652 examples. |
| 6 | Document analysis | `[Done]` | Title extraction, heading slugs, duplicate slug suffixes, outline, heading anchors, TOC, and optional section wrappers are implemented. |
| 7 | Theming system | `[Done]` | Built-in themes, CSS variables, token resolution, built-in-theme inheritance, custom JSON themes, and token validation are implemented and tested. |
| 8 | Configuration | `[Done]` | JSON config, discovery, explicit config path, CLI overrides, safe preset, unknown-key warnings, type validation, and supported-extension validation are implemented and tested. |
| 9 | HTML polish | `[Done]` | Default theme, syntax highlighting, responsive layout, print CSS, images, code blocks, blockquotes, scroll-safe tables, and layout/accessibility checklists are implemented. |
| 10 | Release hardening | `[Done]` | Node 24 cross-platform CI, packed install smoke, package metadata, pack dry-run script, MIT license, changelog, contribution docs, release docs, and tag-triggered npm release automation are in place. The first publish still requires npm trusted-publisher setup on npmjs.com. |
| 11 | Authoring workflow polish | `[Planned]` | Next focus: watch mode, preview-only temporary HTML, config/theme generators, and better config-location UX. |

### Product And CLI

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| CLI help and version flags | `[Done]` | `src/cli/args.ts`, `src/cli/main.ts`, `test/cli.test.mjs` | `mdalchemy help` and `mdalchemy help theme` are covered; keep help text synced with new flags. |
| Render Markdown file to HTML file | `[Done]` | `test/cli.test.mjs` | Add more end-to-end fixtures as features grow. |
| Project documentation book command | `[Done]` | `src/cli/book-command.ts`, `src/book/book-builder.ts`, `src/book/discovery.ts`, `test/cli.test.mjs` | `mdalchemy book [root]` recursively discovers Markdown, applies include/exclude controls, supports frontmatter opt-out, rewrites cross-file Markdown links into same-page anchors, and emits one standalone HTML book. |
| VS Code extension commands | `[Done]` | `package.json`, `src/vscode/extension.ts`, `src/vscode/book-options.ts`, `docs/vscode-extension.md`, `test/vscode-book-options.test.mjs` | Extension users can generate HTML from an open Markdown file, generate `mdalchemy-book.html` from a selected Explorer folder with defaults, or launch the book command from the Command Palette for prompted folder/theme/section/TOC/output settings. |
| Default output path inference | `[Done]` | `src/io/files.ts` | Keep behavior documented in CLI docs. |
| `--stdout` output | `[Done]` | `src/cli/main.ts`, `test/cli.test.mjs` | `--stdout` and `--output` are mutually exclusive. |
| `--fragment` output | `[Done]` | `test/renderer.test.mjs`, `test/cli.test.mjs` | Keep fragment behavior available for piping and conformance use. |
| `--format html` | `[Done]` | `src/cli/args.ts`, `src/config/config-loader.ts` | Keep unsupported format errors clear. |
| Watch mode | `[Planned]` | CLI docs describe future behavior | Add `--watch` for file rendering and project books. Watch input Markdown, config files, theme files, and local assets where practical; debounce renders; preserve current diagnostics and exit behavior for the initial render. |
| Temporary HTML output | `[Planned]` | VS Code preview currently writes persistent HTML output | Add preview-only temporary HTML generation for VS Code and possibly CLI. Users should be able to view rendered HTML without creating or dirtying a project `.html` file. |
| Config init command | `[Planned]` | Config schema and example config exist | Add commands such as `mdalchemy config init`, `mdalchemy config print-defaults`, and VS Code command integration to create a documented starter config. |
| Theme init command | `[Planned]` | Theme tokens, built-ins, validation, and example theme exist | Add commands such as `mdalchemy theme init`, `mdalchemy theme init --extends serif`, and `mdalchemy theme validate <path>` to help users create custom themes safely. |
| Theme subcommands | `[Done]` | `src/cli/main.ts`, `src/cli/theme-command.ts`, `test/cli.test.mjs` | Extra subcommand arguments are usage errors. |
| Diagnostics and exit codes | `[Done]` | `src/core/diagnostics.ts`, `src/cli/main.ts`, `test/cli.test.mjs` | Usage, input, config, theme, render, and output failures have stable exit codes. |

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
| Raw HTML blocks | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md`, `npm run test:commonmark:strict` | Official CommonMark HTML block examples pass. |
| Link reference definitions | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md`, `npm run test:commonmark:strict` | Duplicate/reference precedence and escaped-label behavior are covered by the official corpus and seed fixtures. |
| Backslash escapes | `[Done]` | `examples/complex-spec.md` | Compare against official escape examples. |
| Code spans | `[Done]` | `examples/complex-spec.md` | Add whitespace normalization edge cases. |
| Soft and hard breaks | `[Done]` | `examples/complex-spec.md` | Keep config-driven soft break rendering covered. |
| Entity references | `[Done]` | `src/markdown/entities.generated.ts`, `test/fixtures/conformance/commonmark-0.31.2.seed.json`, `npm run test:commonmark:strict` | HTML5 named entities and numeric entities are decoded in CommonMark mode. |
| Emphasis and strong | `[Done]` | `src/markdown/inline-parser.ts`, `test/fixtures/conformance/commonmark-0.31.2.seed.json`, `npm run test:commonmark:strict` | CommonMark delimiter-stack behavior passes the official emphasis and strong-emphasis examples. |
| Inline links and titles | `[Done]` | `src/markdown/inline-parser.ts`, `test/fixtures/conformance/commonmark-0.31.2.seed.json`, `npm run test:commonmark:strict` | CommonMark bracket-stack link/image precedence, labels, destinations, and titles pass the official examples. |
| Images and alt text | `[Done]` | `test/parser.test.mjs`, `test/renderer.test.mjs`, `examples/complex-spec.md` | Inline/reference images and rendered alt text are covered. |
| URI and email autolinks | `[Done]` | `examples/complex-spec.md` | Add official examples. |
| Raw HTML inline | `[Done]` | `test/parser.test.mjs`, `examples/complex-spec.md` | Common inline tags are parsed as raw HTML inline nodes. |
| Source ranges | `[Done]` | `src/core/source.ts`, `test/parser.test.mjs` | Parser nodes carry source ranges for current parsing; nested virtual-line precision remains future diagnostic hardening. |
| Conformance fixture runner | `[Done]` | `test/conformance.test.mjs`, `test/fixtures/conformance` | Strict seed packs remain the fast regression guardrail. |
| Full CommonMark 0.31.2 fixture corpus | `[Done]` | `test/fixtures/conformance/commonmark-0.31.2.json`, `test/commonmark-corpus-report.mjs`, `npm run test:commonmark` | Official 652-example corpus is vendored and reports pass rates by section. |
| Full CommonMark 0.31.2 conformance pass | `[Done]` | `npm run test:commonmark:strict` | Current baseline is 652/652 examples passing. |

### Extensions

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Extension flag plumbing | `[Done]` | `markdown.extensions`, `--gfm`, `--frontmatter` | Keep extensions opt-in. |
| GFM pipe tables | `[Done]` | `test/parser.test.mjs`, `test/renderer.test.mjs`, `test/fixtures/conformance/gfm-supported.seed.json` | Escaped-pipe, code-pipe, and alignment fixtures are covered. |
| Scroll-safe table rendering | `[Done]` | `src/render/html/html-renderer.ts`, `src/theme/theme.ts` | Keep browser checks when table CSS changes. |
| Task lists | `[Done]` | `src/markdown/parser.ts`, `src/render/html/html-renderer.ts`, `test/parser.test.mjs`, `test/renderer.test.mjs` | Add edge cases for nested task lists if bugs appear. |
| Strikethrough | `[Done]` | `src/markdown/inline-parser.ts`, `src/render/html/html-renderer.ts`, `test/parser.test.mjs`, `test/renderer.test.mjs` | Add delimiter edge cases if the GFM fixture suite is added. |
| Footnotes | `[Done]` | `src/markdown/parser.ts`, `src/render/html/footnotes.ts`, `test/parser.test.mjs`, `test/renderer.test.mjs`, `test/fixtures/conformance/gfm-supported.seed.json` | Basic rendering and repeated-reference backrefs are covered. |
| Frontmatter | `[Done]` | `src/markdown/parser.ts`, `test/parser.test.mjs`, `test/renderer.test.mjs` | Keep metadata separate from CommonMark core parsing. |
| Literal autolinks | `[Done]` | `src/markdown/inline-parser.ts`, `test/parser.test.mjs`, `test/renderer.test.mjs`, `test/fixtures/conformance/gfm-supported.seed.json` | URI, email, and trailing punctuation trimming are covered. |
| Tagfilter | `[Done]` | `src/render/html/inline-renderer.ts`, `test/fixtures/conformance/gfm-supported.seed.json`, `npm run test:gfm:strict` | Disallowed GFM raw HTML tags are filtered when `gfm-tagfilter` is enabled. |

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
| Cross-file book TOC and links | `[Done]` | `src/book/book-builder.ts`, `test/cli.test.mjs` | Project books compose included files into one document outline, map same-file and cross-file Markdown links to generated anchors, and keep relative images valid from the output location. |
| Section wrappers | `[Done]` | `src/render/html/block-renderer.ts`, `src/cli/args.ts`, `test/renderer.test.mjs`, `test/cli.test.mjs` | `html.sections` plus `--sections` / `--no-sections` render heading-derived nested sections outside CommonMark-compatible output. |
| Collapsible sections | `[Done]` | `src/render/html/block-renderer.ts`, `src/theme/css.ts`, `src/cli/args.ts`, `test/renderer.test.mjs`, `test/cli.test.mjs` | `html.collapsibleSections` plus `--collapsible-sections` / `--no-collapsible-sections` add native expanded-by-default details controls to heading-derived sections. |
| Images | `[Done]` | `examples/complex-spec.md` | Add image safety and broken path notes if needed. |
| Lightweight syntax highlighting | `[Done]` | `src/render/html/syntax-highlight.ts`, `src/render/html/syntax/*`, `test/renderer.test.mjs` | Keep language fixtures focused on practical documentation examples. |
| C# syntax highlighting | `[Done]` | `test/renderer.test.mjs` | C# keywords, records, attributes with arguments, built-ins, functions, numbers, comments, strings, operators, and punctuation are covered by the lightweight renderer highlighter. Add additional constructs as regressions appear. |
| Expanded syntax highlighting | `[Done]` | `src/render/html/syntax/languages.ts`, `test/renderer.test.mjs`, `examples/complex-spec.md` | Dependency-free registry now covers JS/TS, C#, Python, Java, Go, Rust, SQL, YAML, Dockerfile, PowerShell, diff, JSON, HTML/XML, CSS, shell, and Markdown fences. Revisit whether a small dependency is justified only if the lightweight highlighter reaches its natural limit. |

### Theming And HTML Polish

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Default `serif` theme | `[Done]` | `src/theme/theme.ts` | Keep visual fixture current. |
| Built-in `sans` theme | `[Done]` | `src/theme/theme.ts` | Add fixture render if visual differences need review. |
| Built-in `technical` theme | `[Done]` | `src/theme/theme.ts` | Add docs examples if theme becomes user-facing. |
| Theme token model | `[Done]` | `src/theme/theme.ts` | Freeze token names before 1.0. |
| CSS variable generation | `[Done]` | `src/theme/theme.ts` | Add snapshot-style tests if CSS churn grows. |
| User theme JSON loading | `[Done]` | `test/renderer.test.mjs`, `examples/themes/warm-report.json` | Add invalid-file tests. |
| Theme scaffolding commands | `[Planned]` | Built-in themes and token validation exist | Generate starter theme JSON from built-in themes, include comments through docs rather than JSON comments, and optionally render a sample preview after generation. |
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
| User-defined config locations | `[Planned]` | CLI has `--config`; VS Code currently loads from workspace/file-root cwd | Broaden config-location UX: document explicit CLI path behavior, add VS Code prompted/remembered config path support, and consider workspace setting support for teams that centralize mdalchemy config outside the rendered folder. |
| CLI override precedence | `[Done]` | `cliOverrides`, `resolveConfig` | Add focused tests for every override. |
| Safe preset | `[Done]` | `--safe`, `resolveConfig` | Add CLI integration coverage. |
| Strict mode | `[Done]` | `src/cli/main.ts`, `test/cli.test.mjs` | Warnings are treated as errors and return exit code `6`. |
| Config validation | `[Done]` | `src/config/config-loader.ts`, `test/config.test.mjs` | Unknown keys warn; invalid section shapes, field types, raw HTML policy, TOC depth, profile, format, and unsupported extensions are diagnosed. |
| Book include/exclude config | `[Done]` | `src/config/config-schema.ts`, `src/config/config-loader.ts`, `test/config.test.mjs` | `book.include` and `book.exclude` are typed, validated, documented, and used by the project book command. |
| Config version handling | `[Done]` | `src/config/config-loader.ts`, `test/config.test.mjs` | Config version `1` is accepted; unsupported versions are config errors. |

### Testing And Documentation

| Feature | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Typecheck script | `[Done]` | `npm run typecheck` | Keep required before release. |
| Unit tests | `[Done]` | `test/*.test.mjs` | Continue adding focused tests for parser regressions. |
| CLI integration tests | `[Done]` | `test/cli.test.mjs` | Covers file output, GFM, frontmatter, help, theme subcommands, project books, stdout fragments, safe mode, invalid combinations, invalid config, strict mode, and exit codes. |
| Complex fixture | `[Done]` | `examples/complex-spec.md`, `examples/complex-spec.html` | Keep synthetic and non-sensitive. |
| Visual/browser verification | `[Done]` | `docs/testing-pipeline.md` | Repeatable desktop and narrow-viewport browser checklist is documented for layout-sensitive changes. |
| Conformance fixture runner | `[Done]` | `test/conformance.test.mjs`, `test/fixtures/conformance` | Seed packs cover representative CommonMark and supported GFM/frontmatter cases. |
| Full CommonMark conformance corpus | `[Done]` | `test/fixtures/conformance/commonmark-0.31.2.json`, `npm run test:commonmark` | Official corpus is vendored and section-level reporting is available. |
| Full CommonMark strict pass | `[Done]` | `npm run test:commonmark:strict` | The official 652-example CommonMark 0.31.2 corpus passes in strict mode. |
| Full GFM conformance corpus | `[Done]` | `test/fixtures/conformance/gfm-0.29.json`, `test/gfm-corpus-report.mjs`, `npm run test:gfm:strict` | Official enabled GFM 0.29 corpus has 0 unexpected failures; 9 emphasis examples are accepted CommonMark-version differences because core targets CommonMark 0.31.2. |
| CI workflow | `[Done]` | `.github/workflows/ci.yml` | Push, pull request, and manual runs verify Node 24 on Linux, macOS, and Windows with install, typecheck, tests, strict CommonMark/GFM corpus checks, packed install smoke, and package dry run. |
| Packed install smoke | `[Done]` | `test/install-smoke.mjs`, `npm run test:install` | The npm tarball is installed into a temporary project, then the installed `mdalchemy` binary renders a file and project book. |
| Package metadata | `[Done]` | `package.json`, `package-lock.json`, `LICENSE` | Repository, bugs, homepage, package manager, Node engine, bin, main/types/exports, published file list, prepack build, pack dry-run script, and MIT license are present. |
| Release workflow | `[Done]` | `.github/workflows/release.yml`, `docs/release.md` | Tag-triggered npm publish uses Node 24, OIDC permissions, tag/package-version validation, full verification, and npm trusted publishing. |
| User README | `[Done]` | `README.md` | README includes current implementation, install-oriented usage commands, option summary, known limitations, examples, and planning document links. |
| Contribution guide | `[Done]` | `CONTRIBUTING.md` | Setup, checks, development guidelines, documentation expectations, and release pointer are documented. |
| Changelog | `[Done]` | `CHANGELOG.md` | Release-visible changes are tracked before tagged releases. |

### Tracker Maintenance Rules

- Update this tracker in the same change as any new user-visible feature.
- Prefer moving a feature from `[Planned]` to `[Partial]` before claiming `[Done]`.
- When marking `[Done]`, include code evidence and at least one test, fixture, or documented manual verification path.
- Keep sensitive or project-specific sample names out of checked fixtures and docs.
- Keep `docs/conformance-status.md` focused on Markdown/CommonMark correctness; keep this roadmap focused on implementation and product status.

## Next Feature Set

This is the current post-`1.1.0` planning batch. These items are intended to make mdalchemy feel smoother in daily authoring workflows, especially inside VS Code, without broadening output format scope.

### Planned Priorities

1. **Preview-only temporary HTML generation**
   - Add a VS Code path that renders to an ephemeral file or webview-only document rather than writing a sibling `.html` file.
   - Keep the existing persistent `Generate HTML` command, but add an explicit preview command or prompt option so users can choose between durable output and temporary preview.
   - Consider temp file lifecycle rules: clean up on panel close where possible, avoid deleting user-selected output, and use predictable names for debugging.
   - Add tests around path handling and command behavior where possible, plus manual extension-host verification.

2. **Watch mode**
   - CLI: support `mdalchemy input.md --watch` and `mdalchemy book . --watch`.
   - VS Code: optionally use watch behavior to refresh preview-only HTML on save.
   - Watch Markdown inputs, config files, theme files, and included project-book files.
   - Debounce filesystem changes and avoid overlapping renders.
   - Surface diagnostics without noisy repeated terminal output.

3. **User-defined config file location**
   - Preserve existing `--config` behavior.
   - Add clearer docs and tests for explicit config paths.
   - Add VS Code support for choosing or remembering a config file location.
   - Consider a workspace setting such as `mdalchemy.configPath` for teams with a shared repo config.

4. **Config generation commands**
   - Add `mdalchemy config init` to write a starter `mdalchemy.config.json`.
   - Add `mdalchemy config print-defaults` for stdout/template workflows.
   - Add `--force` and collision diagnostics.
   - Mirror this in VS Code with a command to create a config in the workspace root.

5. **Theme generation commands**
   - Add `mdalchemy theme init <path>` to generate a starter theme.
   - Support `--extends serif|sans|technical`.
   - Add `mdalchemy theme validate <path>` for fast feedback.
   - Consider `mdalchemy theme preview <path>` later if it can reuse the existing fixture render path.

### Completed From This Batch

- **Expanded syntax highlighting** now covers Python, Java, Go, Rust, SQL,
  YAML, Dockerfile, PowerShell, and diff in addition to the existing language
  set, with expanded C# fixtures and a modular highlighter registry.

### Candidate Killer Features To Discuss

These are not committed scope yet. They should be reviewed before implementation.

- **Live VS Code HTML preview**: a preview panel that updates as the Markdown document changes or saves, using temporary output by default.
- **Searchable project books**: generated project books with client-side search over headings and body text.
- **Book navigation sidebar**: a persistent generated navigation rail for project-book output, separate from the current table of contents.
- **Config/theme gallery command**: choose from polished starter profiles like technical report, design doc, release notes, API notes, and engineering RFC.
- **Mermaid diagram support**: render fenced Mermaid diagrams into the HTML output. This would need a careful dependency/security review before committing.
- **Broken-link and missing-asset report**: an optional diagnostics mode for project books that reports unresolved Markdown links, images, and local assets.

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

Close gaps against CommonMark. The full official 0.31.2 example corpus is
vendored, measurable, and passing in strict mode.

### Focus Areas

- Maintain the strict CommonMark corpus pass as parser changes continue.
- Keep delimiter-stack emphasis and bracket-stack link/image behavior isolated and readable.
- Keep HTML5 named entity coverage generated rather than hand-curated.
- Add targeted regression fixtures for any future corpus or real-document divergence.
- Preserve extension isolation so GFM behavior does not weaken CommonMark mode.

### Tasks

- Use `npm run test:commonmark:strict` before and after CommonMark parser changes.
- Keep seed fixtures for the historically fragile areas: delimiter stacks, bracket stacks, escaped reference labels, code spans, and entity references.
- Track any future conformance regression by section before fixing it.
- Add full supported-GFM fixture coverage after supported extension scope is finalized.

### Tests

- CommonMark seed fixture runner.
- Full CommonMark corpus report.
- Strict CommonMark corpus gate with `npm run test:commonmark:strict`.
- Regression fixtures for every fixed edge case.
- AST debug snapshots where useful.

### Definition Of Done

- Conformance progress is measurable.
- `npm run test:commonmark:strict` passes all 652 official examples.
- Remaining non-core gaps are documented by area rather than as CommonMark corpus failures.

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
- Implement heading-derived section rendering.
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

- Keep the delimiter stack isolated in the inline parser.
- Keep CommonMark examples and seed fixtures as regression coverage.
- Run the strict corpus after any inline parser change.

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
