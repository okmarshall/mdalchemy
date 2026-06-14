import type { ThemeDefinition } from "./types.js";

export const baseTokens: Record<string, string> = {
  "color.background": "#eef2ef",
  "color.document": "#fffefa",
  "color.surface": "#f6f8fa",
  "color.text": "#1d2428",
  "color.muted": "#657177",
  "color.accent": "#9b3d2e",
  "color.accentSoft": "#e8c8bd",
  "color.secondary": "#2f6f73",
  "color.accentText": "#ffffff",
  "color.border": "#cbd8d0",
  "color.shadow": "rgba(31, 43, 45, 0.14)",
  "color.codeBackground": "#111b22",
  "color.codeText": "#e8eef0",
  "color.codeBorder": "#31424d",
  "syntax.keyword": "#ff9e64",
  "syntax.string": "#9ece6a",
  "syntax.number": "#c7a9ff",
  "syntax.comment": "#80919b",
  "syntax.function": "#7dcfff",
  "syntax.property": "#ffd166",
  "syntax.builtin": "#6be4d8",
  "syntax.operator": "#f7768e",
  "syntax.punctuation": "#a8b7c2",
  "syntax.tag": "#7dcfff",
  "syntax.attribute": "#ffd166",
  "font.body": "ui-serif, Georgia, Cambria, Times New Roman, serif",
  "font.heading": "ui-serif, Georgia, Cambria, Times New Roman, serif",
  "font.mono": "ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace",
  "font.size.base": "18px",
  "font.size.small": "0.9rem",
  "font.size.code": "0.92em",
  "lineHeight.body": "1.68",
  "lineHeight.heading": "1.2",
  "layout.maxWidth": "960px",
  "layout.pagePadding": "clamp(24px, 5vw, 64px)",
  "layout.radius": "8px",
  "layout.borderWidth": "1px",
  "space.block": "1.2rem",
  "space.paragraph": "1rem",
  "space.headingBefore": "2rem",
  "space.headingAfter": "0.75rem",
  "space.list": "0.4rem",
  "space.code": "1rem"
};

export const builtInThemes: Record<string, ThemeDefinition> = {
  serif: {
    name: "serif",
    tokens: {
      ...baseTokens,
      "color.background": "#edf2ef",
      "color.document": "#fffefa",
      "color.surface": "#f4f0e8",
      "color.text": "#1e2528",
      "color.muted": "#637177",
      "color.accent": "#9b3d2e",
      "color.accentSoft": "#e8c8bd",
      "color.secondary": "#2f6f73",
      "color.border": "#cbd8d0",
      "color.shadow": "rgba(33, 46, 48, 0.16)",
      "color.codeBackground": "#111b22",
      "color.codeText": "#edf4f5",
      "color.codeBorder": "#31424d"
    }
  },
  sans: {
    name: "sans",
    tokens: {
      ...baseTokens,
      "font.body": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.heading": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.size.base": "17px",
      "color.background": "#eef3f5",
      "color.document": "#ffffff",
      "color.surface": "#f2f6f7",
      "color.accent": "#0f6b6e",
      "color.secondary": "#8f3d2f",
      "color.border": "#ccd8db",
      "color.shadow": "rgba(20, 38, 45, 0.12)"
    }
  },
  technical: {
    name: "technical",
    tokens: {
      ...baseTokens,
      "font.body": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.heading": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "font.size.base": "16px",
      "layout.maxWidth": "1040px",
      "color.background": "#eef3f5",
      "color.document": "#fbfcfd",
      "color.surface": "#e8f0f3",
      "color.text": "#18212b",
      "color.muted": "#586674",
      "color.accent": "#0f6b6e",
      "color.accentSoft": "#b8dedc",
      "color.secondary": "#9b3d2e",
      "color.border": "#c9d6e2",
      "color.shadow": "rgba(18, 31, 45, 0.14)",
      "color.codeBackground": "#101820",
      "color.codeText": "#e7edf3",
      "color.codeBorder": "#2d4350"
    }
  }
};
