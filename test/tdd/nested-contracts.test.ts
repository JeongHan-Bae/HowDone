import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JsonRenderer } from "../../src/adapters/output/json-renderer.ts";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import { TypedAstParser } from "../../src/core/ast/parser.ts";
import { calculateProgress } from "../../src/core/progress/analyzer.ts";
import { summarizeProgress } from "../../src/core/progress/metrics.ts";
import { buildProgressRoots } from "../../src/core/progress/tree-builder.ts";
import type { ResolvedDisplayOptions } from "../../src/core/config/types.ts";

interface JsonOutputFixture {
  sourcePath: string;
  options: ResolvedDisplayOptions;
  expected: {
    progress: number;
    percentage: number;
    rootLabel: string;
    branchLabel: string;
    firstLeafLabel: string;
    secondLeafLabel: string;
  };
}

interface NestedFixtures {
  source: string;
  expectedRootsBeforeMetrics: unknown;
  expectedMetrics: unknown;
  jsonOutput: JsonOutputFixture;
}

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/nested-contracts.json", import.meta.url), "utf8"),
) as NestedFixtures;

test("TDD AST-to-tree boundary keeps nested implicit and explicit objects distinct", () => {
  const ast = new TypedAstParser().parse(defaultRemarkLexer.lex(fixture.source));
  const roots = buildProgressRoots(ast);

  assert.deepEqual(roots, fixture.expectedRootsBeforeMetrics);
});

test("TDD tree-to-metrics boundary computes every nested progress field", () => {
  const roots = buildProgressRoots(
    new TypedAstParser().parse(defaultRemarkLexer.lex(fixture.source)),
  );
  const result = summarizeProgress(roots);

  assert.deepEqual(result, fixture.expectedMetrics);
});

test("TDD JSON boundary preserves nested report shape and only truncates output labels", () => {
  const result = calculateProgress(
    new TypedAstParser().parse(defaultRemarkLexer.lex(fixture.source)),
  );
  const original = JSON.stringify(result);
  const json = new JsonRenderer().render(
    { source: { path: fixture.jsonOutput.sourcePath }, progress: result },
    fixture.jsonOutput.options,
  );
  const parsed = JSON.parse(json) as {
    source: { path: string };
    progress: {
      progress: number;
      percentage: number;
      roots: Array<{
        label: string;
        children: Array<{
          label: string;
          children: Array<{ label: string }>;
        }>;
      }>;
    };
  };
  const expected = fixture.jsonOutput.expected;
  const root = parsed.progress.roots[0];
  const branch = root?.children[0];

  assert.equal(parsed.source.path, fixture.jsonOutput.sourcePath);
  assert.equal(parsed.progress.progress, expected.progress);
  assert.equal(parsed.progress.percentage, expected.percentage);
  assert.equal(root?.label, expected.rootLabel);
  assert.equal(branch?.label, expected.branchLabel);
  assert.equal(branch?.children[0]?.label, expected.firstLeafLabel);
  assert.equal(branch?.children[1]?.label, expected.secondLeafLabel);
  assert.equal(JSON.stringify(result), original);
});
