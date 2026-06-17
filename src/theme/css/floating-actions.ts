export const floatingActionsCss = `.mda-floating-actions {
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
}`;
