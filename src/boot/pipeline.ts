import { runMarkdownPipeline, TypedAstParser } from "howdone";
import type { DocumentAst } from "howdone";
import { defaultRemarkLexer } from "../adapters/markdown/remark-lexer.ts";

const defaultAstParser = new TypedAstParser();

export function parseMarkdown(source: string): DocumentAst {
  return runMarkdownPipeline(
    source,
    defaultRemarkLexer,
    defaultAstParser,
  ).ast;
}
