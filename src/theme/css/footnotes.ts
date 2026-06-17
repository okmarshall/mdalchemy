export const footnotesCss = `.mda-footnote-ref {
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
}`;
