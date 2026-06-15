# Parser Design

## Objective

mdalchemy will include its own Markdown parser written in TypeScript. The parser should be readable, testable, and close to CommonMark 0.31.2 behavior. It should parse Markdown into a renderer-neutral AST, not directly into HTML.

## Baseline

CommonMark describes parsing in two broad phases:

1. Parse block structure line by line.
2. Parse inline structure inside block content.

mdalchemy should follow this strategy. It matches how Markdown works, keeps nesting rules manageable, and gives the inline parser access to link reference definitions discovered during block parsing.

## Parsing Principles

- Do not use regex-only parsing for the whole language.
- Use regex for local recognizers where appropriate.
- Preserve source positions.
- Keep block parsing and inline parsing separate.
- Follow CommonMark before adding dialect extensions.
- Prefer explicit state machines for ambiguous inline constructs.
- Keep raw source slices until final node construction where that helps accuracy.
- Add fixtures for every surprising behavior.

## Input Normalization

Before parsing:

1. Read source as UTF-8.
2. Normalize line endings into `SourceLine` records, preserving original offsets.
3. Treat `\n`, `\r\n`, and `\r` as line endings.
4. Preserve whether a line ended with a newline.
5. Preserve tabs. Do not globally replace tabs with spaces.

Tabs affect block indentation as if tab stops occur every 4 columns, but literal tab characters remain literal content in many contexts.

```ts
export interface SourceLine {
  index: number;
  startOffset: number;
  endOffset: number;
  text: string;
  lineEnding: "\n" | "\r\n" | "\r" | "";
}
```

The parser needs functions that understand visual columns:

```ts
function advanceColumn(column: number, char: string): number {
  if (char === "\t") {
    return column + (4 - (column % 4));
  }
  return column + 1;
}
```

## Block Parsing Overview

Block parsing consumes lines and builds block nodes.

Main responsibilities:

- Track open container blocks.
- Match continuation lines.
- Open new containers.
- Recognize leaf blocks.
- Collect paragraph lines.
- Finalize blocks when they end.
- Collect link reference definitions.

The block parser should use a container stack, following CommonMark's strategy:

```text
document
  block quote
    list
      list item
        paragraph
```

Each incoming line is processed roughly as:

1. Match existing containers.
2. Determine unmatched containers and close them.
3. Try to start new containers.
4. Try to start a leaf block.
5. Add line content to current open block.
6. Finalize blocks as needed.

## Container Blocks

### Block Quotes

Recognition:

- Up to 3 spaces indentation.
- A `>` marker.
- Optional following space or tab.

Behavior:

- Can contain other blocks.
- Can be lazy-continuation for paragraph content.
- Can contain headings, lists, code, and other block quotes.

Tests:

- Simple block quote.
- Nested block quotes.
- Block quote with list.
- Block quote with lazy paragraph continuation.
- Block quote with blank lines.
- Block quote containing fenced code.

### List Items

Recognition:

- Bullet markers: `-`, `+`, `*`.
- Ordered markers: 1 to 9 digits followed by `.` or `)`.
- Marker may be indented up to 3 spaces.
- Padding after marker determines child block indentation.

Behavior:

- First ordered list item start number is preserved.
- Lists with different marker type may interrupt or create separate lists depending on CommonMark rules.
- Tight vs loose list is determined by blank lines and child block structure.
- List items can contain paragraphs, headings, blockquotes, code, and nested lists.

Important stored values:

```ts
interface ListNode {
  type: "list";
  ordered: boolean;
  start: number | null;
  delimiter: "." | ")" | null;
  bullet: "-" | "+" | "*" | null;
  tight: boolean;
  children: ListItemNode[];
}

interface ListItemNode {
  type: "listItem";
  marker: string;
  padding: number;
  children: BlockNode[];
}
```

Tests:

- Bullet list.
- Ordered list.
- Ordered list starting at non-1 value.
- Nested list.
- Loose list.
- Tight list.
- Empty list item.
- List item containing heading.
- List item containing fenced code.
- Paragraph interruption by ordered list only when number is 1.

## Leaf Blocks

### Thematic Breaks

