import { runMarkdownPipeline } from "howdone";
import { TypedAstParser } from "howdone/std";
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
