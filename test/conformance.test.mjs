import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderMarkdown } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";

const fixturePacks = [
  "test/fixtures/conformance/commonmark-0.31.2.seed.json",
  "test/fixtures/conformance/gfm-supported.seed.json"
];

for (const fixturePath of fixturePacks) {
  const pack = await readFixturePack(fixturePath);
  test(pack.name, async (t) => {
    for (const fixture of pack.fixtures) {
      await t.test(fixture.name, async () => {
        const config = resolveConfig({
          markdown: {
            profile: pack.profile,
            extensions: fixture.extensions ?? pack.extensions ?? []
          },
          html: {
            fragment: true,
            headingAnchors: false,
            tableOfContents: false
          }
        });
        const rendered = await renderMarkdown(fixture.markdown, { config });
        assert.equal(rendered.content, fixture.expected);
      });
    }
  });
}

async function readFixturePack(path) {
  const raw = JSON.parse(await readFile(path, "utf8"));
  assert.equal(typeof raw.name, "string");
  assert.equal(raw.profile, "commonmark");
  assert.equal(Array.isArray(raw.fixtures), true);
  return raw;
}
