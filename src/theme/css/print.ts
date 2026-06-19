export const printCss = `@media print {
  body {
    background: white;
  }

  .mda-document {
    width: auto;
    margin: 0;
    padding: 0;
    border: 0;
    box-shadow: none;
  }

  pre,
  blockquote,
  .mda-section,
  .mda-table-scroll,
  .mda-mermaid {
    break-inside: avoid;
  }

  .mda-floating-actions {
    display: none;
  }

  .mda-table-scroll {
    overflow: visible;
  }

  .mda-mermaid {
    overflow: visible;
    box-shadow: none;
  }

  .mda-toc-summary::before,
  .mda-section-summary::before {
    display: none;
  }

  .mda-toc-details:not([open]) > ol,
  .mda-section-details:not([open]) > .mda-section-body {
    display: block;
  }

  .mda-table-scroll table {
    width: 100%;
    max-width: 100%;
  }
}`;
