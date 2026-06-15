# Conformance Status

This document records the current implementation boundary. mdalchemy has a working custom parser and renderer, and the CommonMark core mode now passes the full official CommonMark 0.31.2 example corpus.

The project target remains CommonMark 0.31.2 core conformance. The current release has a strict corpus gate for that target, with GFM extensions kept opt-in and guarded by the official GFM 0.29 fixture corpus.

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
- HTML5 named and numeric entity references.
- Code spans.
- CommonMark delimiter-stack emphasis and strong emphasis.
- Inline links.
- Full, collapsed, and shortcut reference links.
- Images.
- URI and email autolinks.
- GFM strikethrough when the `gfm-strikethrough` extension is enabled.
- GFM literal autolinks when the `gfm-literal-autolink` extension is enabled.
- GFM tagfilter raw HTML filtering when the `gfm-tagfilter` extension is enabled.
- GFM footnote references when the `gfm-footnote` extension is enabled.
- Raw HTML inline tags.

Document/rendering coverage:

- Renderer-neutral AST.
- Heading-derived title.
- Stable heading slugs.
- Duplicate heading slug suffixes.
- Optional heading-derived section wrappers.
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
- Strict official CommonMark 0.31.2 corpus verification through `npm run test:commonmark:strict`.
- Official GFM 0.29 corpus reporting through `npm run test:gfm`.
- Strict official GFM 0.29 unexpected-failure verification through `npm run test:gfm:strict`.

## Known Gaps

There are no known failures in the official CommonMark 0.31.2 example corpus. Remaining known gaps are outside that strict core-corpus pass:

- Source ranges are useful for diagnostics but are approximate in nested virtual lines.
- Full exact GFM 0.29 core conformance would require a legacy CommonMark 0.29 emphasis mode. mdalchemy intentionally keeps CommonMark 0.31.2 semantics in core mode; the GFM strict report therefore accepts nine documented emphasis differences from the older GFM baseline.

## Full CommonMark Corpus Baseline

The repository vendors the official 652-example CommonMark 0.31.2 corpus at
`test/fixtures/conformance/commonmark-0.31.2.json`. The report command compares
mdalchemy fragment output against the official HTML examples and strips only the
official terminal newline so formatting style does not hide parser behavior.

Current baseline:

```text
CommonMark 0.31.2 corpus: 652/652 examples passed
```

Completed official CommonMark sections:

- All block-level sections: tabs, thematic breaks, headings, code blocks, HTML blocks, link reference definitions, paragraphs, blank lines, block quotes, list items, and lists.
- All inline sections: backslash escapes, entity and numeric references, code spans, emphasis and strong emphasis, links, images, autolinks, raw HTML, hard line breaks, soft line breaks, and textual content.

Remaining official CommonMark sections:

- None.

## Full GFM Corpus Baseline

The repository vendors the official enabled GFM 0.29 example corpus at
`test/fixtures/conformance/gfm-0.29.json`. It is extracted from the
`github/cmark-gfm` `test/spec.txt` source with
`test/fixtures/conformance/extract-gfm-corpus.mjs`.

The report command maps each official example tag to the matching mdalchemy
extension:

- `table` -> `gfm-table`.
- `strikethrough` -> `gfm-strikethrough`.
- `autolink` -> `gfm-literal-autolink`.
- `tagfilter` -> `gfm-tagfilter`.

Current baseline:

```text
GFM 0.29 corpus: 661/670 examples matched exactly; 9 accepted CommonMark-version differences; 0 unexpected failures
```

Official GFM extension sections currently have no unexpected failures:

- Tables: 8/8 exact.
- Strikethrough: 2/2 exact.
- Autolinks extension: 11/11 exact.
- Disallowed Raw HTML/tagfilter: 1/1 exact.

The official cmark-gfm fixture runner marks the task list examples as
`disabled`, so they are omitted from the enabled 670-example corpus. mdalchemy
keeps task list behavior covered in `test/fixtures/conformance/gfm-supported.seed.json`.

## Verification Available Now

Run:

```sh
npm run typecheck
npm test
npm run test:conformance
npm run test:commonmark
npm run test:commonmark:strict
npm run test:gfm
npm run test:gfm:strict
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
- A strict CommonMark corpus gate that exits non-zero if any official example diverges.
- A full GFM corpus report that prints exact, accepted, and unexpected counts by section.
- A strict GFM corpus gate that exits non-zero for unexpected failures.

## Next Conformance Work

Recommended next steps:

1. Keep `npm run test:commonmark:strict` green for every CommonMark parser change.
2. Add focused seed fixtures whenever a corpus edge case regresses.
3. Keep GFM accepted differences limited to CommonMark-version mismatches, not extension behavior.
4. Continue improving source-range precision where diagnostics need exact nested positions.
