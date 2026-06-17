export const tocCss = `.mda-toc {
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
}`;
