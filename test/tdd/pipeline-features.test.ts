import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import {
  buildProgressRoots,
  calculateProgress,
  TokenKind,
} from "howdone";
import { TypedAstParser } from "howdone/std";

interface PositiveFeature {
  id: string;
  source: string;
  coverage: readonly string[];
  expectedTokenKinds: readonly TokenKind[];
  expectedTokenLexemes?: readonly string[];
  expectedTokenSpans?: readonly TokenSpanFixture[];
  expectedSyntaxNodeTypes: readonly string[];
  expectedAstTypes: readonly string[];
  expectedAst?: unknown;
  expectedRoots: unknown;
  expectedMetrics: {
    rootCount: number;
    explicitCheckboxCount: number;
    implicitNodeCount: number;
    nodeCount: number;
    completedEquivalent: number;
    progress: number;
    percentage: number;
  };
}

interface NegativeFeature {
  id: string;
  source: string;
  coverage: readonly string[];
  expectedSyntaxNodeTypes: readonly string[];
  expectedAstTypes: readonly string[];
  expectedTokenKinds?: readonly TokenKind[];
  expectedTokenLexemes?: readonly string[];
  expectedResult: unknown;
}

interface TokenPositionFixture {
  offset: number;
  line: number;
  column: number;
}

interface TokenSpanFixture {
  start: TokenPositionFixture;
  end: TokenPositionFixture;
}

interface PipelineFixtures {
  positive: readonly PositiveFeature[];
  negative: readonly NegativeFeature[];
  requiredCoverage: readonly string[];
}

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/pipeline-features.json", import.meta.url), "utf8"),
) as PipelineFixtures;

test("TDD pipeline fixtures cover every declared source boundary", () => {
  const covered = new Set(
    [...fixtures.positive, ...fixtures.negative].flatMap(
      (feature) => feature.coverage,
    ),
  );
  for (const requirement of fixtures.requiredCoverage) {
    assert.equal(covered.has(requirement), true, requirement);
  }
});

for (const feature of fixtures.positive) {
  test(`TDD feature ${feature.id} validates every source boundary`, () => {
    const tokens = defaultRemarkLexer.lex(feature.source);
    const document = new TypedAstParser().parse(tokens);
    const ast = document.body;
    const roots = buildProgressRoots(ast);
    const result = calculateProgress(ast);

    assert.deepEqual(tokens.map((token) => token.kind), feature.expectedTokenKinds);
    if (feature.expectedTokenLexemes !== undefined) {
      assert.deepEqual(
        tokens.map((token) => token.lexeme),
        feature.expectedTokenLexemes,
      );
    }
    if (feature.expectedTokenSpans !== undefined) {
      assert.deepEqual(
        tokens.map(({ start, end }) => ({ start, end })),
        feature.expectedTokenSpans,
      );
    }
    assert.deepEqual(
      tokens
        .filter((token) => token.kind === TokenKind.syntaxNode)
        .map((token) => token.node.type),
      feature.expectedSyntaxNodeTypes,
    );
    assert.deepEqual(
      ast.children.map((node) => node.type),
      feature.expectedAstTypes,
    );
    if (feature.expectedAst !== undefined) {
      const expected = feature.expectedAst as { type?: string };
      assert.deepEqual(
        expected.type === "document" ? document : ast,
        feature.expectedAst,
      );
    }
    assert.deepEqual(roots, feature.expectedRoots);
    assert.deepEqual(
      {
        rootCount: result.rootCount,
        explicitCheckboxCount: result.explicitCheckboxCount,
        implicitNodeCount: result.implicitNodeCount,
        nodeCount: result.nodeCount,
        completedEquivalent: result.completedEquivalent,
        progress: result.progress,
        percentage: result.percentage,
      },
      feature.expectedMetrics,
    );
  });
}

for (const feature of fixtures.negative) {
  test(`TDD negative feature ${feature.id} stays outside the progress tree`, () => {
    const tokens = defaultRemarkLexer.lex(feature.source);
    const document = new TypedAstParser().parse(tokens);
    const ast = document.body;
    const result = calculateProgress(ast);

    if (feature.expectedTokenKinds !== undefined) {
      assert.deepEqual(tokens.map((token) => token.kind), feature.expectedTokenKinds);
    }
    if (feature.expectedTokenLexemes !== undefined) {
      assert.deepEqual(
        tokens.map((token) => token.lexeme),
        feature.expectedTokenLexemes,
      );
    }
    assert.deepEqual(
      tokens
        .filter((token) => token.kind === TokenKind.syntaxNode)
        .map((token) => token.node.type),
      feature.expectedSyntaxNodeTypes,
    );
    assert.deepEqual(
      ast.children.map((node) => node.type),
      feature.expectedAstTypes,
    );
    assert.deepEqual(buildProgressRoots(ast), []);
    assert.deepEqual(result, feature.expectedResult);
  });
}
