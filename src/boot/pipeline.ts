import { TypedAstParser } from "../core/ast/parser.ts";
import { runMarkdownPipeline } from "../core/source/pipeline.ts";
import type { RootAst } from "../core/ast/types.ts";
import { defaultRemarkLexer } from "../adapters/markdown/remark-lexer.ts";

const defaultAstParser = new TypedAstParser();

export function parseMarkdown(source: string): RootAst {
  return runMarkdownPipeline(
    source,
    defaultRemarkLexer,
    defaultAstParser,
  ).ast;
}