Recognition:

- Up to 3 spaces indentation.
- Three or more matching `*`, `-`, or `_`.
- Spaces and tabs allowed between markers.
- No other characters.

Ambiguity:

- A line like `---` can be a setext heading underline if there is a paragraph before it.
- Parser precedence must follow CommonMark.

### ATX Headings

Recognition:

- Up to 3 spaces indentation.
- 1 to 6 `#` characters.
- Space/tab or end after opening sequence.
- Optional closing sequence of `#` characters preceded by space.

Output:

- `level`.
- Inline children parsed from heading content.
- Raw text for title and slug generation.

Tests:

- `# Heading`.
- `###### Heading`.
- Seven hashes should become paragraph text.
- Closing hashes stripped correctly.
- Escaped hashes are text.

### Setext Headings

Recognition:

- A paragraph followed by a line of `=` or `-` markers.
- Up to 3 spaces indentation.
- `=` produces level 1.
- `-` produces level 2.

Behavior:

- Only applies to paragraph content.
- Must resolve ambiguity with thematic breaks.

### Indented Code Blocks

Recognition:

- Lines indented 4 or more spaces or equivalent tab columns.
- Cannot interrupt paragraph.

Behavior:

- Strip one level of code indentation.
- Preserve internal whitespace.
- Trim trailing blank lines according to CommonMark.

### Fenced Code Blocks

Recognition:

- Up to 3 spaces indentation.
- Opening fence of at least 3 backticks or tildes.
- Closing fence must use same character and be at least same length.
- Info string allowed after opening fence.
- Backtick info string cannot contain backticks.

Output:

- Literal code content.
- Fence character.
- Fence length.
- Raw info string.
- Normalized language identifier from first info word.

Renderer:

- HTML should emit `<pre><code class="language-ts">`.
- The HTML renderer applies lightweight built-in syntax highlighting for recognized fence languages. This remains renderer behavior, not Markdown syntax.

### HTML Blocks

CommonMark defines several HTML block start conditions. The parser should implement these carefully because they affect when Markdown parsing resumes.

Implementation plan:

- Create a table of HTML block recognizers.
- Each recognizer defines:
  - start condition.
  - end condition.
  - whether blank line terminates.
  - block kind id for tests.

Raw HTML behavior is a renderer option, but the parser must still identify HTML blocks.

### Link Reference Definitions

Recognition:

- Label in square brackets followed by colon.
- Optional whitespace.
- Destination.
- Optional title.

Behavior:

- Does not render as visible content.
- First definition for a normalized label wins.
- May appear where paragraphs can appear.
- Needs careful parsing because failed definitions become paragraph content.

Reference normalization:

- Strip leading and trailing spaces.
- Collapse internal whitespace.
- Case-fold appropriately.

### Paragraphs

Paragraphs collect lines until interrupted by another block construct or blank line.

Behavior:

- Lines are joined with soft breaks for inline parsing.
- Lazy continuation can apply inside containers.
- Paragraph content may become a setext heading or link reference definition during finalization.

### Blank Lines

Blank lines affect:

- Paragraph termination.
- Tight vs loose list calculation.
- Container continuation.
- HTML block termination in some cases.

The block parser should represent blank-line observations during parsing rather than trying to infer looseness later from raw text.

## Inline Parsing Overview

Inline parsing converts text inside leaf blocks into inline nodes.

Inputs:

- Raw inline content.
- Source offset mapping.
- Reference map.
- Markdown options.

Outputs:

- Inline nodes with ranges.

Main inline constructs:

- Backslash escapes.
- Entity and numeric references.
- Code spans.
- Emphasis and strong emphasis.
- Links.
- Images.
- Autolinks.
- Raw HTML.
- Hard and soft line breaks.
- Text.

## Inline Scanner

The inline parser should scan character by character. Special characters trigger recognizers:

- `\` for escapes and hard breaks.
- `` ` `` for code spans.
- `*` and `_` for emphasis delimiters.
- `[` and `]` for links.
- `!` before `[` for images.
- `<` for autolinks and HTML tags.
- `&` for entities.
- newline for line breaks.

