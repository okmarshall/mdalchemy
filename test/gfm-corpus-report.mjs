import { readFile } from "node:fs/promises";
import { renderMarkdown } from "../dist/index.js";
import { resolveConfig } from "../dist/config/config-loader.js";

const corpusPath = new URL("./fixtures/conformance/gfm-0.29.json", import.meta.url);
const isStrict = process.argv.includes("--strict");

const extensionMap = new Map([
  ["table", "gfm-table"],
  ["strikethrough", "gfm-strikethrough"],
  ["autolink", "gfm-literal-autolink"],
  ["tagfilter", "gfm-tagfilter"]
]);

const acceptedDifferences = new Map([
  [398, "CommonMark 0.29 emphasis differs from mdalchemy's CommonMark 0.31.2 core target."],
  [426, "CommonMark 0.29 emphasis differs from mdalchemy's CommonMark 0.31.2 core target."],
  [434, "CommonMark 0.29 emphasis differs from mdalchemy's CommonMark 0.31.2 core target."],
  [435, "CommonMark 0.29 emphasis differs from mdalchemy's CommonMark 0.31.2 core target."],
  [436, "CommonMark 0.29 emphasis differs from mdalchemy's CommonMark 0.31.2 core target."],
  [473, "CommonMark 0.29 emphasis differs from mdalchemy's CommonMark 0.31.2 core target."],
  [474, "CommonMark 0.29 emphasis differs from mdalchemy's CommonMark 0.31.2 core target."],
  [475, "CommonMark 0.29 emphasis differs from mdalchemy's CommonMark 0.31.2 core target."],
  [477, "CommonMark 0.29 emphasis differs from mdalchemy's CommonMark 0.31.2 core target."]
]);

const fixtures = JSON.parse(await readFile(corpusPath, "utf8"));
validateCorpus(fixtures);

const sections = new Map();
const unexpectedFailures = [];
const acceptedFailures = [];
const configCache = new Map();

for (const fixture of fixtures) {
  const config = configForFixture(fixture);
  const rendered = await renderMarkdown(fixture.markdown, { config, commonmarkCompatible: true });
  const expected = normalizeFixtureHtml(fixture.html);
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
    endLine: fixture.end_line,
    reason: acceptedDifferences.get(fixture.example)
  };

  if (failure.reason) {
    acceptedFailures.push(failure);
    section.accepted += 1;
    continue;
  }

  unexpectedFailures.push(failure);
  if (section.firstFailures.length < 5) section.firstFailures.push(failure);
}

const total = fixtures.length;
const exact = total - acceptedFailures.length - unexpectedFailures.length;

console.log(
  `GFM 0.29 corpus: ${exact}/${total} examples matched exactly; `
  + `${acceptedFailures.length} accepted CommonMark-version differences; `
  + `${unexpectedFailures.length} unexpected failures`
);
console.log("");
console.log("| Section | Exact | Accepted | Total | First unexpected failures |");
console.log("| --- | ---: | ---: | ---: | --- |");
for (const [section, summary] of sections) {
  const firstFailures = summary.firstFailures.map((failure) => `#${failure.example}`).join(", ") || "-";
  console.log(`| ${section} | ${summary.passed} | ${summary.accepted} | ${summary.total} | ${firstFailures} |`);
}

if (acceptedFailures.length > 0) {
  console.log("");
  console.log(`Accepted CommonMark-version differences: ${acceptedFailures.map((failure) => `#${failure.example}`).join(", ")}`);
}

if (unexpectedFailures.length > 0) {
  console.log("");
  console.log(`First unexpected failures: ${unexpectedFailures.slice(0, 25).map((failure) => `#${failure.example}`).join(", ")}`);
}

if (isStrict && unexpectedFailures.length > 0) {
  console.error("");
  console.error(`GFM strict mode failed: ${unexpectedFailures.length} unexpected examples did not match.`);
  process.exitCode = 1;
}

function configForFixture(fixture) {
  const extensions = fixture.extensions.map((extension) => {
    const mapped = extensionMap.get(extension);
    if (!mapped) throw new TypeError(`Unsupported GFM fixture extension "${extension}" in example #${fixture.example}.`);
    return mapped;
  });
  const key = extensions.join("\0");
  const cached = configCache.get(key);
  if (cached) return cached;

  const config = resolveConfig({
    markdown: {
      profile: "commonmark",
      extensions
    },
    html: {
      fragment: true,
      headingAnchors: false,
      tableOfContents: false,
      safeUrls: false
    }
  });
  configCache.set(key, config);
  return config;
}

function validateCorpus(value) {
  if (!Array.isArray(value)) {
    throw new TypeError("GFM corpus must be a JSON array.");
  }

  for (const [index, fixture] of value.entries()) {
    assertFixtureField(fixture, "markdown", "string", index);
    assertFixtureField(fixture, "html", "string", index);
    assertFixtureField(fixture, "example", "number", index);
    assertFixtureField(fixture, "start_line", "number", index);
    assertFixtureField(fixture, "end_line", "number", index);
    assertFixtureField(fixture, "section", "string", index);
    if (!Array.isArray(fixture.extensions) || fixture.extensions.some((extension) => typeof extension !== "string")) {
      throw new TypeError(`GFM fixture at index ${index} has invalid extensions.`);
    }
  }
}

function assertFixtureField(fixture, field, expectedType, index) {
  if (typeof fixture?.[field] !== expectedType) {
    throw new TypeError(`GFM fixture at index ${index} has invalid ${field}.`);
  }
}

function normalizeFixtureHtml(html) {
  return html.endsWith("\n") ? html.slice(0, -1) : html;
}

function getSectionSummary(sections, sectionName) {
  const existing = sections.get(sectionName);
  if (existing) return existing;

  const created = {
    total: 0,
    passed: 0,
    accepted: 0,
    firstFailures: []
  };
  sections.set(sectionName, created);
  return created;
}
