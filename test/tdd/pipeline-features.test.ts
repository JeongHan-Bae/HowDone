import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import { TypedAstParser } from "../../src/core/ast/parser.ts";
import { calculateProgress } from "../../src/core/progress/analyzer.ts";
import { buildProgressRoots } from "../../src/core/progress/tree-builder.ts";
import { TokenKind } from "../../src/core/source/types.ts";

interface PositiveFeature {
  id: string;
  source: string;
  expectedTokenKinds: readonly TokenKind[];
  expectedSyntaxNodeTypes: readonly string[];
  expectedAstTypes: readonly string[];
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
  expectedSyntaxNodeTypes: readonly string[];
  expectedAstTypes: readonly string[];
  expectedResult: unknown;
}

interface PipelineFixtures {
  positive: readonly PositiveFeature[];
  negative: readonly NegativeFeature[];
}

const fixtures = JSON.parse(
  readFileSync(new URL("../fixtures/pipeline-features.json", import.meta.url), "utf8"),
) as PipelineFixtures;

for (const feature of fixtures.positive) {
  test(`TDD feature ${feature.id} validates every source boundary`, () => {
    const tokens = defaultRemarkLexer.lex(feature.source);
    const ast = new TypedAstParser().parse(tokens);
    const roots = buildProgressRoots(ast);
    const result = calculateProgress(ast);

    assert.deepEqual(tokens.map((token) => token.kind), feature.expectedTokenKinds);
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
    const ast = new TypedAstParser().parse(tokens);
    const result = calculateProgress(ast);

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
