import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { defaultTomlValueParser } from "../../src/adapters/frontmatter/toml-value-parser.ts";
import { defaultYamlValueParser } from "../../src/adapters/frontmatter/yaml-value-parser.ts";
import {
  assertExpectedLexerError,
  parseAndAssertFrontmatterSyntax,
} from "./frontmatter-assertions.ts";
import {
  calculateCombinedProgress,
  calculateFrontmatterProgress,
  classifyFrontmatter,
} from "howdone";
import type {
  FrontmatterAst,
  FrontmatterChecklist,
  FrontmatterValueParser,
  ProgressResult,
  TokenKind,
} from "howdone";

function valueParserFor(section: FrontmatterAst): FrontmatterValueParser {
  return section.format === "yaml"
    ? defaultYamlValueParser
    : defaultTomlValueParser;
}

interface FrontmatterCase {
  id: string;
  source: string;
  expectedTokenKinds: readonly TokenKind[];
  expectedAstTypes: readonly string[];
  expectedFormats: readonly string[];
  expectedChecklists: readonly FrontmatterChecklist[];
  expectedRootLabels?: readonly string[];
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
  expectedFrontmatterMetrics: ReadonlyArray<
    Pick<
      ProgressResult,
      | "rootCount"
      | "explicitCheckboxCount"
      | "implicitNodeCount"
      | "nodeCount"
      | "completedEquivalent"
      | "progress"
      | "percentage"
    >
  >;
  expectedCombinedMetrics?: ProgressMetrics;
  expectedWeightedCombinedMetrics?: ProgressMetrics;
  expectedLexerError?: string;
  expectedError?: string;
}

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

interface FrontmatterFixtures {
  cases: readonly FrontmatterCase[];
}

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/frontmatter-contracts.json", import.meta.url), "utf8"),
) as FrontmatterFixtures;

for (const fixture of fixtures.cases) {
  test(`TDD frontmatter contract ${fixture.id} keeps syntax channels independent`, () => {
    if (assertExpectedLexerError(fixture.source, fixture.expectedLexerError)) {
      return;
    }

    const { document, result } = parseAndAssertFrontmatterSyntax(
      fixture.source,
      fixture.expectedTokenKinds,
      fixture.expectedAstTypes,
      fixture.expectedFormats,
    );

    if (fixture.expectedError !== undefined) {
      assert.equal(document.frontmatter.length, 1);
      const section = document.frontmatter[0];
      assert.ok(section);
      assert.throws(
        () => valueParserFor(section).parse(section),
        (error: unknown) =>
          error instanceof Error && error.message.includes(fixture.expectedError!),
      );
      return;
    }

    const frontmatterResults = document.frontmatter.map((section) => {
      const semantic = classifyFrontmatter(valueParserFor(section).parse(section));
      return {
        ...calculateFrontmatterProgress(section.format, semantic),
        checklists: semantic.checklists,
      };
    });

    assert.deepEqual(
      frontmatterResults.flatMap((section) => section.checklists),
      fixture.expectedChecklists,
    );
    assert.deepEqual(
      result.roots.map((node) => node.label),
      fixture.expectedRootLabels ?? [],
    );
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
    assert.deepEqual(
      frontmatterResults.map((section) => ({
        rootCount: section.progress.rootCount,
        explicitCheckboxCount: section.progress.explicitCheckboxCount,
        implicitNodeCount: section.progress.implicitNodeCount,
        nodeCount: section.progress.nodeCount,
        completedEquivalent: section.progress.completedEquivalent,
        progress: section.progress.progress,
        percentage: section.progress.percentage,
      })),
      fixture.expectedFrontmatterMetrics,
    );

    if (
      fixture.expectedCombinedMetrics !== undefined ||
      fixture.expectedWeightedCombinedMetrics !== undefined
    ) {
      const combined = calculateCombinedProgress(result, frontmatterResults);
      const combinedMetrics = {
        rootCount: combined.rootCount,
        explicitCheckboxCount: combined.explicitCheckboxCount,
        implicitNodeCount: combined.implicitNodeCount,
        nodeCount: combined.nodeCount,
        completedEquivalent: combined.completedEquivalent,
        progress: combined.progress,
        percentage: combined.percentage,
      };
      assert.deepEqual(combinedMetrics, fixture.expectedCombinedMetrics);

      const weighted = calculateCombinedProgress(
        result,
        frontmatterResults,
        0.5,
      );
      const weightedMetrics = {
        rootCount: weighted.rootCount,
        explicitCheckboxCount: weighted.explicitCheckboxCount,
        implicitNodeCount: weighted.implicitNodeCount,
        nodeCount: weighted.nodeCount,
        completedEquivalent: weighted.completedEquivalent,
        progress: weighted.progress,
        percentage: weighted.percentage,
      };
      assert.deepEqual(
        weightedMetrics,
        fixture.expectedWeightedCombinedMetrics,
      );
    }
  });
}
