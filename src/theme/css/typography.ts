export const typographyCss = `h1,
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
}`;
