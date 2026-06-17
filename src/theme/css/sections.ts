export const sectionsCss = `.mda-section {
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
}`;
