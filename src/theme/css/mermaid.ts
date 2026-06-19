export const mermaidCss = `.mda-mermaid {
  width: 100%;
  max-width: 100%;
  margin: 1.5rem 0;
  padding: 1rem;
  overflow-x: auto;
  overflow-y: hidden;
  border: var(--mda-layout-borderWidth) solid var(--mda-color-codeBorder);
  border-radius: var(--mda-layout-radius);
  background: color-mix(in srgb, var(--mda-color-surface), var(--mda-color-document) 40%);
  box-shadow: 0 14px 34px var(--mda-color-shadow);
  -webkit-overflow-scrolling: touch;
}

.mda-mermaid:focus-within {
  outline: 3px solid color-mix(in srgb, var(--mda-color-accent), transparent 45%);
  outline-offset: 0.2rem;
}

.mda-mermaid-canvas:empty {
  display: none;
}

.mda-mermaid[data-mda-mermaid-rendered="true"] > .mermaid {
  display: none;
}

.mda-mermaid-canvas {
  min-width: max-content;
}

.mda-mermaid-canvas svg {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}

.mda-mermaid > .mermaid {
  display: block;
  min-width: max-content;
  margin: 0;
  padding: 0;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: var(--mda-color-codeText);
  font-family: var(--mda-font-mono);
  font-size: var(--mda-font-size-code);
  line-height: 1.55;
  white-space: pre;
}`;
