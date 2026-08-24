import { runMarkdownPipeline, TypedAstParser } from "../core/index.ts";
import type { DocumentAst } from "../core/index.ts";
import { defaultRemarkLexer } from "../adapters/markdown/remark-lexer.ts";

const defaultAstParser = new TypedAstParser();

export function parseMarkdown(source: string): DocumentAst {
  return runMarkdownPipeline(
    source,
    defaultRemarkLexer,
    defaultAstParser,
  ).ast;
}