Everything else accumulates as text.

## Code Spans

Recognition:

- Opening sequence of one or more backticks.
- Closing sequence of exactly the same length.
- Contents may contain different-length backtick sequences.

Normalization:

- If content begins and ends with a space, and contains a non-space character, strip one leading and one trailing space.
- Convert line endings inside code spans to spaces.

Tests:

- Single-backtick code.
- Multi-backtick code.
- Unclosed backticks become literal text.
- Spaces around code content.

## Emphasis And Strong Emphasis

This is the hardest inline feature.

Use a delimiter stack:

```ts
interface Delimiter {
  char: "*" | "_";
  length: number;
  canOpen: boolean;
  canClose: boolean;
  nodeIndex: number;
  previous?: Delimiter;
  next?: Delimiter;
}
```

Algorithm sketch:

1. Scan delimiter runs.
2. Determine left-flanking and right-flanking behavior.
3. Create text nodes for delimiter characters.
4. Push potential openers/closers onto delimiter stack.
5. Process closing delimiters against previous matching openers, respecting the CommonMark rule of three.
6. Resolve strong emphasis with two delimiters where possible, otherwise emphasis with one.
7. Remove used delimiter characters from text nodes.
8. Wrap intervening nodes in `emphasis` or `strong` nodes and remove enclosed delimiters from the active stack.

Important cases:

- Intraword underscores should usually not emphasize.
- Asterisks and underscores have different open/close rules.
- Nested emphasis.
- Overlapping emphasis.
- Triple delimiters.
- Punctuation boundaries.

Tests should be extensive and borrowed from CommonMark examples.

## Links And Images

Links require bracket stack handling.

Supported link forms:

- Inline links: `[label](destination "title")`.
- Full reference links: `[label][ref]`.
- Collapsed reference links: `[label][]`.
- Shortcut reference links: `[label]`.
- Images: `![alt](destination)`.

Parsing strategy:

1. When scanning `[`, push bracket marker.
2. When scanning `![`, push image bracket marker.
3. When scanning `]`, attempt to resolve link or image.
4. Prefer inline link if following text starts with `(` and parses as destination/title.
5. Otherwise try reference forms.
6. If resolution succeeds, wrap bracket contents.
7. Disable nested links inside links as required.

Destination parsing:

- Angle-bracket destination.
- Bare destination with balanced parentheses.
- Escapes and entities.
- No spaces in bare destination.

Title parsing:

- Double quoted.
- Single quoted.
- Parenthesized.

Alt text:

- Image alt text should be plain text extracted from child inline nodes.

## Autolinks

Recognition:

- `<scheme:...>`.
- `<user@example.com>`.

Behavior:

- Link destination is derived from content.
- Email autolink destination uses `mailto:`.
- Must not confuse arbitrary HTML tags with autolinks.

## Raw HTML Inlines

Recognition:

- Open tags.
- Closing tags.
- Comments.
- Processing instructions.
- Declarations.
- CDATA sections.

Parser output:

- `HtmlInlineNode`.

Renderer behavior:

- Controlled by raw HTML policy.

## Entities

CommonMark recognizes named character references and numeric references.

Implementation options:

1. Include a generated JSON table of HTML entity names.
2. Implement a minimal table first and mark conformance incomplete.
3. Add a small dependency or generated artifact later.

Preferred approach:

- Use a generated static table committed to the repo if license and size are acceptable.
- Keep lookup isolated in `markdown/inlines/entities.ts`.

Behavior:

- Valid entity references become Unicode characters in text nodes.
- Invalid entity-like text remains literal.

## Line Breaks

Hard line breaks:

- Backslash at end of line.
- Two or more spaces at end of line.

Soft line breaks:

- Single line ending inside paragraph-like inline content.

Renderer:

- Hard break becomes `<br>`.
- Soft break defaults to newline or configurable space in HTML rendering.

## Link Reference Map

Reference definitions discovered during block parsing feed inline parsing.

```ts
export interface ReferenceDefinition {
  label: string;
  normalizedLabel: string;
  destination: string;
  title?: string;
  range: SourceRange;
}

export type ReferenceMap = Map<string, ReferenceDefinition>;
```

