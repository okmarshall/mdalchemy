export const tablesCss = `.mda-table-scroll {
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
}`;
