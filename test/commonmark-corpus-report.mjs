import { readFile } from "node:fs/promises";
import { renderMarkdown } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";

const corpusPath = new URL("./fixtures/conformance/commonmark-0.31.2.json", import.meta.url);
const isStrict = process.argv.includes("--strict");

const fixtures = JSON.parse(await readFile(corpusPath, "utf8"));
validateCorpus(fixtures);

const config = resolveConfig({
  markdown: {
    profile: "commonmark",
    extensions: []
  },
  html: {
    fragment: true,
    headingAnchors: false,
    tableOfContents: false,
    safeUrls: false
  }
});

const sections = new Map();
const failures = [];

for (const fixture of fixtures) {
  const rendered = await renderMarkdown(fixture.markdown, { config, commonmarkCompatible: true });
  const expected = normalizeCommonMarkHtml(fixture.html);
  const actual = rendered.content;
  const passed = actual === expected;
  const section = getSectionSummary(sections, fixture.section);

  section.total += 1;
  if (passed) {
    section.passed += 1;
    continue;
  }

  const failure = {
    example: fixture.example,
    section: fixture.section,
    startLine: fixture.start_line,
    endLine: fixture.end_line
  };
  failures.push(failure);
  if (section.firstFailures.length < 5) section.firstFailures.push(failure);
}

const total = fixtures.length;
const passed = total - failures.length;

console.log(`CommonMark 0.31.2 corpus: ${passed}/${total} examples passed`);
console.log("");
console.log("| Section | Passed | Total | First failing examples |");
console.log("| --- | ---: | ---: | --- |");
for (const [section, summary] of sections) {
  const firstFailures = summary.firstFailures.map((failure) => `#${failure.example}`).join(", ") || "-";
  console.log(`| ${section} | ${summary.passed} | ${summary.total} | ${firstFailures} |`);
}

if (failures.length > 0) {
  console.log("");
  console.log(`First failing examples: ${failures.slice(0, 25).map((failure) => `#${failure.example}`).join(", ")}`);
}

if (isStrict && failures.length > 0) {
  console.error("");
  console.error(`CommonMark strict mode failed: ${failures.length} examples did not match.`);
  process.exitCode = 1;
}

function validateCorpus(value) {
  if (!Array.isArray(value)) {
    throw new TypeError("CommonMark corpus must be a JSON array.");
  }

  for (const [index, fixture] of value.entries()) {
    assertFixtureField(fixture, "markdown", "string", index);
    assertFixtureField(fixture, "html", "string", index);
    assertFixtureField(fixture, "example", "number", index);
    assertFixtureField(fixture, "start_line", "number", index);
    assertFixtureField(fixture, "end_line", "number", index);
    assertFixtureField(fixture, "section", "string", index);
  }
}

function assertFixtureField(fixture, field, expectedType, index) {
  if (typeof fixture?.[field] !== expectedType) {
    throw new TypeError(`CommonMark fixture at index ${index} has invalid ${field}.`);
  }
}

function normalizeCommonMarkHtml(html) {
  return html.endsWith("\n") ? html.slice(0, -1) : html;
}

function getSectionSummary(sections, sectionName) {
  const existing = sections.get(sectionName);
  if (existing) return existing;

  const created = {
    total: 0,
    passed: 0,
    firstFailures: []
  };
  sections.set(sectionName, created);
  return created;
}
