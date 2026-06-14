import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseMarkdown, renderDocument } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";

test("complex example renders to the checked html artifact", async () => {
  const markdown = await readFile("examples/complex-spec.md", "utf8");
  const expected = await readFile("examples/complex-spec.html", "utf8");
  const config = resolveConfig({
    markdown: {
      extensions: [
        "gfm-table",
        "gfm-task-list",
        "gfm-strikethrough",
        "gfm-footnote",
        "gfm-literal-autolink",
        "frontmatter"
      ]
    },
    html: {
      tableOfContents: true
    }
  });
  const { document } = parseMarkdown(markdown, config.markdown);
  const rendered = await renderDocument(document, { config });

  assert.equal(rendered.content, expected);
});
