import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseMarkdown, renderDocument } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";

test("complex example renders to the checked html artifact", async () => {
  const markdown = await readFile("examples/complex-spec.md", "utf8");
  const expected = await readFile("examples/complex-spec.html", "utf8");
  const { document } = parseMarkdown(markdown);
  const config = resolveConfig({
    theme: "technical",
    html: {
      tableOfContents: true
    }
  });
  const rendered = await renderDocument(document, { config });

  assert.equal(rendered.content, expected);
});