First definition wins. Later duplicates should be ignored for rendering and may optionally produce an info diagnostic in debug mode.

## Section Nesting

Markdown itself does not have explicit section nodes. mdalchemy should derive sections after parsing:

```text
# A
content
## B
content
# C
content
```

Derived structure:

```text
section A
  content
  section B
    content
section C
  content
```

This should be derived after parsing, not in the parser. The parser should emit headings as ordinary block nodes.

## Conformance Plan

### CommonMark Spec Tests

CommonMark examples are used as conformance fixtures. The implementation
includes `npm run test:commonmark`, which:

1. Loads CommonMark spec examples from a vendored or downloaded fixture.
2. Runs mdalchemy parser plus HTML renderer.
3. Compares normalized HTML fragment output to expected HTML.
4. Reports pass/fail by spec section.

Because the renderer may intentionally emit richer standalone HTML, conformance tests should use an HTML fragment renderer mode.

### Test Categories

- Preliminaries.
- Thematic breaks.
- ATX headings.
- Setext headings.
- Indented code blocks.
- Fenced code blocks.
- HTML blocks.
- Link reference definitions.
- Paragraphs.
- Blank lines.
- Block quotes.
- List items.
- Lists.
- Backslash escapes.
- Entity references.
- Code spans.
- Emphasis and strong emphasis.
- Links.
- Images.
- Autolinks.
- Raw HTML.
- Hard line breaks.
- Soft line breaks.
- Textual content.

### Conformance Reporting

The full-corpus report currently outputs:

```text
CommonMark 0.31.2 corpus: 652/652 examples passed

| Section | Passed | Total | First failing examples |
```

This keeps conformance visible and gives parser changes a strict regression gate.

## Parser Milestones

### Parser Milestone 1: Skeleton

- Source lines.
- Positions.
- Document node.
- Paragraphs.
- ATX headings.
- Thematic breaks.
- Text inlines.
- HTML fragment renderer for tests.

### Parser Milestone 2: Basic Blocks

- Setext headings.
- Indented code.
- Fenced code.
- Blank lines.
- Block quotes.
- Simple lists.

### Parser Milestone 3: Container Correctness

- Nested block quotes.
- Nested lists.
- Lazy continuation.
- Tight and loose list calculation.
- Paragraph interruption rules.

### Parser Milestone 4: Inline Basics

- Escapes.
- Entities.
- Code spans.
- Hard and soft breaks.
- Raw HTML inline.

### Parser Milestone 5: Links

- Inline links.
- Images.
- Reference definitions.
- Full references.
- Collapsed references.
- Shortcut references.
- Autolinks.

### Parser Milestone 6: Emphasis

- Delimiter stack.
- Strong emphasis.
- Nested emphasis.
- Intraword underscore rules.
- CommonMark edge cases.

### Parser Milestone 7: HTML Blocks

- All CommonMark HTML block categories.
- Raw HTML renderer policies.
- Conformance fixtures.

### Parser Milestone 8: Hardening

- Source ranges everywhere.
- Fuzz-like randomized plain text tests.
- Large document tests.
- Regression fixtures.
- Conformance progress target.

## Known Difficult Areas

1. Emphasis and strong emphasis.
2. Link/image bracket precedence.
3. Lazy continuation in nested containers.
4. Tight vs loose list classification.
5. HTML block categories.
6. Entity reference completeness.
7. Exact source ranges after tab expansion.
8. Differences between CommonMark and common user expectations from GitHub.

## Practical Implementation Advice

- Build the parser in small vertical slices.
- Always add fixtures before fixing a parser edge case.
- Keep CommonMark mode strict and boring.
- Put user-friendly extra behavior behind extensions.
- Avoid rendering beauty until the AST is trustworthy.
- Add debug utilities that print AST trees.
- Make failures explainable.

## Debug Utilities

The project should eventually include internal debug commands:

```text
mdalchemy debug ast input.md
mdalchemy debug tokens input.md
mdalchemy debug outline input.md
```

These are not required for v1, but they will speed parser development dramatically.
