export const codeCss = `pre {
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
}`;
