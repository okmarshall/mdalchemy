export const bookNavigationCss = `.mda-book-layout {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  align-items: start;
}

.mda-book-layout .mda-document {
  width: min(calc(100% - clamp(24px, 4vw, 80px)), var(--mda-layout-maxWidth));
  margin-left: auto;
  margin-right: auto;
}

.mda-book-sidebar {
  position: sticky;
  top: 0;
  max-height: 100vh;
  overflow: auto;
  padding: clamp(18px, 3vw, 32px) clamp(16px, 2.4vw, 28px);
  background: color-mix(in srgb, var(--mda-color-surface), var(--mda-color-document) 55%);
  border-right: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 30%);
}

.mda-book-sidebar-title {
  display: block;
  margin-bottom: 1rem;
  color: var(--mda-color-text);
  font-family: var(--mda-font-heading);
  font-size: 1.12rem;
  font-weight: 800;
  line-height: 1.25;
  text-decoration: none;
}

.mda-book-sidebar-title:hover {
  color: var(--mda-color-accent);
}

.mda-book-sidebar .mda-toc {
  margin: 1rem 0 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.mda-book-sidebar .mda-toc ol {
  padding-left: 1.05rem;
}

.mda-book-sidebar .mda-toc a,
.mda-book-sidebar .mda-toc-label {
  overflow-wrap: anywhere;
}

.mda-book-search-panel {
  width: min(calc(100% - clamp(24px, 4vw, 80px)), var(--mda-layout-maxWidth));
  margin: clamp(18px, 4vw, 56px) auto 0;
  padding: 0 clamp(12px, 2vw, 20px);
}

.mda-book-search {
  display: grid;
  gap: 0.55rem;
}

.mda-book-search-label {
  color: var(--mda-color-muted);
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: uppercase;
}

.mda-book-search-input {
  width: 100%;
  min-height: 2.45rem;
  padding: 0.55rem 0.7rem;
  color: var(--mda-color-text);
  background: var(--mda-color-document);
  border: var(--mda-layout-borderWidth) solid var(--mda-color-border);
  border-radius: calc(var(--mda-layout-radius) * 0.8);
  font: inherit;
}

.mda-book-search-input:focus {
  outline: 3px solid color-mix(in srgb, var(--mda-color-accent), transparent 62%);
  outline-offset: 0.1rem;
  border-color: var(--mda-color-accent);
}

.mda-book-search-status {
  min-height: 1.15rem;
  color: var(--mda-color-muted);
  font-size: 0.84rem;
}

.mda-book-search-results {
  display: grid;
  gap: 0.65rem;
  max-height: min(45vh, 28rem);
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.mda-book-search-results[hidden] {
  display: none;
}

.mda-book-search-result {
  padding-bottom: 0.65rem;
  border-bottom: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 35%);
}

.mda-book-search-result:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.mda-book-search-result a {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  justify-content: space-between;
  color: var(--mda-color-text);
  text-decoration: none;
}

.mda-book-search-result a:hover .mda-book-search-result-title {
  color: var(--mda-color-accent);
}

.mda-book-search-result-title {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 700;
  line-height: 1.25;
}

.mda-book-search-result-meta {
  flex: 0 0 auto;
  color: var(--mda-color-muted);
  font-size: 0.78rem;
}

.mda-book-search-result-snippet {
  margin: 0.25rem 0 0;
  color: var(--mda-color-muted);
  font-size: 0.86rem;
  line-height: 1.4;
}`;
