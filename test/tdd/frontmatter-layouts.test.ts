import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  assertExpectedLexerError,
  parseAndAssertFrontmatterSyntax,
} from "./frontmatter-assertions.ts";
import type { ProgressResult, TokenKind } from "howdone";

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
    if (assertExpectedLexerError(fixture.source, fixture.expectedLexerError)) {
      return;
    }

    const { document, result } = parseAndAssertFrontmatterSyntax(
      fixture.source,
      fixture.expectedTokenKinds,
      fixture.expectedAstTypes,
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
