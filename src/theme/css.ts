import { baseTokens } from "./tokens.js";

export function themeToCss(tokens: Record<string, string>): string {
  const vars = Object.entries(tokens)
    .filter(([key]) => key in baseTokens)
    .map(([key, value]) => `  --mda-${key.replaceAll(".", "-")}: ${sanitizeCssValue(value)};`)
    .join("\n");

  return `:root {
${vars}
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--mda-color-background);
  color: var(--mda-color-text);
  font-family: var(--mda-font-body);
  font-size: var(--mda-font-size-base);
  line-height: var(--mda-lineHeight-body);
  min-height: 100vh;
}

html {
  scroll-behavior: smooth;
}

.mda-document {
  width: min(calc(100% - clamp(24px, 4vw, 80px)), var(--mda-layout-maxWidth));
  margin: clamp(18px, 4vw, 56px) auto;
  padding: var(--mda-layout-pagePadding);
  background: var(--mda-color-document);
  border: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 28%);
  border-radius: calc(var(--mda-layout-radius) * 1.6);
  box-shadow: 0 24px 70px var(--mda-color-shadow);
}

.mda-content {
  max-width: 100%;
}

.mda-content > * + * {
  margin-top: var(--mda-space-block);
}

.mda-section {
  display: block;
}

.mda-section > .mda-section {
  margin-top: var(--mda-space-block);
}

.mda-section-details {
  display: block;
}

.mda-section-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.55rem;
  align-items: baseline;
  cursor: pointer;
  list-style: none;
}

.mda-section-summary::-webkit-details-marker {
  display: none;
}

.mda-section-summary::before {
  content: "";
  width: 0.52rem;
  height: 0.52rem;
  margin-top: 0.1em;
  border-right: 0.14rem solid var(--mda-color-accent);
  border-bottom: 0.14rem solid var(--mda-color-accent);
  transform: rotate(-45deg);
  transition: transform 160ms ease;
}

.mda-section-details[open] > .mda-section-summary::before {
  transform: rotate(45deg);
}

.mda-section-summary:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--mda-color-accent), transparent 45%);
  outline-offset: 0.2rem;
  border-radius: var(--mda-layout-radius);
}

.mda-section-summary > :is(h1, h2, h3, h4, h5, h6) {
  min-width: 0;
  margin-top: var(--mda-space-headingBefore);
}

.mda-section-body {
  min-width: 0;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  color: var(--mda-color-text);
  font-family: var(--mda-font-heading);
  line-height: var(--mda-lineHeight-heading);
  margin: var(--mda-space-headingBefore) 0 var(--mda-space-headingAfter);
  letter-spacing: 0;
}

h1 {
  font-size: clamp(2rem, 6vw, 3.4rem);
  padding-bottom: 0.35em;
  border-bottom: 3px solid var(--mda-color-accentSoft);
}

h2 {
  font-size: 1.8rem;
  color: var(--mda-color-secondary);
}

h3 {
  font-size: 1.35rem;
}

p {
  margin: var(--mda-space-paragraph) 0;
}

a {
  color: var(--mda-color-accent);
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.18em;
}

a:hover {
  color: var(--mda-color-secondary);
}

blockquote {
  margin: 1.5rem 0;
  padding: 0.45rem 1.1rem;
  border-left: 5px solid var(--mda-color-accent);
  border-radius: 0 var(--mda-layout-radius) var(--mda-layout-radius) 0;
  color: var(--mda-color-muted);
  background: color-mix(in srgb, var(--mda-color-surface), transparent 20%);
}

ul,
ol {
  padding-left: 1.5rem;
}

li + li {
  margin-top: var(--mda-space-list);
}

del {
  color: var(--mda-color-muted);
  text-decoration-color: var(--mda-color-accent);
  text-decoration-thickness: 0.12em;
  text-decoration-skip-ink: auto;
}

.mda-task-list {
  padding-left: 0;
  list-style: none;
}

.mda-task-list-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.65rem;
  align-items: start;
}

.mda-task-list-checkbox {
  width: 1rem;
  height: 1rem;
  margin: 0.42em 0 0;
  accent-color: var(--mda-color-accent);
}

.mda-task-list-content {
  min-width: 0;
}

.mda-task-list-content > :first-child {
  margin-top: 0;
}

.mda-task-list-content > :last-child {
  margin-bottom: 0;
}

pre {
  overflow-x: auto;
  position: relative;
  tab-size: 2;
  margin: 1.25rem 0;
  padding: calc(var(--mda-space-code) + 0.25rem) var(--mda-space-code) var(--mda-space-code);
  border-radius: var(--mda-layout-radius);
  border: var(--mda-layout-borderWidth) solid var(--mda-color-codeBorder);
  background: var(--mda-color-codeBackground);
  color: var(--mda-color-codeText);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 28px var(--mda-color-shadow);
}

code {
  font-family: var(--mda-font-mono);
  font-size: var(--mda-font-size-code);
}

pre code {
  display: block;
  min-width: max-content;
  padding-right: 3.5rem;
}

pre[data-language]::before {
  content: attr(data-language);
  position: absolute;
  top: 0.65rem;
  right: 0.8rem;
  color: var(--mda-syntax-comment);
  font-family: var(--mda-font-mono);
  font-size: 0.72rem;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:not(pre) > code {
  padding: 0.12em 0.32em;
  border-radius: 0.28em;
  background: color-mix(in srgb, var(--mda-color-surface), var(--mda-color-accentSoft) 18%);
  color: var(--mda-color-accent);
  border: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 35%);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.mda-syntax-keyword {
  color: var(--mda-syntax-keyword);
  font-weight: 650;
}

.mda-syntax-string {
  color: var(--mda-syntax-string);
}

.mda-syntax-number {
  color: var(--mda-syntax-number);
}

.mda-syntax-comment {
  color: var(--mda-syntax-comment);
  font-style: italic;
}

.mda-syntax-function {
  color: var(--mda-syntax-function);
}

.mda-syntax-property {
  color: var(--mda-syntax-property);
}

.mda-syntax-builtin {
  color: var(--mda-syntax-builtin);
}

.mda-syntax-operator {
  color: var(--mda-syntax-operator);
}

.mda-syntax-punctuation {
  color: var(--mda-syntax-punctuation);
}

.mda-syntax-tag {
  color: var(--mda-syntax-tag);
}

.mda-syntax-attribute {
  color: var(--mda-syntax-attribute);
}

hr {
  border: 0;
  border-top: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  margin: 2rem 0;
}

img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1rem auto;
  border-radius: var(--mda-layout-radius);
  border: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 25%);
  box-shadow: 0 14px 34px var(--mda-color-shadow);
}

.mda-table-scroll {
  width: 100%;
  max-width: 100%;
  margin: 1.5rem 0;
  overflow-x: auto;
  overflow-y: hidden;
  border: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  border-radius: var(--mda-layout-radius);
  background: var(--mda-color-document);
  -webkit-overflow-scrolling: touch;
}

.mda-table-scroll:focus {
  outline: 3px solid color-mix(in srgb, var(--mda-color-accent), transparent 45%);
  outline-offset: 3px;
}

table {
  width: 100%;
  min-width: 100%;
  margin: 1.5rem 0;
  border-collapse: collapse;
  overflow: hidden;
  border: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  border-radius: var(--mda-layout-radius);
}

.mda-table-scroll table {
  width: max-content;
  min-width: 100%;
  max-width: none;
  margin: 0;
  border: 0;
  border-radius: 0;
}

th,
td {
  min-width: 7rem;
  max-width: min(34rem, 75vw);
  padding: 0.65rem 0.8rem;
  border-bottom: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: normal;
}

th code,
td code {
  white-space: normal;
}

th {
  background: color-mix(in srgb, var(--mda-color-surface), var(--mda-color-accentSoft) 22%);
  color: var(--mda-color-text);
  font-weight: 700;
}

tr:last-child td {
  border-bottom: 0;
}

.mda-toc {
  margin: 0 0 2rem;
  padding: 1rem;
  border: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  border-radius: var(--mda-layout-radius);
  background: color-mix(in srgb, var(--mda-color-surface), transparent 10%);
}

.mda-toc ol {
  margin: 0.35rem 0 0;
}

.mda-toc-details {
  display: block;
}

.mda-toc-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.45rem;
  align-items: baseline;
  cursor: pointer;
  list-style: none;
}

.mda-toc-summary::-webkit-details-marker {
  display: none;
}

.mda-toc-summary::before {
  content: "";
  width: 0.45rem;
  height: 0.45rem;
  margin-top: 0.1em;
  border-right: 0.12rem solid var(--mda-color-accent);
  border-bottom: 0.12rem solid var(--mda-color-accent);
  transform: rotate(-45deg);
  transition: transform 160ms ease;
}

.mda-toc-details[open] > .mda-toc-summary::before {
  transform: rotate(45deg);
}

.mda-toc-summary:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--mda-color-accent), transparent 45%);
  outline-offset: 0.15rem;
  border-radius: calc(var(--mda-layout-radius) * 0.75);
}

.mda-toc-summary > a {
  min-width: 0;
}

.mda-toc-label {
  color: var(--mda-color-text);
  font-weight: 700;
}

.mda-floating-actions {
  position: fixed;
  right: clamp(1rem, 3vw, 2rem);
  bottom: clamp(1rem, 3vw, 2rem);
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  max-width: min(24rem, calc(100vw - 2rem));
}

.mda-floating-action {
  appearance: none;
  padding: 0.55rem 0.8rem;
  border: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  border-radius: var(--mda-layout-radius);
  background: color-mix(in srgb, var(--mda-color-document), transparent 8%);
  box-shadow: 0 12px 30px var(--mda-color-shadow);
  color: var(--mda-color-accent);
  cursor: pointer;
  font-family: var(--mda-font-body);
  font-size: var(--mda-font-size-small);
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
}

.mda-floating-action:hover {
  color: var(--mda-color-secondary);
}

.mda-floating-action:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--mda-color-accent), transparent 45%);
  outline-offset: 0.15rem;
}

.mda-footnote-ref {
  display: inline-block;
  min-width: 1.35em;
  margin-left: 0.12em;
  padding: 0.05em 0.28em;
  border-radius: 999px;
  background: color-mix(in srgb, var(--mda-color-accentSoft), transparent 15%);
  color: var(--mda-color-accent);
  font-size: 0.72em;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  text-decoration: none;
}

.mda-footnotes {
  margin-top: 3rem;
  color: var(--mda-color-muted);
  font-size: var(--mda-font-size-small);
}

.mda-footnotes hr {
  margin-bottom: 1rem;
}

.mda-footnotes ol {
  padding-left: 1.35rem;
}

.mda-footnotes li:target {
  background: color-mix(in srgb, var(--mda-color-accentSoft), transparent 60%);
}

.mda-footnote-backrefs {
  margin-top: 0.5rem;
}

.mda-footnote-backref {
  font-size: 0.85em;
}

.mda-heading-anchor {
  opacity: 0;
  margin-left: -0.85em;
  padding-right: 0.25em;
  text-decoration: none;
}

.mda-heading-anchor-after {
  margin-left: 0.35em;
  padding-right: 0;
}

h1:hover .mda-heading-anchor,
h2:hover .mda-heading-anchor,
h3:hover .mda-heading-anchor,
h4:hover .mda-heading-anchor,
h5:hover .mda-heading-anchor,
h6:hover .mda-heading-anchor {
  opacity: 0.6;
}

@media print {
  body {
    background: white;
  }

  .mda-document {
    width: auto;
    margin: 0;
    padding: 0;
    border: 0;
    box-shadow: none;
  }

  pre,
  blockquote,
  .mda-section,
  .mda-table-scroll {
    break-inside: avoid;
  }

  .mda-floating-actions {
    display: none;
  }

  .mda-table-scroll {
    overflow: visible;
  }

  .mda-toc-summary::before,
  .mda-section-summary::before {
    display: none;
  }

  .mda-toc-details:not([open]) > ol,
  .mda-section-details:not([open]) > .mda-section-body {
    display: block;
  }

  .mda-table-scroll table {
    width: 100%;
    max-width: 100%;
  }
}

@media (max-width: 720px) {
  .mda-document {
    width: 100%;
    margin: 0;
    border-width: 0;
    border-radius: 0;
    box-shadow: none;
  }
}`;
}

function sanitizeCssValue(value: string): string {
  return value.replace(/[;{}]/g, "");
}
