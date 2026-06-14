import type { Diagnostic } from "../../core/diagnostics.js";
import type { DocumentOutline } from "../../document/outline.js";
import type { FootnoteDefinitionNode, HeadingNode } from "../../markdown/ast.js";
import type { ResolvedConfig } from "../../config/config-schema.js";

export interface RenderContext {
  config: ResolvedConfig;
  commonmarkCompatible: boolean;
  outline: DocumentOutline;
  headingIds: Map<HeadingNode, string>;
  diagnostics: Diagnostic[];
  footnoteDefinitions: Map<string, FootnoteDefinitionNode>;
  footnoteNumbers: Map<string, number>;
  footnoteReferenceIds: Map<string, string[]>;
}
