import type { DocumentAst } from "../ast/types.ts";

/**
 * @brief Names the token categories produced by a Markdown lexer.
 *
 * @details
 * The token kind is the discriminant used by the parser to distinguish
 * Markdown syntax, frontmatter, and the end of the source stream.
 */
export const TokenKind = {
  frontmatter: "frontmatter",
  syntaxNode: "syntax-node",
  eof: "eof",
} as const;

/**
 * @brief The union of token-kind values supported by the Core source contract.
 */
export type TokenKind = (typeof TokenKind)[keyof typeof TokenKind];

/**
 * @brief Identifies one location in the original source text.
 *
 * @details
 * Positions are retained on tokens so consumers can report source-aware
 * diagnostics without depending on the lexer implementation.
 */
export interface SourcePosition {
  /** @brief Zero-based offset into the source string. */
  offset: number;

  /** @brief One-based source line number. */
  line: number;

  /** @brief One-based column number within the source line. */
  column: number;
}

/**
 * @brief Describes the half-open source span occupied by a token.
 *
 * @details
 * `start` identifies the first source position and `end` identifies the
 * position immediately after the token's source text.
 */
export interface TokenSpan {
  /** @brief Position at which the token begins. */
  start: SourcePosition;

  /** @brief Position immediately after the token. */
  end: SourcePosition;
}

/**
 * @brief Common fields shared by every lexer token.
 *
 * @details
 * The generic kind parameter lets a consumer narrow a token to one category
 * while retaining the common source span and source lexeme.
 */
export interface TokenBase<K extends TokenKind = TokenKind> extends TokenSpan {
  /** @brief Discriminant identifying the token category. */
  kind: K;

  /** @brief Exact source text covered by the token span. */
  lexeme: string;
}

/**
 * @brief A paragraph node emitted by the source lexer.
 */
export interface ScannedParagraphNode {
  /** @brief Identifies this scanned node as a paragraph. */
  type: "paragraph";

  /** @brief Paragraph text extracted from the source. */
  text: string;
}

/**
 * @brief A heading node emitted by the source lexer.
 */
export interface ScannedHeadingNode {
  /** @brief Identifies this scanned node as a heading. */
  type: "heading";

  /** @brief Heading level, where 1 is the highest level. */
  depth: number;

  /** @brief Heading text extracted from the source. */
  text: string;
}

/**
 * @brief A list-item node emitted by the source lexer.
 *
 * @details
 * The nullable `checked` value distinguishes checked, unchecked, and ordinary
 * list items before the AST parser normalizes the node.
 */
export interface ScannedListItemNode {
  /** @brief Identifies this scanned node as a list item. */
  type: "list-item";

  /** @brief Task-list state, or `null` for an ordinary list item. */
  checked: boolean | null;

  /** @brief Nested scanned blocks in source order. */
  children: ScannedBlockNode[];
}

/**
 * @brief A list node emitted by the source lexer.
 */
export interface ScannedListNode {
  /** @brief Identifies this scanned node as a list. */
  type: "list";

  /** @brief True when the source list is ordered. */
  ordered: boolean;

  /** @brief First ordered-list number, or `null` for an unordered list. */
  start: number | null;

  /** @brief Scanned list items in source order. */
  items: ScannedListItemNode[];
}

/**
 * @brief A block quote node emitted by the source lexer.
 */
export interface ScannedBlockquoteNode {
  /** @brief Identifies this scanned node as a block quote. */
  type: "blockquote";

  /** @brief Scanned blocks nested inside the quote. */
  children: ScannedBlockNode[];
}

/**
 * @brief A code-block node emitted by the source lexer.
 */
export interface ScannedCodeBlockNode {
  /** @brief Identifies this scanned node as a code block. */
  type: "code-block";

  /** @brief Declared code language, or `null` when none was provided. */
  language: string | null;

  /** @brief Code contents without the Markdown fence. */
  value: string;
}

/**
 * @brief A table node emitted by the source lexer.
 */
export interface ScannedTableNode {
  /** @brief Identifies this scanned node as a table. */
  type: "table";

  /** @brief Table text retained as an opaque source value. */
  value: string;
}

/**
 * @brief A raw HTML node emitted by the source lexer.
 */
export interface ScannedHtmlNode {
  /** @brief Identifies this scanned node as raw HTML. */
  type: "html";

  /** @brief Raw HTML text retained by the lexer. */
  value: string;
}

/**
 * @brief A thematic-break node emitted by the source lexer.
 */
export interface ScannedThematicBreakNode {
  /** @brief Identifies this scanned node as a thematic break. */
  type: "thematic-break";
}

/**
 * @brief A source block without a dedicated normalized AST shape.
 */
export interface ScannedUnsupportedNode {
  /** @brief Identifies this scanned node as unsupported syntax. */
  type: "unsupported";

  /** @brief Source text retained for the unsupported block. */
  value: string;
}

/**
 * @brief Union of block nodes that a Markdown lexer may emit.
 *
 * @details
 * The `type` field is the discriminant used by an AST parser to normalize
 * each scanned block into the Core AST contract.
 */
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

/**
 * @brief A frontmatter node emitted by the source lexer.
 */
export interface ScannedFrontmatterNode {
  /** @brief Identifies this scanned node as frontmatter. */
  type: "frontmatter";

  /** @brief Frontmatter syntax used by the source section. */
  format: "yaml" | "toml";

  /** @brief Raw section contents without its surrounding delimiters. */
  value: string;
}

/**
 * @brief A lexer token containing one normalized Markdown syntax node.
 *
 * @details
 * The token's `node` is the intermediate source representation consumed by
 * the Markdown AST parser.
 */
export interface SyntaxNodeToken extends TokenBase<typeof TokenKind.syntaxNode> {
  /** @brief Scanned Markdown block represented by this token. */
  node: ScannedBlockNode;
}

/**
 * @brief A lexer token containing one frontmatter section.
 */
export interface FrontmatterToken extends TokenBase<typeof TokenKind.frontmatter> {
  /** @brief Scanned frontmatter node represented by this token. */
  node: ScannedFrontmatterNode;
}

/**
 * @brief The end-of-file token emitted after all source content.
 */
export interface EofToken extends TokenBase<typeof TokenKind.eof> {
  /** @brief Repeats the end-of-file token discriminant. */
  kind: typeof TokenKind.eof;
}

/**
 * @brief Union of all tokens in the published lexer-token stream.
 *
 * @details
 * A valid stream contains syntax and frontmatter tokens followed by an EOF
 * token. The parser uses the discriminated union to narrow each token safely.
 */
export type LexerToken = SyntaxNodeToken | FrontmatterToken | EofToken;

/**
 * @brief Captures the source and intermediate values for one pipeline run.
 *
 * @details
 * This value is useful to consumers that need to inspect or preserve each
 * pipeline stage. The Core application may use the same contracts without
 * exposing any filesystem or parser-library type.
 */
export interface SourceDocument {
  /** @brief Complete source text supplied to the lexer. */
  sourceText: string;

  /** @brief Optional caller-supplied path associated with the source. */
  sourcePath?: string;

  /** @brief Ordered tokens produced by the lexer. */
  tokens: LexerToken[];

  /** @brief Normalized AST produced by the parser. */
  ast: DocumentAst;
}
