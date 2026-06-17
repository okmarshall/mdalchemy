# Rendering And Theming

## Goal

Rendering turns the Markdown AST into beautiful semantic HTML. The parser creates document structure. The renderer presents it. Themes make it beautiful.

## Rendering Principles

- The HTML renderer consumes AST nodes and derived document structures.
- The HTML renderer does not parse Markdown.
- The HTML renderer does not mutate the parser AST.
- Themes affect presentation, not document meaning.
- HTML output should be semantic and accessible.
- Standalone HTML should work offline.

## HTML Output Modes

- `html`: complete standalone HTML file.
- `html-fragment`: internal mode for tests and possible API use.

## HTML Document Structure

Standalone HTML should look like:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Document title</title>
    <style>
      /* theme css */
    </style>
  </head>
  <body>
    <article id="top" class="mda-document">
      <!-- optional table of contents -->
      <main class="mda-content">
        <!-- rendered markdown -->
      </main>
    </article>
    <nav class="mda-floating-actions" aria-label="Document shortcuts">
      <a class="mda-floating-action mda-back-to-top" href="#top">Go to top</a>
      <!-- optional collapse/expand controls when the document has collapsible regions -->
    </nav>
  </body>
</html>
```

The exact class names should be stable and documented. Rendered Markdown tables should use `mda-table-scroll` as an overflow boundary so wide technical tables stay readable without widening the whole document surface.

## HTML Node Mapping

| AST node | HTML output |
| --- | --- |
| `document` | `<article>` or fragment root |
| `paragraph` | `<p>` |
| `heading` | `<h1>` to `<h6>` |
| `thematicBreak` | `<hr>` |
| `blockquote` | `<blockquote>` |
| `list` ordered | `<ol>` |
| `list` unordered | `<ul>` |
| `listItem` | `<li>` |
| `table` | `<div class="mda-table-scroll"><table>` with `<thead>` and `<tbody>` |
| `codeBlock` | `<pre><code>` |
| `htmlBlock` | raw, escaped, or stripped by policy |
| `text` | escaped text |
| `softBreak` | newline by default |
| `hardBreak` | `<br>` |
| `codeSpan` | `<code>` |
| `emphasis` | `<em>` |
| `strong` | `<strong>` |
| `link` | `<a href>` |
| `image` | `<img>` |
| `htmlInline` | raw, escaped, or stripped by policy |

## Section Rendering

mdalchemy can optionally render heading-derived sections.

Without section rendering:

```html
<h1 id="intro">Intro</h1>
<p>Text.</p>
<h2 id="details">Details</h2>
<p>Text.</p>
```

With section rendering:

```html
<section class="mda-section mda-section-level-1" aria-labelledby="intro">
  <h1 id="intro">Intro</h1>
  <p>Text.</p>
  <section class="mda-section mda-section-level-2" aria-labelledby="details">
    <h2 id="details">Details</h2>
    <p>Text.</p>
  </section>
</section>
```

With collapsible section rendering:

```html
<section class="mda-section mda-section-level-1 mda-section-collapsible" aria-labelledby="intro">
  <details class="mda-section-details" open>
    <summary class="mda-section-summary">
      <h1 id="intro">
        Intro
        <a class="mda-heading-anchor mda-heading-anchor-after" href="#intro" aria-hidden="true">#</a>
      </h1>
    </summary>
    <div class="mda-section-body">
      <p>Text.</p>
    </div>
  </details>
</section>
```

This is controlled by config, or by `--sections` / `--no-sections` and
`--collapsible-sections` / `--no-collapsible-sections` in the CLI, because
conformance tests need raw CommonMark HTML fragments without extra wrappers.
Collapsible sections use native browser controls, render expanded by default,
and do not require JavaScript. In collapsible summaries, heading permalink
anchors trail the heading text so the collapse caret and permalink marker do
not compete for the same left edge.

## Heading Anchors

Heading anchors should be derived from visible heading text.

Slug generation rules:

1. Normalize to lowercase.
2. Remove or replace punctuation.
3. Collapse whitespace to hyphens.
4. Avoid duplicate IDs by adding numeric suffixes.
5. Preserve stable IDs across runs for the same document content.

Example:

```text
## API Design
## API Design
```

IDs:

```text
api-design
api-design-2
```

HTML:

```html
<h2 id="api-design">
  <a class="mda-heading-anchor" href="#api-design" aria-hidden="true">#</a>
  API Design
