---
name: mdalchemy-markdown-authoring
description: Use when writing or editing Markdown that will be rendered by mdalchemy, especially repository documentation, README files, or project documentation books. Guides agents to use mdalchemy-supported CommonMark, supported GFM extensions, frontmatter, book inclusion controls, links, headings, tables, code fences, and validation commands.
metadata:
  short-description: Write Markdown that renders well with mdalchemy
---

# mdalchemy Markdown Authoring

Use this skill when creating or editing `.md` or `.markdown` files that should render cleanly through `mdalchemy` as standalone HTML or as part of a project documentation book.

## Authoring Workflow

1. Decide whether the file is intended for a single-file render, a project book, or both.
2. Use CommonMark 0.31.2-compatible Markdown as the baseline.
3. Use supported GFM syntax only when the project render enables `--gfm`, or when the file will be included by `mdalchemy book`.
4. Use leading frontmatter only when metadata is useful; books enable frontmatter parsing by default.
5. Prefer clear structure over clever Markdown. The HTML renderer rewards semantic headings, lists, tables, code fences, links, and images.
6. Validate important docs with `mdalchemy file.md -o file.html --gfm --frontmatter --toc` or `mdalchemy book . -o project-docs.html`.

## Supported Markdown Shape

Core Markdown support follows CommonMark 0.31.2:

- Paragraphs, soft breaks, and hard breaks.
- ATX headings (`#` through `######`) and setext headings.
- Thematic breaks.
- Block quotes, including nested block quotes.
- Bullet lists, ordered lists, nested lists, tight lists, and loose lists.
- Fenced code blocks and indented code blocks.
- Inline code spans.
- Emphasis and strong emphasis.
- Inline links, reference links, shortcut reference links, and images.
- URI and email autolinks in angle brackets.
- Backslash escapes and HTML entity references.
- Raw HTML blocks and inline raw HTML when raw HTML is allowed by the render configuration.

Supported GitHub Flavored Markdown extensions:

- Pipe tables: `gfm-table`.
- Task lists: `gfm-task-list`.
- Strikethrough: `gfm-strikethrough`.
- Footnotes: `gfm-footnote`.
- Literal autolinks such as `www.example.com`: `gfm-literal-autolink`.
- Disallowed raw HTML filtering: `gfm-tagfilter`.

The `--gfm` flag enables the supported GFM bundle. The `frontmatter` extension is separate from GFM, but `mdalchemy book` enables both GFM and frontmatter parsing by default because project READMEs commonly need them.

## Headings, TOC, And Sections

Use one clear `#` heading per document when possible. Use heading levels in order: do not jump from `##` straight to `####` unless the hierarchy really needs it.

Heading text drives:

- The generated document title when no explicit title is provided.
- Heading anchors.
- Table of contents entries.
- Optional semantic sections.
- Optional collapsible sections.

When `--sections` or `--collapsible-sections` is used, each heading starts a section. That section ends before the next heading of the same or higher level. Lower-level headings become nested sections. Good heading hierarchy is therefore the easiest way to get useful collapsible output.

Duplicate headings are allowed; mdalchemy adds stable suffixes to duplicate slugs. Prefer unique headings anyway so links and the table of contents are easier for humans to scan.

## Project Book Frontmatter

`mdalchemy book` recursively discovers Markdown files using the configured include and exclude patterns, then renders them into one standalone HTML book. It rewrites links between included Markdown files into links inside that generated book.

To exclude a Markdown file from a project book, put this frontmatter at the very start of the file:

```yaml
---
mdalchemy:
  include: false
---
```

Equivalent compact forms are also supported:

```yaml
---
mdalchemy.include: false
---
```

```yaml
---
mdalchemy: false
---
```

Use book exclusion for scratch notes, generated implementation logs, private/internal details, or Markdown files that are useful in the repository but should not appear in public documentation output.

You can give a file a book-specific title with top-level `title` frontmatter:

```yaml
---
title: "Architecture Notes"
---
```

Keep frontmatter simple. mdalchemy reads a small YAML-like leading block delimited by `---`; it is not a full YAML processing layer.

