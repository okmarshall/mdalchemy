# mdalchemy Architecture

## Architectural Intent

mdalchemy should be a pipeline, not a pile of string replacements. Markdown parsing is subtle, and beautiful document output requires more than mapping syntax to tags. The architecture should keep concerns separate:

1. Read source.
2. Parse Markdown into a document AST.
3. Analyze or transform the document into renderer-neutral derived structures.
4. Resolve configuration and theme.
5. Render to HTML.
6. Write output.

HTML is the supported rendering target. The parser and document layers still stay separate from HTML so correctness, analysis, and presentation remain independently testable.

## High-Level Pipeline

```text
Markdown file
  -> source reader
  -> line scanner
  -> block parser
  -> inline parser
  -> document AST
  -> document analyzers
  -> render model
  -> renderer
  -> output writer
```

The pipeline should remain explicit in code. Each phase should have clear inputs and outputs so individual pieces can be tested.

## Current Source Layout

```text
src/
  cli/
    args.ts
    main.ts
  config/
    config-loader.ts
    config-schema.ts
  core/
    diagnostics.ts
    result.ts
    source.ts
  document/
    outline.ts
  io/
    files.ts
  markdown/
    ast.ts
    inline-parser.ts
    parser.ts
    references.ts
  render/
    html/
      escape.ts
      html-renderer.ts
      syntax-highlight.ts
  theme/
    theme.ts
  index.ts
```

This layout is intentionally compact for the current implementation. The package-boundary descriptions below still describe the desired direction as the parser, renderer, and theme system grow.

## Package Boundaries

### `cli`

Owns command-line behavior only.

Responsibilities:

- Parse arguments.
- Load config.
- Determine input and output paths.
- Call the library pipeline.
- Format diagnostics for terminal output.
- Set process exit codes.

Should not:

- Parse Markdown directly.
- Build HTML manually.
- Know theme internals beyond selecting config.

### `config`

Owns config discovery, loading, validation, defaulting, and merging.

Responsibilities:

- Find config files.
- Load JSON config.
- Merge defaults, config, and CLI overrides.
- Validate config shape.
- Produce a typed `ResolvedConfig`.

Should not:

- Access parser state.
- Render output.

### `core`

Contains shared primitives.

Responsibilities:

- Source files.
- Positions and ranges.
- Diagnostics.
- Result types.
- Error categories.

Should stay small and dependency-free.

### `markdown`

Owns parsing Markdown into the AST.

Responsibilities:

- Line normalization.
- Block parsing.
- Inline parsing.
- Link reference collection.
- CommonMark behavior.
- Markdown AST types.

Should not:

- Generate final HTML.
- Know CSS.
- Know CLI flags except through parser options.

### `document`

Owns document analysis and transforms.

Responsibilities:

- Heading outline.
- Section tree.
- Slug generation.
- Table of contents model.
- Document metadata.
- Shared document features used by rendering.

This layer sits between parsing and rendering so features like heading anchors are not hard-coded into the parser.

### `render`

Owns HTML rendering.

Responsibilities:

- Provide HTML renderer.
- Keep renderer-specific escaping and templates isolated.

### `theme`

Owns theme representation and CSS generation.

Responsibilities:

- Built-in theme definitions.
- Theme inheritance.
- User theme validation.
- CSS generation for HTML renderer.
- Theme token documentation.

Should not:

- Parse Markdown.
- Decide document structure.

### `io`

Owns filesystem behavior.

Responsibilities:

- Read input.
- Write output atomically where practical.
- Resolve paths.
- Handle extension inference.

Should not:

- Format content.

## Public Library API

The CLI should be a thin layer over a reusable library API.

