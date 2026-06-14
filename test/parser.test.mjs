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

