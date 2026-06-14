import { buildOutline, type DocumentOutline } from "../../document/outline.js";
import type { DocumentNode } from "../../markdown/ast.js";
import { parseMarkdown, type MarkdownOptions } from "../../markdown/parser.js";
import { defaultConfig, type ResolvedConfig } from "../../config/config-schema.js";
import { resolveTheme, type ResolvedTheme } from "../../theme/theme.js";
import type { Diagnostic } from "../../core/diagnostics.js";
import { renderBlocks } from "./block-renderer.js";
import { renderStandalone } from "./document-shell.js";
import { appendFootnotes, collectFootnoteDefinitions } from "./footnotes.js";
import { renderToc, shouldRenderToc } from "./toc-renderer.js";
import type { RenderContext } from "./types.js";

export interface RenderOptions {
  config?: ResolvedConfig;
  markdown?: MarkdownOptions;
  theme?: ResolvedTheme;
  cwd?: string;
  commonmarkCompatible?: boolean;
}

export interface RenderResult {
  content: string;
  document: DocumentNode;
  diagnostics: Diagnostic[];
  outline: DocumentOutline;
  theme: ResolvedTheme;
}

export async function renderMarkdown(markdown: string, options: RenderOptions = {}): Promise<RenderResult> {
  const parsed = parseMarkdown(markdown, options.markdown ?? options.config?.markdown);
  return renderDocument(parsed.document, options);
}

export async function renderDocument(document: DocumentNode, options: RenderOptions = {}): Promise<RenderResult> {
  const config = options.config ?? defaultConfig;
  const theme = options.theme ?? await resolveTheme(config.theme, options.cwd);
  const outline = buildOutline(document, config.html.title || undefined);
  const headingIds = new Map(outline.headings.map((heading) => [heading.node, heading.id]));
  const diagnostics = [...document.diagnostics, ...theme.diagnostics];
  const footnoteDefinitions = collectFootnoteDefinitions(document.children);
  const context: RenderContext = {
    config,
    commonmarkCompatible: options.commonmarkCompatible ?? false,
    outline,
    headingIds,
    diagnostics,
    footnoteDefinitions,
    footnoteNumbers: new Map(),
    footnoteReferenceIds: new Map()
  };
  const fragment = renderBlocks(document.children, context);
  const withFootnotes = appendFootnotes(fragment, context, renderBlocks);
  const withToc = shouldRenderToc(config, outline)
    ? `${renderToc(outline.tree, config.html.tocDepth)}\n${withFootnotes}`
    : withFootnotes;
  const content = config.output.standalone && !config.html.fragment
    ? renderStandalone(withToc, config, theme, outline.title)
    : withToc;

  return {
    content,
    document,
    diagnostics,
    outline,
    theme
  };
}
