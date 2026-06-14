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
- Semantic HTML table rendering for GFM pipe tables.
- Lightweight syntax highlighting for JS/TS, C#, JSON, HTML/XML, CSS, shell, and Markdown code fences.
- Built-in theme CSS.
- User theme loading through config or CLI theme path.

## Known Gaps

These are the important areas to close before claiming full CommonMark conformance:

- Emphasis and strong emphasis use a simplified delimiter search, not the full CommonMark delimiter stack algorithm.
- Entity support includes common named entities and numeric entities, but not the full HTML entity table.
- Link destination and title parsing handles common forms but is not yet exhaustive.
- HTML block detection covers common categories but needs direct comparison against every CommonMark HTML block example.
- List item continuation, indentation, and looseness are good for common documents but still need CommonMark example-by-example hardening.
- Source ranges are useful for diagnostics but are approximate in nested virtual lines.
- Tabs are handled for indentation helpers, but full tab behavior needs conformance tests.
- GFM extension support is currently limited to pipe tables.
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
- CLI integration coverage.
- A complex fixture test that verifies `examples/complex-spec.md` renders exactly to `examples/complex-spec.html`.

## Next Conformance Work

Recommended next steps:

1. Vendor or download CommonMark 0.31.2 examples into a fixture file.
2. Add an HTML fragment conformance runner.
3. Report pass/fail counts by CommonMark section.
4. Replace simplified emphasis parsing with the full delimiter stack algorithm.
5. Expand entity support to the complete named entity table.
6. Harden list and blockquote continuation against the official examples.
7. Keep additional GFM extensions behind explicit extension flags.
