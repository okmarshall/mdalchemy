import type { Diagnostic } from "../core/diagnostics.js";
import type { DocumentNode, HeadingNode } from "../markdown/ast.js";
import type { RenderResult } from "../render/html/html-renderer.js";
import type { ResolvedConfig } from "../config/config-schema.js";
import type { ResolvedTheme } from "../theme/theme.js";
import type { BookFrontmatter } from "./frontmatter.js";

export interface RenderProjectBookOptions {
  rootPath: string;
  outputPath?: string | undefined;
  config: ResolvedConfig;
  theme?: ResolvedTheme | undefined;
  cwd?: string | undefined;
}

export interface RenderProjectBookResult extends RenderResult {
  files: ProjectBookFile[];
}

export interface ProjectBookFile {
  absolutePath: string;
  relativePath: string;
  title: string;
}

export interface ParsedBookFile extends ProjectBookFile {
  document: DocumentNode;
  metadata: BookFrontmatter;
}

export interface ComposedBookFile extends ProjectBookFile {
  sectionHeading: HeadingNode;
  localTargets: Map<string, HeadingNode>;
}

export interface ComposeResult {
  document: DocumentNode;
  files: ComposedBookFile[];
  nodeFiles: WeakMap<object, ComposedBookFile>;
}

export interface BookLinkRewriteOptions {
  outputDir: string;
  explicitTitle: string;
  diagnostics: Diagnostic[];
}
