import path from "node:path";
import type { Diagnostic } from "../core/diagnostics.js";
import { readMarkdownFile } from "../io/files.js";
import { parseMarkdown } from "../markdown/parser.js";
import { renderDocument, type RenderOptions } from "../render/html/html-renderer.js";
import { composeBookDocument, bookFileTitle } from "./composer.js";
import { discoverMarkdownFiles } from "./discovery.js";
import { readBookFrontmatter } from "./frontmatter.js";
import { rewriteBookLinks } from "./link-rewriter.js";
import { buildBookTocItems } from "./toc.js";
import type { ParsedBookFile, RenderProjectBookOptions, RenderProjectBookResult } from "./types.js";

export type { ProjectBookFile, RenderProjectBookOptions, RenderProjectBookResult } from "./types.js";

export async function renderProjectBook(options: RenderProjectBookOptions): Promise<RenderProjectBookResult> {
  const candidates = await discoverMarkdownFiles(options.rootPath, options.config.book);
  const parsedFiles: ParsedBookFile[] = [];

  for (const candidate of candidates) {
    const markdown = await readMarkdownFile(candidate.absolutePath);
    const metadata = readBookFrontmatter(markdown);
    if (metadata.include === false) continue;

    const parsed = parseMarkdown(markdown, options.config.markdown, candidate.absolutePath);
    parsedFiles.push({
      absolutePath: candidate.absolutePath,
      relativePath: candidate.relativePath,
      title: bookFileTitle(candidate.relativePath, metadata, parsed.document),
      metadata,
      document: parsed.document
    });
  }

  if (parsedFiles.length === 0) {
    throw new Error(`No Markdown files matched the book include/exclude settings in ${options.rootPath}.`);
  }

  const bookTitle = options.config.html.title || `${path.basename(options.rootPath) || "Project"} Documentation`;
  const composed = composeBookDocument(bookTitle, parsedFiles);
  const diagnostics: Diagnostic[] = [];
  rewriteBookLinks(composed, {
    outputDir: options.outputPath ? path.dirname(options.outputPath) : options.rootPath,
    explicitTitle: options.config.html.title || bookTitle,
    diagnostics
  });

  const renderOptions: RenderOptions = { config: options.config };
  if (options.cwd) renderOptions.cwd = options.cwd;
  if (options.theme) renderOptions.theme = options.theme;
  if (options.config.book.folderStructure) {
    renderOptions.tocItems = buildBookTocItems(composed, bookTitle);
  }
  if (options.config.book.sidebar || options.config.book.search) {
    renderOptions.bookNavigation = {
      title: bookTitle,
      sidebar: options.config.book.sidebar,
      search: options.config.book.search
    };
  }
  const rendered = await renderDocument(composed.document, renderOptions);

  return {
    ...rendered,
    diagnostics: [...diagnostics, ...rendered.diagnostics],
    files: composed.files.map((file) => ({
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      title: file.title
    }))
  };
}
