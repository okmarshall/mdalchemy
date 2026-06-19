# Changelog

All notable user-facing changes should be recorded here before a release tag is
created.

## Unreleased

## 1.2.0 - 2026-06-20

### Added

- Searchable project books, enabled by default, with `book.search`,
  `--search` / `--no-search`, and VS Code book-generation prompt controls.
- Persistent project-book navigation sidebars, enabled by default, with
  `book.sidebar`, `--sidebar` / `--no-sidebar`, and VS Code prompt controls.
- Mermaid diagram rendering for fenced `mermaid` and `mmd` code blocks in
  standalone HTML, including an embedded pinned Mermaid runtime, strict
  initialization, scroll-safe theme styling, and readable source fallbacks.
- Collapsible book table-of-contents navigation with
  `html.collapsibleTableOfContents`, `--collapsible-toc` /
  `--no-collapsible-toc`, and VS Code book prompt controls.
- Floating standalone document shortcuts for returning to the top of the
  document and expanding or collapsing generated section and TOC controls.
- Expanded dependency-free syntax highlighting for Python, Java, Go, Rust, SQL,
  YAML, Dockerfile, PowerShell, and diff fences, with broader C# attribute and
  record coverage.
- VS Code `Preview HTML` command for temporary live HTML previews without
  writing an output file.
- Reusable watch-render controller for debounced live preview updates, with a
  VS Code preview title-bar `Save Preview HTML` action for rendering the current
  Markdown state and persisting it as HTML.
- Repository-wide `AGENTS.md` guidance for coding agents working in this
  project.

### Changed

- VS Code book-generation prompts now ask for sidebar and search choices before
  navigation details, use sidebar/navigation wording when no inline TOC is
  selected, and skip navigation-detail prompts when both inline TOC and sidebar
  output are disabled.
- Project-book output now keeps content centered when the sidebar is enabled,
  uses a wider sidebar, and explicitly hides closed collapsible section and TOC
  bodies so hidden content does not reserve blank space.
- VS Code preview save behavior now uses native title-bar actions and the active
  webview context instead of custom in-page save controls.
- Renderer, book, CLI, config, theme CSS, and syntax-highlighting internals were
  split into smaller focused modules, with the broad CLI and renderer tests
  reorganized into behavior-specific suites.
- The implementation roadmap now tracks the post-`1.1.0` authoring workflow
  priorities.

### Fixed

- VSIX packaging now uses the `package.json` `files` allowlist as the single
  packaging strategy and removes the conflicting `.vscodeignore` setup.

## 1.1.0 - 2026-06-15

### Added

- VS Code extension command for rendering the current Markdown file to a sibling
  HTML file and previewing it in an integrated webview.
- VS Code extension folder command for generating a recursive
  `mdalchemy-book.html` project documentation book.
- VS Code command icons and a shorter `mdalchemy: Generate HTML` command title.
- Guided VS Code Command Palette flow for choosing project-book root, theme,
  section rendering, table of contents behavior, and output file.

## 1.0.0 - 2026-06-15

### Added

- Cross-platform Node 24 CI for Linux, macOS, and Windows.
- Packed npm install smoke test for the published CLI path.
- Tag-triggered npm release workflow using GitHub Actions OIDC.
- Release and contribution documentation.
- Explicit config version handling for config schema version `1`.
- Custom Markdown parser with full CommonMark 0.31.2 corpus coverage in core
  mode.
- Supported GFM extensions: pipe tables, task lists, strikethrough, footnotes,
  literal autolinks, and tagfilter.
- Standalone and fragment HTML rendering.
- Built-in `serif`, `sans`, and `technical` themes with custom JSON theme
  support.
- Syntax highlighting for common code fences including C#.
- Table of contents, heading anchors, semantic sections, and collapsible
  sections.
- Project documentation books through `mdalchemy book`.
- Safe rendering preset for raw HTML and unsafe URLs.
- JSON configuration with validation, CLI overrides, and strict diagnostics.
