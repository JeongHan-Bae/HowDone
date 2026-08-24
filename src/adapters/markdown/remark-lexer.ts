import { unified } from "unified";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { toString } from "mdast-util-to-string";
import { TokenKind } from "../../core/index.ts";
import type {
  FrontmatterToken,
  LexerToken,
  MarkdownLexer,
  ScannedBlockNode,
  ScannedListItemNode,
  SourcePosition,
  SyntaxNodeToken,
  TokenSpan,
} from "../../core/index.ts";

interface RemarkPosition {
  start: SourcePosition;
  end: SourcePosition;
}

interface RemarkNode {
  type: string;
  children?: unknown[];
  checked?: boolean | null;
  ordered?: boolean;
  start?: number | null;
  depth?: number;
  lang?: string | null;
  value?: string;
  position?: RemarkPosition;
}

function asRemarkNode(value: unknown): RemarkNode {
  return value as RemarkNode;
}

function nodeChildren(node: RemarkNode): RemarkNode[] {
  return (node.children ?? []).map(asRemarkNode);
}

function sourceSpan(node: RemarkNode, source: string): TokenSpan {
  const fallback: SourcePosition = {
    offset: 0,
    line: 1,
    column: 1,
  };
  const start = node.position?.start ?? fallback;
  const end = node.position?.end ?? start;
  const safeStart = {
    ...start,
    offset: Math.max(0, Math.min(start.offset, source.length)),
  };
  const safeEnd = {
    ...end,
    offset: Math.max(safeStart.offset, Math.min(end.offset, source.length)),
  };
  return { start: safeStart, end: safeEnd };
}

function lexeme(span: TokenSpan, source: string): string {
  return source.slice(span.start.offset, span.end.offset);
}

function inlineText(node: RemarkNode): string {
  return toString(node as Parameters<typeof toString>[0]);
}

function toScannedListItem(node: RemarkNode): ScannedListItemNode {
  const explicit = node.checked === true || node.checked === false;
  return {
    type: "list-item",
    checked: explicit ? node.checked ?? null : null,
    children: nodeChildren(node)
      .map(toScannedBlock)
      .filter((child): child is ScannedBlockNode => child !== undefined),
  };
}

function toScannedBlock(node: RemarkNode): ScannedBlockNode | undefined {
  switch (node.type) {
    case "paragraph":
      return { type: "paragraph", text: inlineText(node) };
    case "heading":
      return {
        type: "heading",
        depth: node.depth ?? 1,
        text: inlineText(node),
      };
    case "list":
      return {
        type: "list",
        ordered: node.ordered ?? false,
        start: node.start ?? null,
        items: nodeChildren(node)
          .filter((child) => child.type === "listItem")
          .map(toScannedListItem),
      };
    case "blockquote":
      return {
        type: "blockquote",
        children: nodeChildren(node)
          .map(toScannedBlock)
          .filter((child): child is ScannedBlockNode => child !== undefined),
      };
    case "code":
      return {
        type: "code-block",
        language: node.lang ?? null,
        value: node.value ?? "",
      };
    case "table":
      return { type: "table", value: inlineText(node) };
    case "html":
      return { type: "html", value: node.value ?? "" };
    case "thematicBreak":
      return { type: "thematic-break" };
    case "yaml":
    case "toml":
      return undefined;
    default:
      return { type: "unsupported", value: node.value ?? inlineText(node) };
  }
}

function eofPosition(source: string): SourcePosition {
  const lines = source.split("\n");
  return {
    offset: source.length,
    line: lines.length,
    column: (lines.at(-1) ?? "").length + 1,
  };
}

export class RemarkLexer implements MarkdownLexer {
  private readonly processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, [
      { type: "yaml", marker: "-", anywhere: true },
      { type: "toml", marker: "+", anywhere: true },
    ]);

  lex(source: string): LexerToken[] {
    const root = asRemarkNode(this.processor.parse(source));
    const tokens: LexerToken[] = [];
    let hasBody = false;

    for (const child of nodeChildren(root)) {
      const span = sourceSpan(child, source);
      const base = {
        ...span,
        lexeme: lexeme(span, source),
      };

      if (child.type === "yaml" || child.type === "toml") {
        if (hasBody) {
          throw new Error(
            "Frontmatter must appear before Markdown body content.",
          );
        }
        const token: FrontmatterToken = {
          ...base,
          kind: TokenKind.frontmatter,
          node: {
            type: "frontmatter",
            format: child.type,
            value: child.value ?? "",
          },
        };
        tokens.push(token);
        continue;
      }

      const scanned = toScannedBlock(child);
      if (scanned === undefined) {
        continue;
      }
      hasBody = true;
      const token: SyntaxNodeToken = {
        ...base,
        kind: TokenKind.syntaxNode,
        node: scanned,
      };
      tokens.push(token);
    }

    const end = eofPosition(source);
    tokens.push({
      kind: TokenKind.eof,
      lexeme: "",
      start: end,
      end,
    });
    return tokens;
  }
}

export const defaultRemarkLexer = new RemarkLexer();
