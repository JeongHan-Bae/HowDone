import type { DocumentAst } from "../ast/types.ts";

export const TokenKind = {
  frontmatter: "frontmatter",
  syntaxNode: "syntax-node",
  eof: "eof",
} as const;

export type TokenKind = (typeof TokenKind)[keyof typeof TokenKind];

export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface TokenSpan {
  start: SourcePosition;
  end: SourcePosition;
}

export interface TokenBase<K extends TokenKind = TokenKind> extends TokenSpan {
  kind: K;
  lexeme: string;
}

export interface ScannedParagraphNode {
  type: "paragraph";
  text: string;
}

export interface ScannedHeadingNode {
  type: "heading";
  depth: number;
  text: string;
}

export interface ScannedListItemNode {
  type: "list-item";
  checked: boolean | null;
  children: ScannedBlockNode[];
}

export interface ScannedListNode {
  type: "list";
  ordered: boolean;
  start: number | null;
  items: ScannedListItemNode[];
}

export interface ScannedBlockquoteNode {
  type: "blockquote";
  children: ScannedBlockNode[];
}

export interface ScannedCodeBlockNode {
  type: "code-block";
  language: string | null;
  value: string;
}

export interface ScannedTableNode {
  type: "table";
  value: string;
}

export interface ScannedHtmlNode {
  type: "html";
  value: string;
}

export interface ScannedThematicBreakNode {
  type: "thematic-break";
}

export interface ScannedUnsupportedNode {
  type: "unsupported";
  value: string;
}

export type ScannedBlockNode =
  | ScannedParagraphNode
  | ScannedHeadingNode
  | ScannedListNode
  | ScannedBlockquoteNode
  | ScannedCodeBlockNode
  | ScannedTableNode
  | ScannedHtmlNode
  | ScannedThematicBreakNode
  | ScannedUnsupportedNode;

export interface ScannedFrontmatterNode {
  type: "frontmatter";
  format: "yaml" | "toml";
  value: string;
}

export interface SyntaxNodeToken extends TokenBase<typeof TokenKind.syntaxNode> {
  node: ScannedBlockNode;
}

export interface FrontmatterToken extends TokenBase<typeof TokenKind.frontmatter> {
  node: ScannedFrontmatterNode;
}

export interface EofToken extends TokenBase<typeof TokenKind.eof> {
  kind: typeof TokenKind.eof;
}

export type LexerToken = SyntaxNodeToken | FrontmatterToken | EofToken;

export interface SourceDocument {
  sourceText: string;
  sourcePath?: string;
  tokens: LexerToken[];
  ast: DocumentAst;
}
