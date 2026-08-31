import assert from "node:assert/strict";
import { test } from "node:test";
import * as application from "howdone/application";
import * as core from "howdone";
import {
  buildProgressReport,
  calculateCombinedProgress,
  TypedAstParser as RootTypedAstParser,
} from "howdone";
import * as standard from "howdone/std";
import { TypedAstParser } from "howdone/std";
import {
  consumerCompositionForCode,
  displayOptionsCases,
} from "../implementations/index.ts";

test("published package exposes the standard Core entry", () => {
  assert.equal(typeof TypedAstParser, "function");
  assert.equal(RootTypedAstParser, TypedAstParser);
  assert.deepEqual(Object.keys(standard), ["TypedAstParser"]);
});

test("published package exposes the fixed Core and application operations", () => {
  for (const operation of [
    core.classifyFrontmatter,
    core.buildProgressRoots,
    core.calculateProgress,
    core.calculateFrontmatterProgress,
    core.calculateCombinedProgress,
    core.calculateNodeProgress,
    core.summarizeProgress,
    core.collectLayerStatistics,
    core.flattenProgressNodes,
    core.resolveDisplayOptions,
    core.runMarkdownPipeline,
    core.buildProgressReport,
  ]) {
    assert.equal(typeof operation, "function");
  }
  assert.equal(typeof application.run, "function");
  assert.deepEqual(core.TokenKind, {
    frontmatter: "frontmatter",
    syntaxNode: "syntax-node",
    eof: "eof",
  });
});

test("published Core builds a complete consumer report without CLI adapters", () => {
  const expected = consumerCompositionForCode("mixed-weighted");
  const report = expected.report;
  const built = buildProgressReport(
    report.source.path,
    report.markdown!,
    report.frontmatter!,
    report.markdownPresent!,
    {
      mergeFrontmatter: report.presentation === "merged",
      frontmatterWeight: report.frontmatterWeight,
    },
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      calculateCombinedProgress(
        report.markdown!,
        report.frontmatter!,
        report.frontmatterWeight,
      ),
    )),
    JSON.parse(JSON.stringify(report.progress)),
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(built.report)),
    JSON.parse(JSON.stringify(report)),
  );
  assert.deepEqual(
    {
      mergeIgnored: built.mergeIgnored,
      weightIgnored: built.weightIgnored,
    },
    { mergeIgnored: false, weightIgnored: false },
  );
});

test("published Core fixture coverage includes valid and invalid display policy branches", () => {
  assert.equal(displayOptionsCases.length, 6);
  assert.equal(displayOptionsCases.filter((fixture) => fixture.error !== undefined).length, 2);
});