```ts
export interface RenderOptions {
  inputPath?: string;
  outputFormat: "html";
  markdown?: MarkdownOptions;
  html?: HtmlOptions;
  theme?: ThemeInput;
}

export interface RenderResult {
  content: string;
  format: "html";
  diagnostics: Diagnostic[];
  document: DocumentNode;
}

export function parseMarkdown(source: SourceText, options?: MarkdownOptions): ParseResult;

export function renderDocument(
  document: DocumentNode,
  options: RenderOptions
): RenderResult;

export function renderMarkdown(
  markdown: string,
  options: RenderOptions
): RenderResult;
```

The exact signatures can evolve, but the dependency direction should not:

```text
CLI -> config -> parser -> document analyzers -> renderer -> output
```

No lower layer should import the CLI.

## AST Design

The Markdown AST should be typed with discriminated unions.

### Shared Node Shape

```ts
export interface BaseNode {
  type: string;
  range: SourceRange;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}
```

Line and column should be 1-based for diagnostics. Offset should be 0-based for string operations.

### Document Node

```ts
export interface DocumentNode extends BaseNode {
  type: "document";
  children: BlockNode[];
  references: ReferenceMap;
  diagnostics: Diagnostic[];
}
```

### Block Nodes

```ts
export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | ThematicBreakNode
  | BlockQuoteNode
  | ListNode
  | ListItemNode
  | CodeBlockNode
  | HtmlBlockNode
  | LinkReferenceDefinitionNode;
```

Important block node fields:

- `HeadingNode`: `level`, `children`, `rawText`.
- `ParagraphNode`: `children`.
- `BlockQuoteNode`: `children`.
- `ListNode`: `ordered`, `start`, `delimiter`, `tight`, `children`.
- `ListItemNode`: `marker`, `padding`, `children`.
- `CodeBlockNode`: `kind`, `literal`, `info`, `language`.
- `HtmlBlockNode`: `literal`, `blockKind`.
- `LinkReferenceDefinitionNode`: `label`, `destination`, `title`.

### Inline Nodes

```ts
export type InlineNode =
  | TextNode
  | SoftBreakNode
  | HardBreakNode
  | CodeSpanNode
  | EmphasisNode
  | StrongNode
  | LinkNode
  | ImageNode
  | AutoLinkNode
  | HtmlInlineNode;
```

Important inline fields:

- `TextNode`: `value`.
- `CodeSpanNode`: `literal`.
- `EmphasisNode`: `children`.
- `StrongNode`: `children`.
- `LinkNode`: `destination`, `title`, `children`, `referenceKind`.
- `ImageNode`: `destination`, `title`, `alt`, `children`.
- `AutoLinkNode`: `destination`, `label`, `kind`.
- `HtmlInlineNode`: `literal`.

## Why Source Ranges Matter

Source ranges make the project easier to debug and extend. They support:

- Friendly CLI diagnostics.
- Conformance failure reporting.
- Future source maps.
- Future editor integration.
- Clear regression tests.

Ranges should be attached while parsing rather than reconstructed later.

## Parser State

The parser should use explicit state objects rather than globals.

```ts
export interface ParserState {
  source: SourceText;
  lines: SourceLine[];
  options: MarkdownOptions;
  references: ReferenceMap;
  diagnostics: Diagnostic[];
}
```

Block parsing will also need a container stack:

```ts
export interface ContainerFrame {
  node: BlockQuoteNode | ListNode | ListItemNode;
  indent: number;
  markerOffset: number;
  padding: number;
}
```

Inline parsing will need delimiter and bracket stacks, because emphasis and links require delayed resolution.

## HTML Renderer Interface

The HTML renderer should consume the document model and a context object.

```ts
export interface HtmlRenderer {
  render(document: DocumentNode, context: RenderContext): string;
}

export interface RenderContext {
  config: ResolvedConfig;
  theme: ResolvedTheme;
  diagnostics: DiagnosticSink;
  outline: DocumentOutline;
}
```

The HTML renderer returns a string.

## Render Model

For HTML, a direct recursive renderer is acceptable at first. If HTML rendering becomes hard to maintain, introduce an intermediate render tree:

```ts
export interface RenderNode {
  kind: "element" | "text" | "raw";
}
```