## Links And Images

Use relative links between repository Markdown files:

```md
See [Configuration](docs/configuration.md) and [Parser Details](docs/parser.md#parser-details).
```

For project books, links to included Markdown files are rewritten into same-document links. Links to excluded or missing Markdown files may produce diagnostics, so keep documentation links accurate.

Use relative paths for images and provide meaningful alt text:

```md
![Rendered table example](images/table-output.png)
```

Avoid absolute local filesystem paths. They will not be portable for other users or CI.

## Tables

Use GFM pipe tables when tabular data improves readability:

```md
| Option | Default | Purpose |
| --- | ---: | --- |
| `--toc` | `auto` | Adds a table of contents when useful. |
| `--safe` | `false` | Escapes raw HTML and filters unsafe URLs. |
```

Alignment markers are supported:

- `---` for left/default alignment.
- `---:` for right alignment.
- `:---:` for center alignment.

Escape literal pipes in table cells as `\|`, or put pipe-heavy content in code spans. mdalchemy wraps rendered tables in a scroll-safe region, but keep cells concise and avoid long unbroken prose where possible.

## Code Blocks

Prefer fenced code blocks over indented code blocks for authored documentation. Always add a language info string when the language is known:

````md
```ts
export function render(value: string): string {
  return value.trim();
}
```
````

mdalchemy has lightweight built-in syntax highlighting for these language labels:

- JavaScript and TypeScript: `js`, `jsx`, `mjs`, `cjs`, `ts`, `tsx`, `javascript`, `typescript`.
- C#: `cs`, `c#`, `csharp`.
- JSON: `json`, `jsonc`.
- HTML/XML/SVG: `html`, `xml`, `svg`.
- CSS/SCSS: `css`, `scss`.
- Shell: `bash`, `sh`, `shell`, `zsh`.
- Markdown: `md`, `markdown`.

Unknown fence languages still render safely as code, just without specialized highlighting.

## Lists, Tasks, And Footnotes

For nested lists, indent child items consistently under the parent item content:

```md
- Parent item
  - Child item
  - Child item with `code`
```

Use blank lines inside a list item when you want a loose list with paragraph spacing.

Task list items require the GFM task-list extension:

```md
- [x] Draft the release notes.
- [ ] Verify the generated HTML.
```

Footnotes require the GFM footnote extension:

```md
This claim needs context.[^context]

[^context]: Add a concise source or explanation here.
```

In project books, mdalchemy prefixes footnote labels internally per file so repeated labels do not collide. Human-readable labels are still easier to maintain.

## Raw HTML And Safety

Prefer Markdown syntax over raw HTML. Raw HTML may be allowed in trusted renders, escaped in safe mode, or filtered by the GFM tagfilter extension.

If raw HTML is necessary, keep it simple and semantic. Avoid `<script>`, custom interactive widgets, MDX/JSX, inline event handlers, and style-heavy fragments unless the render configuration is known to allow them.

## Avoid Depending On Unsupported Markdown Extras

Do not assume special rendering for syntax outside mdalchemy's supported CommonMark and GFM feature set. In particular, avoid relying on:

- GitHub alert blocks such as `> [!NOTE]`.
- Mermaid diagram rendering.
- Math syntax.
- Definition lists.
- Wiki links.
- Emoji shortcodes.
- Heading attribute syntax such as `{#custom-id}`.
- MDX or JSX.
- Automatic issue, PR, or username linking.

If you need one of these concepts, express it with supported Markdown: headings, block quotes, fenced code blocks, tables, links, and images.

## Useful Render Commands

Single file:

```sh
mdalchemy README.md -o README.html --gfm --frontmatter --toc
```

Single file with sections:

```sh
mdalchemy README.md -o README.html --gfm --frontmatter --toc --sections
```

Single file with collapsible sections:

```sh
mdalchemy README.md -o README.html --gfm --frontmatter --toc --collapsible-sections
```

Project book:

```sh
mdalchemy book . -o project-docs.html
```

When working inside the mdalchemy source repository before installation, replace `mdalchemy` with `node dist/cli/main.js` after running `npm run build`.
