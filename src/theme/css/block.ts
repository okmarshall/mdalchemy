export const blockCss = `blockquote {
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
}`;
