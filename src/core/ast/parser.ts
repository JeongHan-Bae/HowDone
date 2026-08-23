import type {
  BlockAst,
  BlockquoteAst,
  CodeBlockAst,
  FrontmatterAst,
  HeadingAst,
  HtmlAst,
  ListAst,
  ListItemAst,
  ParagraphAst,
  RootAst,
  TableAst,
  ThematicBreakAst,
  UnsupportedAst,
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
    case "paragraph": {
      const paragraph: ParagraphAst = {
        type: "paragraph",
        text: node.text,
      };
      return paragraph;
    }
    case "heading": {
      const heading: HeadingAst = {
        type: "heading",
        depth: node.depth,
        text: node.text,
      };
      return heading;
    }
    case "list": {
      const list: ListAst = {
        type: "list",
        ordered: node.ordered,
        start: node.start,
        items: node.items.map(normalizeListItem),
      };
      return list;
    }
    case "blockquote": {
      const blockquote: BlockquoteAst = {
        type: "blockquote",
        children: node.children.map(normalizeBlock),
      };
      return blockquote;
    }
    case "code-block": {
      const codeBlock: CodeBlockAst = {
        type: "code-block",
        language: node.language,
        value: node.value,
      };
      return codeBlock;
    }
    case "table": {
      const table: TableAst = { type: "table", value: node.value };
      return table;
    }
    case "html": {
      const html: HtmlAst = { type: "html", value: node.value };
      return html;
    }
    case "thematic-break": {
      const thematicBreak: ThematicBreakAst = { type: "thematic-break" };
      return thematicBreak;
    }
    case "unsupported": {
      const unsupported: UnsupportedAst = {
        type: "unsupported",
        value: node.value,
      };
      return unsupported;
    }
  }
}

function normalizeFrontmatter(token: FrontmatterToken): FrontmatterAst {
  return {
    type: "frontmatter",
    value: token.node.value,
  };
}

function isSyntaxToken(token: LexerToken): token is SyntaxNodeToken {
  return token.kind === ("syntax-node" satisfies TokenKind);
}

function isFrontmatterToken(token: LexerToken): token is FrontmatterToken {
  return token.kind === ("frontmatter" satisfies TokenKind);
}

export class TypedAstParser implements MarkdownAstParser {
  parse(tokens: readonly LexerToken[]): RootAst {
    return {
      type: "root",
      children: tokens.flatMap((token) => {
        if (isSyntaxToken(token)) {
          return [normalizeBlock(token.node)];
        }
        if (isFrontmatterToken(token)) {
          return [normalizeFrontmatter(token)];
        }
        return [];
      }),
    };
  }
}
