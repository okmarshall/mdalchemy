# Changelog

All notable user-facing changes should be recorded here before a release tag is
created.

## Unreleased

No unreleased changes yet.

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
