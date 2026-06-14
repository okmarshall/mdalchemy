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
- JSON-driven conformance fixture runner for CommonMark 0.31.2 seed fixtures and supported GFM/frontmatter seed fixtures.
- Official CommonMark 0.31.2 corpus reporting through `npm run test:commonmark`.

## Known Gaps

These are the important areas to close before claiming full CommonMark conformance:

- Emphasis and strong emphasis still use a hardened simplified delimiter search, not the full CommonMark delimiter stack algorithm.
- Link parsing still needs CommonMark bracket-stack behavior for nested links, labels, images, and emphasis/link precedence.
- Source ranges are useful for diagnostics but are approximate in nested virtual lines.
- GFM extension support covers pipe tables, task lists, strikethrough, footnotes, and literal autolinks, but full upstream GFM fixture coverage has not been vendored yet.
- PDF and other output formats are not implemented.

## Full CommonMark Corpus Baseline

The repository vendors the official 652-example CommonMark 0.31.2 corpus at
`test/fixtures/conformance/commonmark-0.31.2.json`. The report command compares
mdalchemy fragment output against the official HTML examples and strips only the
official terminal newline so formatting style does not hide parser behavior.

Current baseline:

```text
CommonMark 0.31.2 corpus: 589/652 examples passed
```

Completed official CommonMark sections:

- All block-level sections: tabs, thematic breaks, headings, code blocks, HTML blocks, link reference definitions, paragraphs, blank lines, block quotes, list items, and lists.
- Inline support sections for backslash escapes, entity and numeric references, code spans, images, autolinks, raw HTML, hard line breaks, soft line breaks, and textual content.

Remaining official CommonMark sections:

- Emphasis and strong emphasis: 85/132.
- Links: 74/90.

## Verification Available Now

Run:

```sh
npm run typecheck
npm test
npm run test:conformance
npm run test:commonmark
npm run render:example
```

The test suite includes:

- Parser unit coverage.
- Renderer behavior coverage.
- Config loader validation coverage.
- CLI integration coverage, including stdout fragments, safe mode, strict mode, invalid config, and usage errors.
- A complex fixture test that verifies `examples/complex-spec.md` renders exactly to `examples/complex-spec.html`.
- A conformance fixture runner with seed fixture packs in `test/fixtures/conformance`.
- A full CommonMark corpus report that prints pass/fail counts by section.

## Next Conformance Work

Recommended next steps:

1. Use `npm run test:commonmark` before and after every CommonMark parser hardening change.
2. Replace simplified emphasis parsing with the full delimiter stack algorithm.
3. Replace greedy link parsing with a CommonMark bracket stack so nested links/images and emphasis/link precedence resolve correctly.
4. Promote `npm run test:commonmark:strict` into the normal CI/release gate once all 652 examples pass.
5. Add full supported-GFM fixture packs after deciding which GFM extensions are part of the supported surface.
