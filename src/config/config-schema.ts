export {
  gfmMarkdownExtensions,
  isSupportedMarkdownExtension,
  supportedMarkdownExtensions
} from "../markdown/extensions.js";
export type { MarkdownExtension } from "../markdown/extensions.js";

export interface MdalchemyConfig {
  version?: number | undefined;
  output?: OutputConfig | undefined;
  markdown?: MarkdownConfig | undefined;
  html?: HtmlConfig | undefined;
  book?: BookConfig | undefined;
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
  collapsibleSections?: boolean | undefined;
  tableOfContents?: boolean | "auto" | undefined;
  collapsibleTableOfContents?: boolean | undefined;
  tocDepth?: number | undefined;
  softBreak?: "newline" | "space" | "br" | undefined;
  fragment?: boolean | undefined;
  title?: string | undefined;
}

export interface BookConfig {
  include?: string[] | undefined;
  exclude?: string[] | undefined;
  folderStructure?: boolean | undefined;
  sidebar?: boolean | undefined;
  search?: boolean | undefined;
}

export interface ResolvedConfig {
  version: 1;
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
    collapsibleSections: boolean;
    tableOfContents: boolean | "auto";
    collapsibleTableOfContents: boolean;
    tocDepth: number;
    softBreak: "newline" | "space" | "br";
    fragment: boolean;
    title: string;
  };
  book: {
    include: string[];
    exclude: string[];
    folderStructure: boolean;
    sidebar: boolean;
    search: boolean;
  };
  theme: string | Record<string, unknown>;
  strict: boolean;
}

export const defaultBookInclude = ["**/*.md", "**/*.markdown"];

export const defaultBookExclude = [
  ".git/**",
  "node_modules/**",
  "dist/**",
  "build/**",
  "coverage/**",
  ".next/**",
  "out/**"
];

export const defaultConfig: ResolvedConfig = {
  version: 1,
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
    collapsibleSections: false,
    tableOfContents: "auto",
    collapsibleTableOfContents: false,
    tocDepth: 3,
    softBreak: "newline",
    fragment: false,
    title: ""
  },
  book: {
    include: defaultBookInclude,
    exclude: defaultBookExclude,
    folderStructure: true,
    sidebar: true,
    search: true
  },
  theme: "serif",
  strict: false
};