Do not introduce this too early unless HTML rendering starts to duplicate too much logic.

## Theme Model

Themes should be declarative.

```ts
export interface ThemeDefinition {
  name: string;
  extends?: string;
  tokens: ThemeTokens;
  assets?: ThemeAssets;
}

export interface ResolvedTheme {
  name: string;
  tokens: RequiredThemeTokens;
  css: string;
}
```

Theme tokens should map to CSS variables in HTML output.

```css
:root {
  --mda-color-background: #ffffff;
  --mda-color-text: #1f2328;
  --mda-font-body: ui-serif, Georgia, serif;
}
```

The renderer should use stable class names like `mda-document`, `mda-code`, and `mda-toc`. Themes style these classes.

## Diagnostics

Diagnostics should be structured, not plain strings.

```ts
export interface Diagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  range?: SourceRange;
  hint?: string;
}
```

Examples:

- `MDA_CONFIG_INVALID`
- `MDA_INPUT_NOT_FOUND`
- `MDA_MARKDOWN_UNSUPPORTED_EXTENSION`
- `MDA_HTML_UNSAFE_URL`
- `MDA_THEME_UNKNOWN_TOKEN`

Parser diagnostics should be rare because CommonMark accepts almost any text. Most warnings will come from unsafe output choices, invalid theme config, unsupported extensions, and CLI misuse.

## Error Handling

Use recoverable `Result` values internally where practical.

```ts
export type Result<T, E = Diagnostic> =
  | { ok: true; value: T; diagnostics?: Diagnostic[] }
  | { ok: false; error: E; diagnostics?: Diagnostic[] };
```

Throwing is acceptable for programmer errors and impossible states, but user-facing failures should become diagnostics with exit codes.

## Dependency Policy

The project should avoid a large dependency graph, especially around core parsing.

Allowed categories:

- TypeScript build tooling.
- Test runner.
- Minimal CLI argument parser, if the standard Node approach becomes noisy.
- JSON schema validation only if handwritten validation becomes a distraction.
- HTML entity data if needed, but prefer a small generated table for CommonMark entities.

Avoid:

- External Markdown parsers.
- Large rendering frameworks.
- Browser-only libraries in core.
- Theme engines that execute code.
- Syntax highlighters in v1 unless optional and isolated.

Dependency review questions:

1. Does this dependency teach us less about the thing we are trying to learn?
2. Is this dependency in the core parser path?
3. Can the feature be implemented simply with platform APIs?
4. Does it increase install size or startup time materially?
5. Can it be isolated behind an interface?

## Extension Strategy

Extensions should be opt-in and structured as parser feature flags.

```ts
export type MarkdownExtension =
  | "gfm-table"
  | "gfm-task-list"
  | "gfm-strikethrough"
  | "gfm-footnote"
  | "gfm-literal-autolink"
  | "frontmatter";
```

Extension code should not weaken CommonMark tests. The conformance suite should run in at least two modes:

- `commonmark`: no extensions.
- `extended`: selected extension fixtures.

## HTML Renderer Strategy

The HTML renderer should generate semantic HTML:

- `<article>` for the document body.
- `<section>` where section transformation is enabled.
- `<h1>` through `<h6>` for headings.
- `<p>` for paragraphs.
- `<blockquote>` for block quotes.
- `<pre><code>` for code blocks.
- `<ol>` and `<ul>` for lists.
- `<li>` for list items.
- `<a>` for links.
- `<img>` for images.

Standalone output should include:

- `<!doctype html>`.
- `<html lang="...">`.
- `<head>` with charset, viewport, title, and style.
- `<body>` with the rendered document.

## Design Constraints

- The parser owns syntax.
- The document layer owns derived structure.
- The renderer owns output markup.
- The theme layer owns visual appearance.
- The CLI owns process behavior.

When a change crosses boundaries, that is a sign to add a typed interface rather than import across layers casually.
