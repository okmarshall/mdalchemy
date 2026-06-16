export type SyntaxClassName =
  | "attribute"
  | "builtin"
  | "comment"
  | "function"
  | "keyword"
  | "number"
  | "operator"
  | "property"
  | "punctuation"
  | "string"
  | "tag";

export interface SyntaxRule {
  readonly className: SyntaxClassName;
  readonly pattern: RegExp;
}

export interface SyntaxDefinition {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly rules: readonly SyntaxRule[];
}

export interface SyntaxMatch {
  readonly className: SyntaxClassName;
  readonly value: string;
}