</h2>
```

The anchor symbol can be visually subtle or hidden until hover.

## Table Of Contents

The table of contents should be generated from the derived outline.

Config:

```json
{
  "html": {
    "tableOfContents": true,
    "collapsibleTableOfContents": false,
    "tocDepth": 3
  }
}
```

HTML:

```html
<nav class="mda-toc" aria-label="Table of contents">
  <ol>
    <li><a href="#intro">Intro</a></li>
  </ol>
</nav>
```

The TOC should not appear when there are fewer than two headings unless explicitly forced.
When `collapsibleTableOfContents` is enabled, TOC entries with children should
render with native `<details>` / `<summary>` controls. Top-level entries should
be open, and nested child branches should be closed by default.

Standalone HTML includes a bottom-right shortcut cluster. It always links back
to `#top`; when the rendered document contains collapsible sections or a
collapsible TOC, it also includes `Collapse all` and `Expand all` controls for
the generated `<details>` regions.

The shortcut markup and first-party script are generated by
`src/render/html/document-actions.ts`. VS Code webviews import the same control
script marker before adding a CSP nonce, so future document actions should be
added there rather than hand-wired into the shell and webview separately.

## Raw HTML Policy

CommonMark includes raw HTML. For a CLI that renders local documents, raw HTML may be useful, but it has security and portability implications.

Policies:

- `allow`: emit raw HTML nodes as parsed.
- `escape`: render raw HTML as text.
- `strip`: omit raw HTML nodes.

Default for v1:

- `allow` in normal mode, matching Markdown expectations.
- `escape` in `safe` preset.

Unsafe URL policy should be separate from raw HTML policy.

## URL Safety

HTML attributes must be escaped. Link and image URLs should be checked.

Allowed by default:

- Relative URLs.
- Fragment URLs.
- `http:`.
- `https:`.
- `mailto:`.

Unsafe in safe mode:

- `javascript:`.
- `vbscript:`.
- Most `data:` URLs.

If a link is unsafe:

- In normal mode, warn and render with escaped href only if policy allows.
- In safe mode, omit `href` or render text only.

## Theme Philosophy

Themes should make documents beautiful without changing Markdown semantics.

A good theme controls:

- Typography.
- Text color.
- Background color.
- Accent color.
- Page width.
- Vertical rhythm.
- Heading scale.
- Code block style.
- Inline code style.
- Link style.
- Block quote style.
- List spacing.
- Table style when table extension exists.
- Print behavior.

The built-in stylesheet is assembled by `src/theme/css.ts` from focused
fragments under `src/theme/css/`. Add new style rules to the fragment that owns
the rendered feature, then let `themeToCss` concatenate the fragments.

Themes should not:

- Inject scripts.
- Hide document content.
- Change heading levels.
- Rewrite links.
- Depend on network resources by default.

## Theme Tokens

Theme tokens should be named by purpose.

### Color Tokens

```text
color.background
color.document
color.surface
color.text
color.muted
color.accent
color.accentSoft
color.secondary
color.accentText
color.border
color.shadow
color.codeBackground
color.codeText
color.codeBorder
```

### Font Tokens

```text
font.body
font.heading
font.mono
font.size.base
font.size.small
font.size.code
lineHeight.body
lineHeight.heading
```

### Layout Tokens

```text
layout.maxWidth
layout.pagePadding
layout.sectionGap
layout.radius
layout.borderWidth
```

### Spacing Tokens

```text
space.block
space.paragraph
space.headingBefore
space.headingAfter
space.list
space.code
```

### Syntax Tokens

```text
syntax.keyword
syntax.string
syntax.number
syntax.comment
syntax.function
syntax.property
syntax.builtin
syntax.operator
syntax.punctuation
syntax.tag
syntax.attribute
```

The HTML renderer includes lightweight syntax highlighting for JS/TS, C#, Python, Java, Go, Rust, SQL, YAML, Dockerfile, PowerShell, diff, JSON, HTML/XML, CSS, shell, and Markdown fences. These syntax tokens control the generated token span colors.

## CSS Variable Mapping

Each token maps to a CSS variable:

```css
:root {
  --mda-color-background: #ffffff;
  --mda-color-document: #fffefa;
  --mda-color-text: #202124;
  --mda-layout-maxWidth: 1440px;
}
```

