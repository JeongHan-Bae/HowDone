import type { MarkdownAstParser, MarkdownLexer } from "../ports.ts";
import type { SourceDocument } from "./types.ts";

export function runMarkdownPipeline(
  source: string,
  lexer: MarkdownLexer,
  parser: MarkdownAstParser,
  sourcePath?: string,
): SourceDocument {
  const tokens = lexer.lex(source);
  const ast = parser.parse(tokens);
  return {
    sourceText: source,
    sourcePath,
    tokens,
    ast,
  };
}
