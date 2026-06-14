# Conformance Status

This document records the current implementation boundary. mdalchemy has a working custom parser and renderer, but it should not yet be described as a fully conforming CommonMark implementation.

The project target remains CommonMark 0.31.2 core conformance. The current release is a broad vertical slice that makes the full pipeline executable and testable.

## Implemented In The Current Parser

Block coverage:

- Paragraphs.
- ATX headings.
- Setext headings.
- Thematic breaks.
- Fenced code blocks with language/info strings.
- Indented code blocks in common cases.
- Block quotes, including common lazy continuation cases.
- Ordered lists.
- Bullet lists.
- Nested lists.
- Tight and loose list rendering in common cases.
- Raw HTML blocks for common block tags, comments, declarations, processing instructions, CDATA, and script-like tags.
- Link reference definitions.
- GFM pipe tables when the `gfm-table` extension is enabled.
- GFM task list items when the `gfm-task-list` extension is enabled.
- GFM footnote definitions when the `gfm-footnote` extension is enabled.
- Leading YAML-style frontmatter when the `frontmatter` extension is enabled.

Inline coverage:

- Text.
- Soft breaks.
- Hard breaks.
- Backslash escapes.
- Named and numeric entity references for a small built-in entity set.
- Code spans.
- Simple emphasis.
- Simple strong emphasis.
- Triple delimiter emphasis/strong nesting.
- Inline links.
- Full, collapsed, and shortcut reference links.
- Images.
- URI and email autolinks.
- GFM strikethrough when the `gfm-strikethrough` extension is enabled.
- GFM literal autolinks when the `gfm-literal-autolink` extension is enabled.
- GFM footnote references when the `gfm-footnote` extension is enabled.
- Raw HTML inline tags.

Document/rendering coverage:

- Renderer-neutral AST.
- Heading-derived title.
- Stable heading slugs.
- Duplicate heading slug suffixes.
- Table of contents generation.
- Standalone HTML output.
- HTML fragment output.
- Raw HTML policies: `allow`, `escape`, and `strip`.
- Safe URL filtering for HTML links and images.
- Semantic, scroll-safe HTML table rendering for GFM pipe tables.
- Accessible disabled-checkbox rendering for GFM task list items.
- Endnote rendering for referenced GFM footnotes.
- Lightweight syntax highlighting for JS/TS, C#, JSON, HTML/XML, CSS, shell, and Markdown code fences.
- Built-in theme CSS.
- User theme loading through config or CLI theme path.
- Theme token validation for unknown tokens, unsafe CSS fragments, color-like tokens, length-like tokens, and font stack emptiness.
- Config validation for unknown keys, section shapes, field types, supported Markdown extensions, raw HTML policy, TOC depth, and profile/format support.
- CLI strict mode, which treats warnings as errors.

## Known Gaps

These are the important areas to close before claiming full CommonMark conformance:

- Emphasis and strong emphasis use a simplified delimiter search, not the full CommonMark delimiter stack algorithm.
- Entity support includes common named entities and numeric entities, but not the full HTML entity table.
- Link destination and title parsing handles common forms but is not yet exhaustive.
- HTML block detection covers common categories but needs direct comparison against every CommonMark HTML block example.
- List item continuation, indentation, and looseness are good for common documents but still need CommonMark example-by-example hardening.
- Source ranges are useful for diagnostics but are approximate in nested virtual lines.
- Tabs are handled for indentation helpers, but full tab behavior needs conformance tests.
- GFM extension support covers pipe tables, task lists, strikethrough, footnotes, and literal autolinks, but it has not been checked against an official GFM fixture suite.
- PDF and other output formats are not implemented.

## Verification Available Now

Run:

```sh
npm run typecheck
npm test
npm run render:example
```

The test suite includes:

- Parser unit coverage.
- Renderer behavior coverage.
- Config loader validation coverage.
- CLI integration coverage, including stdout fragments, safe mode, strict mode, invalid config, and usage errors.
- A complex fixture test that verifies `examples/complex-spec.md` renders exactly to `examples/complex-spec.html`.

## Next Conformance Work

Recommended next steps:

1. Vendor or download CommonMark 0.31.2 examples into a fixture file.
2. Add an HTML fragment conformance runner.
3. Report pass/fail counts by CommonMark section.
4. Replace simplified emphasis parsing with the full delimiter stack algorithm.
5. Expand entity support to the complete named entity table.
6. Harden list and blockquote continuation against the official examples.
7. Keep extension behavior behind explicit extension flags and add official GFM fixtures if the supported extension surface grows.