CSS classes use variables:

```css
.mda-document {
  width: min(calc(100% - clamp(24px, 4vw, 80px)), var(--mda-layout-maxWidth));
  color: var(--mda-color-text);
  background: var(--mda-color-document);
}
```

This makes user theme overrides straightforward.

## Built-In Themes

### `serif`

Purpose:

- Long-form reading.
- Essays.
- Reports.
- LLM-generated prose.
- Default output.

Characteristics:

- Serif body font.
- Moderate line length.
- Soft page background with a bright document surface.
- Mixed accent palette for warmth, structure, and links.
- Strong heading hierarchy.
- Dark code blocks with built-in syntax highlighting.

### `sans`

Purpose:

- General documentation.
- Notes.
- Modern clean pages.

Characteristics:

- System sans font.
- Neutral color palette.
- Clear hierarchy.
- Compact spacing.

### `technical`

Purpose:

- Engineering docs.
- API notes.
- Code-heavy Markdown.

Characteristics:

- Wider measure.
- Strong code block contrast.
- Clear inline code.
- Dense lists.
- Optional table of contents emphasis.

### `print`

Purpose:

- Browser printing.

Characteristics:

- Print media rules.
- Black text on white.
- Avoid heavy backgrounds.
- Page-break controls.

`print` can be a preset layered over another theme rather than a standalone visual theme.

## User Theme Config

Example:

```json
{
  "name": "lab-notes",
  "extends": "technical",
  "tokens": {
    "color.background": "#fbfbf8",
    "color.text": "#1d252c",
    "color.accent": "#005f73",
    "layout.maxWidth": "920px",
    "font.body": "Inter, ui-sans-serif, system-ui, sans-serif",
    "font.mono": "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
  }
}
```

Validation:

- `name` must be present for theme files.
- `extends` currently resolves built-in theme names only.
- Unknown tokens produce `MDA_THEME_UNKNOWN_TOKEN` warnings. In CLI strict mode, warnings become errors.
- Token values are validated by category: colors/syntax colors, length-like spacing/layout/font-size tokens, line-height values, and font stacks.
- Dangerous CSS fragments such as semicolons, braces, `url()`, and `expression()` are rejected.

## Theme Resolution

Resolution order:

1. Built-in theme base.
2. Extended built-in parent theme, if a user theme declares `extends`.
3. User theme tokens.
4. CLI overrides, if later supported.

Custom theme files do not currently form a registry, so custom-to-custom inheritance is intentionally not implemented. If a theme extends an unknown parent, mdalchemy reports `MDA_THEME_UNKNOWN_PARENT` and falls back to base tokens for the unresolved parent.

## Theme File Discovery

Theme references can be:

- Built-in name: `serif`.
- Relative path: `./themes/my-theme.json`.
- Absolute path.

Config example:

```json
{
  "theme": "./themes/report.json"
}
```

CLI example:

```text
mdalchemy report.md -o report.html --theme ./themes/report.json
```

## HTML Escaping

The renderer needs dedicated escaping helpers:

- `escapeText`.
- `escapeAttribute`.
- `escapeUrlAttribute`.
- `escapeRawHtmlAsText`.

Do not reuse one escaping function for all contexts.

Example:

```ts
function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
```

Attribute escaping must also handle quotes.

## Asset Handling

Version 1 should avoid asset copying where possible. Standalone HTML should inline CSS and rely on local image links from Markdown.

Future asset support:

- Copy local images into an output directory.
- Embed small images as data URLs.
- Download remote assets only behind explicit flags.
- Package fonts only when user provides local files.

## Print Support

The HTML renderer should include basic print CSS:

```css
@media print {
  body {
    background: white;
  }

  .mda-document {
    max-width: none;
    box-shadow: none;
  }

  pre,
  blockquote {
    break-inside: avoid;
  }
}
```

This makes browser printing useful early.

## Renderer Tests

Renderer tests should cover:

- Escaping text.
- Escaping attributes.
- Links.
- Images.
- Raw HTML policies.
- Heading anchors.
- Duplicate slugs.
- Standalone document template.
- Fragment output.
- Theme CSS variables.
- TOC output.
- Section wrappers.
- Code block classes.
- Tight and loose list rendering.

Snapshot tests are useful, but they should not be the only tests. Important security behavior needs explicit assertions.
