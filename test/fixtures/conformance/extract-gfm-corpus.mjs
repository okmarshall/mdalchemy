import { readFile, writeFile } from "node:fs/promises";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node test/fixtures/conformance/extract-gfm-corpus.mjs <spec.txt> <output.json>");
  process.exit(2);
}

const source = await readFile(inputPath, "utf8");
const fixtures = extractFixtures(source);
await writeFile(outputPath, `${JSON.stringify(fixtures, null, 2)}\n`, "utf8");
console.error(`wrote ${fixtures.length} GFM fixtures to ${outputPath}`);

function extractFixtures(text) {
  const lines = text.split(/\n/);
  const fixtures = [];
  let section = "";
  let index = 0;
  let example = 1;

  while (index < lines.length) {
    const line = lines[index];
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) section = heading[1].trim();

    const exampleMatch = /^`{10,}\s+example(?<extensions>(?:\s+\S+)*)$/.exec(line);
    if (!exampleMatch) {
      index += 1;
      continue;
    }

    const extensions = exampleMatch.groups?.extensions.trim().split(/\s+/).filter(Boolean) ?? [];
    const startLine = index + 1;
    const markdown = [];
    const html = [];
    index += 1;

    while (index < lines.length && lines[index] !== ".") {
      markdown.push(lines[index].replaceAll("→", "\t"));
      index += 1;
    }

    if (index >= lines.length) {
      throw new Error(`Unterminated GFM fixture #${example}; missing separator.`);
    }

    index += 1;
    while (index < lines.length && !/^`{10,}$/.test(lines[index])) {
      html.push(lines[index].replaceAll("→", "\t"));
      index += 1;
    }

    if (index >= lines.length) {
      throw new Error(`Unterminated GFM fixture #${example}; missing closing fence.`);
    }

    if (!extensions.includes("disabled")) {
      fixtures.push({
        markdown: `${markdown.join("\n")}\n`,
        html: `${html.join("\n")}\n`,
        example,
        start_line: startLine,
        end_line: index + 1,
        section,
        extensions
      });
    }

    example += 1;
    index += 1;
  }

  return fixtures;
}
