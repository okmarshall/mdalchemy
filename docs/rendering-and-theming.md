# Rendering And Theming

## Goal

Rendering turns the Markdown AST into an output format. The first output format is HTML, but mdalchemy should avoid treating HTML as the whole product. The parser creates document structure. The renderer presents it. Themes make it beautiful.

## Rendering Principles

- Renderers consume AST nodes and derived document structures.
- Renderers do not parse Markdown.
- Renderers do not mutate the parser AST.
- Themes affect presentation, not document meaning.
- HTML output should be semantic and accessible.
- Standalone HTML should work offline.
- Future PDF output should reuse document structure and as much theme information as practical.

## Output Formats

### Version 1

- `html`: complete standalone HTML file.
- `html-fragment`: internal mode for tests and possible API use.

### Future

- `pdf`: likely via print-oriented HTML and a browser engine.
- `docx`: possible long-term renderer using document model.
- `plain`: text-only output for testing, terminal preview, or accessibility workflows.
- `json`: AST output for debugging.

Only HTML should be considered committed for v1.

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
    <article class="mda-document">
      <!-- optional table of contents -->
      <main class="mda-content">
        <!-- rendered markdown -->
      </main>
    </article>
  </body>
</html>
```

The exact class names should be stable and documented.

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
| `table` | `<table>` with `<thead>` and `<tbody>` |
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

mdalchemy should optionally render heading-derived sections.

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

This should be controlled by config because conformance tests may need raw CommonMark HTML fragments without extra wrappers.

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
color.surface
color.text
color.muted
color.accent
color.accentText
color.border
color.codeBackground
color.codeText
color.mark
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

### Code Tokens

```text
code.theme
code.wrap
code.showLanguage
code.border
```

`code.theme` should initially only select a simple built-in color treatment. Full syntax highlighting can come later.

## CSS Variable Mapping

Each token maps to a CSS variable:

```css
:root {
  --mda-color-background: #ffffff;
  --mda-color-text: #202124;
  --mda-layout-max-width: 760px;
}
```

CSS classes use variables:

```css
.mda-document {
  max-width: var(--mda-layout-max-width);
  color: var(--mda-color-text);
  background: var(--mda-color-background);
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

Characteristics:

- Serif body font.
- Moderate line length.
- Warm but not decorative color palette.
- Strong heading hierarchy.
- Quiet code treatment.

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

- Paper/PDF export.

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
- `extends` must resolve to a built-in or loaded theme.
- Unknown tokens should warn or error depending on strict mode.
- Token values should be validated by type category.
- Dangerous CSS constructs should be rejected where possible.

## Theme Resolution

Resolution order:

1. Built-in theme base.
2. Extended parent themes.
3. User theme tokens.
4. CLI overrides, if later supported.

Cycle detection is required:

```text
A extends B
B extends A
```

This should produce `MDA_THEME_EXTENDS_CYCLE`.

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

This helps future PDF output and makes browser printing useful early.

## Future PDF Export

Likely plan:

1. Render print-friendly standalone HTML.
2. Use an optional browser automation dependency or external command to print to PDF.
3. Keep PDF code in a separate renderer/export package.

PDF config should not leak into parser options.

Example future command:

```text
mdalchemy report.md -o report.pdf --format pdf --theme print
```

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
