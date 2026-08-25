import assert from "node:assert/strict";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import {
  calculateProgress,
  TypedAstParser,
} from "howdone";
import type {
  DocumentAst,
  ProgressResult,
  TokenKind,
} from "howdone";

export interface ParsedFrontmatterSource {
  document: DocumentAst;
  result: ProgressResult;
}

export function assertLexerError(
  source: string,
  expectedMessage: string,
): void {
  assert.throws(
    () => defaultRemarkLexer.lex(source),
    (error: unknown) =>
      error instanceof Error && error.message.includes(expectedMessage),
  );
}

export function assertExpectedLexerError(
  source: string,
  expectedMessage: string | undefined,
): boolean {
  if (expectedMessage === undefined) return false;
  assertLexerError(source, expectedMessage);
  return true;
}

export function parseAndAssertFrontmatterSyntax(
  source: string,
  expectedTokenKinds: readonly TokenKind[] | undefined,
  expectedAstTypes: readonly string[] | undefined,
  expectedFormats: readonly string[] | undefined,
): ParsedFrontmatterSource {
  const tokens = defaultRemarkLexer.lex(source);
  const document = new TypedAstParser().parse(tokens);
  const result = calculateProgress(document.body);

  assert.deepEqual(tokens.map((token) => token.kind), expectedTokenKinds);
  assert.deepEqual(
    document.body.children.map((node) => node.type),
    expectedAstTypes,
  );
  assert.deepEqual(
    document.frontmatter.map((section) => section.format),
    expectedFormats,
  );

  return { document, result };
}
