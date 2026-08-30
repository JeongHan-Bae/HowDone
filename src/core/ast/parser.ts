import type {
  BlockAst,
  DocumentAst,
  FrontmatterAst,
  ListItemAst,
} from "./types.ts";
import type { MarkdownAstParser } from "../ports.ts";
import type {
  FrontmatterToken,
  LexerToken,
  ScannedBlockNode,
  ScannedListItemNode,
  SyntaxNodeToken,
  TokenKind,
} from "../source/types.ts";

function normalizeListItem(item: ScannedListItemNode): ListItemAst {
  return {
    type: "list-item",
    checked: item.checked,
    children: item.children.map(normalizeBlock),
  };
}

function normalizeBlock(node: ScannedBlockNode): BlockAst {
  switch (node.type) {
    case "paragraph":
      return {
        type: "paragraph",
        text: node.text,
      };
    case "heading":
      return {
        type: "heading",
        depth: node.depth,
        text: node.text,
      };
    case "list":
      return {
        type: "list",
        ordered: node.ordered,
        start: node.start,
        items: node.items.map(normalizeListItem),
      };
    case "blockquote":
      return {
        type: "blockquote",
        children: node.children.map(normalizeBlock),
      };
    case "code-block":
      return {
        type: "code-block",
        language: node.language,
        value: node.value,
      };
    case "table":
      return { type: "table", value: node.value };
    case "html":
      return { type: "html", value: node.value };
    case "thematic-break":
      return { type: "thematic-break" };
    case "unsupported":
      return {
        type: "unsupported",
        value: node.value,
      };
  }
}

function normalizeFrontmatter(token: FrontmatterToken): FrontmatterAst {
  return {
    type: "frontmatter",
    format: token.node.format,
    value: token.node.value,
  };
}

function isSyntaxToken(token: LexerToken): token is SyntaxNodeToken {
  return token.kind === ("syntax-node" satisfies TokenKind);
}

function isFrontmatterToken(token: LexerToken): token is FrontmatterToken {
  return token.kind === ("frontmatter" satisfies TokenKind);
}

/**
 * @brief Standard Core implementation of `MarkdownAstParser`.
 *
 * @details
 * The parser normalizes the published lexer-token contract without depending
 * on a Markdown parser library. Consumers may use it with any lexer that
 * emits compatible tokens or provide their own `MarkdownAstParser`.
 */
export class TypedAstParser implements MarkdownAstParser {
  /**
   * @brief Converts lexer tokens into a normalized document AST.
   *
   * @param tokens The ordered tokens produced by a `MarkdownLexer`.
   * @returns The normalized document with separate frontmatter and body ASTs.
   */
  parse(tokens: readonly LexerToken[]): DocumentAst {
    return {
      type: "document",
      frontmatter: tokens
        .filter(isFrontmatterToken)
        .map(normalizeFrontmatter),
      body: {
        type: "root",
        children: tokens.flatMap((token) =>
          isSyntaxToken(token) ? [normalizeBlock(token.node)] : [],
        ),
      },
    };
  }
}
