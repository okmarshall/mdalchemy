export const responsiveCss = `@media (max-width: 720px) {
  .mda-document {
    width: 100%;
    margin: 0;
    border-width: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .mda-book-search-panel {
    width: 100%;
    margin: 0;
    padding: var(--mda-layout-pagePadding);
  }
}

@media (max-width: 980px) {
  .mda-book-layout {
    display: block;
  }

  .mda-book-layout .mda-document {
    margin-left: auto;
    margin-right: auto;
  }

  .mda-book-sidebar {
    position: static;
    max-height: none;
    border-right: 0;
    border-bottom: var(--mda-layout-borderWidth) solid color-mix(in srgb, var(--mda-color-border), transparent 30%);
  }
}`;
