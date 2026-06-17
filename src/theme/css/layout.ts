export const layoutCss = `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--mda-color-background);
  color: var(--mda-color-text);
  font-family: var(--mda-font-body);
  font-size: var(--mda-font-size-base);
  line-height: var(--mda-lineHeight-body);
  min-height: 100vh;
}

html {
  scroll-behavior: smooth;
}

.mda-document {
  width: min(calc(100% - clamp(24px, 4vw, 80px)), var(--mda-layout-maxWidth));
  margin: clamp(18px, 4vw, 56px) auto;
  padding: var(--mda-layout-pagePadding);
  background: var(--mda-color-document);
  border: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 28%);
  border-radius: calc(var(--mda-layout-radius) * 1.6);
  box-shadow: 0 24px 70px var(--mda-color-shadow);
}

.mda-content {
  max-width: 100%;
}

.mda-content > * + * {
  margin-top: var(--mda-space-block);
}`;
