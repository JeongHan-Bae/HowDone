import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import {
  calculateProgress,
  TokenKind,
  TypedAstParser,
} from "../../src/core/index.ts";
import type { ProgressResult } from "../../src/core/index.ts";

type ProgressMetrics = Pick<
  ProgressResult,
  | "rootCount"
  | "explicitCheckboxCount"
  | "implicitNodeCount"
  | "nodeCount"
  | "completedEquivalent"
  | "progress"
  | "percentage"
>;

interface LayoutCase {
  id: string;
  source: string;
  expectedTokenKinds?: readonly TokenKind[];
  expectedAstTypes?: readonly string[];
  expectedFormats?: readonly string[];
  expectedValues?: readonly string[];
  expectedRootLabels?: readonly string[];
  expectedBodyMetrics?: ProgressMetrics;
  expectedLexerError?: string;
}

interface LayoutFixtures {
  cases: readonly LayoutCase[];
}

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/frontmatter-layouts.json", import.meta.url), "utf8"),
) as LayoutFixtures;

function metrics(result: ProgressResult): ProgressMetrics {
  return {
    rootCount: result.rootCount,
    explicitCheckboxCount: result.explicitCheckboxCount,
    implicitNodeCount: result.implicitNodeCount,
    nodeCount: result.nodeCount,
    completedEquivalent: result.completedEquivalent,
    progress: result.progress,
    percentage: result.percentage,
  };
}

for (const fixture of fixtures.cases) {
  test(`TDD frontmatter layout ${fixture.id} matches the syntax contract`, () => {
    if (fixture.expectedLexerError !== undefined) {
      assert.throws(
        () => defaultRemarkLexer.lex(fixture.source),
        (error: unknown) =>
          error instanceof Error && error.message.includes(fixture.expectedLexerError!),
      );
      return;
    }

    const tokens = defaultRemarkLexer.lex(fixture.source);
    const document = new TypedAstParser().parse(tokens);
    const result = calculateProgress(document.body);

    assert.deepEqual(tokens.map((token) => token.kind), fixture.expectedTokenKinds);
    assert.deepEqual(
      document.body.children.map((node) => node.type),
      fixture.expectedAstTypes,
    );
    assert.deepEqual(
      document.frontmatter.map((section) => section.format),
      fixture.expectedFormats,
    );
    assert.deepEqual(
      document.frontmatter.map((section) => section.value),
      fixture.expectedValues,
    );
    assert.deepEqual(
      result.roots.map((node) => node.label),
      fixture.expectedRootLabels,
    );
    assert.deepEqual(metrics(result), fixture.expectedBodyMetrics);
  });
}
