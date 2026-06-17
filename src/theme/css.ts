import { baseTokens } from "./tokens.js";
import { blockCss } from "./css/block.js";
import { codeCss } from "./css/code.js";
import { floatingActionsCss } from "./css/floating-actions.js";
import { footnotesCss } from "./css/footnotes.js";
import { headingAnchorsCss } from "./css/heading-anchors.js";
import { layoutCss } from "./css/layout.js";
import { mediaCss } from "./css/media.js";
import { printCss } from "./css/print.js";
import { responsiveCss } from "./css/responsive.js";
import { sectionsCss } from "./css/sections.js";
import { tablesCss } from "./css/tables.js";
import { tocCss } from "./css/toc.js";
import { typographyCss } from "./css/typography.js";

export function themeToCss(tokens: Record<string, string>): string {
  const vars = Object.entries(tokens)
    .filter(([key]) => key in baseTokens)
    .map(([key, value]) => `  --mda-${key.replaceAll(".", "-")}: ${sanitizeCssValue(value)};`)
    .join("\n");

  return [
    `:root {\n${vars}\n}`,
    layoutCss,
    sectionsCss,
    typographyCss,
    blockCss,
    codeCss,
    mediaCss,
    tablesCss,
    tocCss,
    floatingActionsCss,
    footnotesCss,
    headingAnchorsCss,
    printCss,
    responsiveCss
  ].join("\n\n");
}

function sanitizeCssValue(value: string): string {
  return value.replace(/[;{}]/g, "");
}
