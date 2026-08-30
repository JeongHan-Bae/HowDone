import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import { calculateProgress } from "howdone";
import { TypedAstParser } from "howdone/std";
import type { CheckboxNode, ProgressResult } from "howdone";

interface MarkdownTreeCase {
  id: string;
  source: string;
  expectedRoots: readonly CheckboxNode[];
  expectedMetrics: Pick<
    ProgressResult,
    | "rootCount"
    | "explicitCheckboxCount"
    | "implicitNodeCount"
    | "nodeCount"
    | "completedEquivalent"
    | "progress"
    | "percentage"
  >;
}

interface MarkdownTreeFixtures {
  cases: readonly MarkdownTreeCase[];
}

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/markdown-tree-contracts.json", import.meta.url), "utf8"),
) as MarkdownTreeFixtures;

for (const fixture of fixtures.cases) {
  test(`TDD Markdown tree contract ${fixture.id} keeps hierarchy semantics`, () => {
    const document = new TypedAstParser().parse(defaultRemarkLexer.lex(fixture.source));
    const result = calculateProgress(document.body);

    assert.deepEqual(result.roots, fixture.expectedRoots);
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
      fixture.expectedMetrics,
    );
  });
}
