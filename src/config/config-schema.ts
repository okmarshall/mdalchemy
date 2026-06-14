export interface MdalchemyConfig {
  version?: number | undefined;
  output?: OutputConfig | undefined;
  markdown?: MarkdownConfig | undefined;
  html?: HtmlConfig | undefined;
  theme?: string | Record<string, unknown> | undefined;
}

export interface OutputConfig {
  format?: "html" | undefined;
  standalone?: boolean | undefined;
  createDirs?: boolean | undefined;
}

export interface MarkdownConfig {
  profile?: "commonmark" | undefined;
  extensions?: string[] | undefined;
}

export interface HtmlConfig {
  lang?: string | undefined;
  rawHtml?: "allow" | "escape" | "strip" | undefined;
  safeUrls?: boolean | undefined;
  headingAnchors?: boolean | undefined;
  sections?: boolean | undefined;
  tableOfContents?: boolean | "auto" | undefined;
  tocDepth?: number | undefined;
  softBreak?: "newline" | "space" | "br" | undefined;
  fragment?: boolean | undefined;
  title?: string | undefined;
}

export interface ResolvedConfig {
  output: {
    format: "html";
    standalone: boolean;
    createDirs: boolean;
  };
  markdown: {
    profile: "commonmark";
    extensions: string[];
  };
  html: {
    lang: string;
    rawHtml: "allow" | "escape" | "strip";
    safeUrls: boolean;
    headingAnchors: boolean;
    sections: boolean;
    tableOfContents: boolean | "auto";
    tocDepth: number;
    softBreak: "newline" | "space" | "br";
    fragment: boolean;
    title: string;
  };
  theme: string | Record<string, unknown>;
  strict: boolean;
}

export const defaultConfig: ResolvedConfig = {
  output: {
    format: "html",
    standalone: true,
    createDirs: false
  },
  markdown: {
    profile: "commonmark",
    extensions: []
  },
  html: {
    lang: "en",
    rawHtml: "allow",
    safeUrls: true,
    headingAnchors: true,
    sections: false,
    tableOfContents: "auto",
    tocDepth: 3,
    softBreak: "newline",
    fragment: false,
    title: ""
  },
  theme: "serif",
  strict: false
};
