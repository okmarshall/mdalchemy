import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown } from "../dist/index.js";

test("parses headings, paragraphs, references, and inline links", () => {
  const markdown = `# Title

Paragraph with **strong** and [docs][ref].

[ref]: https://example.com "Docs"
`;
  const { document } = parseMarkdown(markdown);

  assert.equal(document.children[0].type, "heading");
  assert.equal(document.children[1].type, "paragraph");
  assert.equal(document.references.get("ref")?.destination, "https://example.com");

  const paragraph = document.children[1];
  assert.equal(paragraph.type, "paragraph");
  assert.equal(paragraph.children.some((node) => node.type === "strong"), true);
  assert.equal(paragraph.children.some((node) => node.type === "link"), true);
});

test("parses nested lists and fenced code blocks", () => {
  const markdown = `- One
  1. Nested
  2. More
- Two

\`\`\`ts
const value = 1;
\`\`\`
`;
  const { document } = parseMarkdown(markdown);
  const list = document.children[0];
  const code = document.children[1];

  assert.equal(list.type, "list");
  assert.equal(list.children.length, 2);
  assert.equal(list.children[0].children.some((child) => child.type === "list"), true);
  assert.equal(code.type, "codeBlock");
  assert.equal(code.kind, "fenced");
  assert.equal(code.language, "ts");
});

test("parses indented code blocks with spaces and tabs", () => {
  const markdown = "    const spaced = true;\n\tconst tabbed = true;\n";
  const { document } = parseMarkdown(markdown);
  const code = document.children[0];

  assert.equal(code.type, "codeBlock");
  assert.equal(code.kind, "indented");
  assert.equal(code.literal, "const spaced = true;\nconst tabbed = true;");
});

test("parses block quotes and raw HTML blocks", () => {
  const markdown = `> Quoted paragraph
>
> - Quoted list

<section>
<p>Raw HTML.</p>
</section>
`;
  const { document } = parseMarkdown(markdown);

  assert.equal(document.children[0].type, "blockquote");
  assert.equal(document.children[1].type, "htmlBlock");
});

test("parses lazy block quote continuation and loose lists", () => {
  const markdown = `> Quoted paragraph
lazy continuation

1. Loose item

   Continuation paragraph.
2. Next item
`;
  const { document } = parseMarkdown(markdown);
  const quote = document.children[0];
  const list = document.children[1];

  assert.equal(quote.type, "blockquote");
  assert.equal(quote.children[0].type, "paragraph");
  assert.equal(quote.children[0].raw, "Quoted paragraph\nlazy continuation");
  assert.equal(list.type, "list");
  assert.equal(list.tight, false);
});

test("parses links with titles, images, raw html inline, and source ranges", () => {
  const markdown = `# Range

[label](https://example.com/a\\(b\\) "Title") ![alt *text*](./image.png) <kbd>Ctrl</kbd>
`;
  const { document } = parseMarkdown(markdown);
  const heading = document.children[0];
  const paragraph = document.children[1];

  assert.equal(heading.type, "heading");
  assert.deepEqual(heading.range.start, { offset: 0, line: 1, column: 1 });
  assert.equal(paragraph.type, "paragraph");
  assert.equal(paragraph.children.some((node) => node.type === "link" && node.title === "Title"), true);
  assert.equal(paragraph.children.some((node) => node.type === "image" && node.alt === "alt text"), true);
  assert.equal(paragraph.children.some((node) => node.type === "htmlInline"), true);
});

test("parses GFM pipe tables when the table extension is enabled", () => {
  const markdown = `| Name | Count | Notes |
| :--- | ---: | :---: |
| Alpha | 1 | **bold** |
| Beta | 2 | \`code\` |
`;
  const { document } = parseMarkdown(markdown, { extensions: ["gfm-table"] });
  const table = document.children[0];

  assert.equal(table.type, "table");
  assert.deepEqual(table.alignments, ["left", "right", "center"]);
  assert.equal(table.header.length, 3);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0][2].children.some((node) => node.type === "strong"), true);
});

test("leaves pipe tables as paragraphs without the GFM table extension", () => {
  const markdown = `| Name | Count |
| --- | ---: |
| Alpha | 1 |
`;
  const { document } = parseMarkdown(markdown);

  assert.equal(document.children[0].type, "paragraph");
});
