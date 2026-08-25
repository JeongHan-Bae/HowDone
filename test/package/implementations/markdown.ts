import type {
  DocumentAst,
  FrontmatterAst,
  LexerToken,
  MarkdownAstParser,
  MarkdownLexer,
} from "howdone";
import {
  lexerCodeForReaderCode,
  lexerOutputForCode,
  parserCodeForLexerCode,
  parserOutputForCode,
  readerCodeForSource,
} from "./data.ts";

const tokenFixtureCodes = new WeakMap<readonly LexerToken[], string>();

function position(offset: number) {
  return { offset, line: 1, column: offset + 1 };
}

function delimiterFor(format: "yaml" | "toml"): string {
  return format === "yaml" ? "---" : "+++";
}

export const consumerLexer: MarkdownLexer = {
  lex(source: string): LexerToken[] {
    const readerCode = readerCodeForSource(source);
    const lexerCode = lexerCodeForReaderCode(readerCode);
    const output = lexerOutputForCode(lexerCode);
    const tokens: LexerToken[] = [];
    let cursor = 0;

    for (const section of output.sections) {
      const delimiter = delimiterFor(section.format);
      const openingStart = source.indexOf(delimiter, cursor);
      const openingEnd = source.indexOf("\n", openingStart) + 1;
      const closingStart = source.indexOf(`\n${delimiter}`, openingEnd);
      const closingEnd = source.indexOf("\n", closingStart + 1) + 1;
      if (
        openingStart < 0 ||
        openingEnd <= 0 ||
        closingStart < 0 ||
        closingEnd <= 0
      ) {
        throw new Error("consumer lexer could not locate a frontmatter section");
      }
      tokens.push({
        kind: "frontmatter",
        lexeme: source.slice(openingStart, closingEnd),
        start: position(openingStart),
        end: position(closingEnd),
        node: {
          type: "frontmatter",
          format: section.format,
          value: section.value,
        },
      });
      cursor = closingEnd;
    }

    if (output.body.length > 1) {
      throw new Error("consumer lexer fixture requires one body token");
    }
    const bodyNode = output.body[0];
    if (bodyNode !== undefined) {
      tokens.push({
        kind: "syntax-node",
        lexeme: source.slice(cursor),
        start: position(cursor),
        end: position(source.length),
        node: bodyNode,
      });
    }
    tokens.push({
      kind: "eof",
      lexeme: "",
      start: position(source.length),
      end: position(source.length),
    });
    tokenFixtureCodes.set(tokens, lexerCode);
    return tokens;
  },
};

export const consumerParser: MarkdownAstParser = {
  parse(tokens: readonly LexerToken[]): DocumentAst {
    const lexerCode = tokenFixtureCodes.get(tokens);
    if (lexerCode === undefined) {
      throw new Error("consumer parser requires tokens from the consumer lexer");
    }
    const parserCode = parserCodeForLexerCode(lexerCode);
    const output = parserOutputForCode(parserCode);
    const frontmatter: FrontmatterAst[] = output.frontmatter.map((section) => ({
      type: "frontmatter",
      format: section.format,
      value: section.value,
    }));
    return {
      type: "document",
      frontmatter,
      body: output.body,
    };
  },
};

export function lexerCodeForTokens(tokens: readonly LexerToken[]): string {
  const code = tokenFixtureCodes.get(tokens);
  if (code === undefined) throw new Error("consumer token fixture code is missing");
  return code;
}
