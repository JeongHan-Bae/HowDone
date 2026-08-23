import type { RootAst } from "./ast/types.ts";
import type { ResolvedDisplayOptions } from "./config/types.ts";
import type { ProgressReport, ProgressResult } from "./progress/types.ts";
import type { LexerToken } from "./source/types.ts";

export interface MarkdownLexer {
  lex(source: string): LexerToken[];
}

export interface MarkdownAstParser {
  parse(tokens: readonly LexerToken[]): RootAst;
}

export interface MarkdownFileReader {
  read(filePath: string): Promise<string>;
}

export interface GraphemeSegmenter {
  segment(text: string): string[];
}

export interface TerminalOutputPort {
  render(
    mode: "default" | "tree" | "details",
    result: ProgressResult,
    options: ResolvedDisplayOptions,
  ): string;
}

export interface JsonOutputPort {
  render(report: ProgressReport, options?: ResolvedDisplayOptions): string;
}
