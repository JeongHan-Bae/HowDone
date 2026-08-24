import type { DocumentAst } from "./ast/types.ts";
import type { FrontmatterAst } from "./ast/types.ts";
import type { ResolvedDisplayOptions } from "./config/types.ts";
import type { ProgressReport, ProgressResult } from "./progress/types.ts";
import type { LexerToken } from "./source/types.ts";

export interface MarkdownLexer {
  lex(source: string): LexerToken[];
}

export interface MarkdownAstParser {
  parse(tokens: readonly LexerToken[]): DocumentAst;
}

export interface FrontmatterValueParser {
  parse(frontmatter: FrontmatterAst): unknown;
}

export interface MarkdownFileReader {
  read(filePath: string): Promise<string>;
}

export interface WarningPort {
  warn(message: string): void;
}

export interface GraphemeSegmenter {
  segment(text: string): string[];
}

export interface TerminalOutputPort {
  render(
    mode: "default" | "tree" | "details",
    report: ProgressReport | ProgressResult,
    options: ResolvedDisplayOptions,
  ): string;
}

export interface JsonOutputPort {
  render(report: ProgressReport, options?: ResolvedDisplayOptions): string;
}
