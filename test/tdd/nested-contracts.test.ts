import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JsonRenderer } from "../../src/adapters/output/json-renderer.ts";
import { TerminalRenderer } from "../../src/adapters/output/terminal-renderer.ts";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import {
  buildProgressRoots,
  calculateProgress,
  summarizeProgress,
  TypedAstParser,
} from "howdone";
import type { ResolvedDisplayOptions } from "howdone";

interface JsonOutputFixture {
  sourcePath: string;
  options: ResolvedDisplayOptions;
  expectedReport: unknown;
  terminalOutput: {
    tree: string;
    details: string;
  };
}

interface NestedFixtures {
  source: string;
  expectedRootsBeforeMetrics: unknown;
  expectedMetrics: unknown;
  jsonOutput: JsonOutputFixture;
}

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/nested-contracts.json", import.meta.url), "utf8"),
) as NestedFixtures;

test("TDD AST-to-tree boundary keeps nested implicit and explicit objects distinct", () => {
  const ast = new TypedAstParser().parse(defaultRemarkLexer.lex(fixture.source)).body;
  const roots = buildProgressRoots(ast);

  assert.deepEqual(roots, fixture.expectedRootsBeforeMetrics);
});

test("TDD tree-to-metrics boundary computes every nested progress field", () => {
  const roots = buildProgressRoots(
    new TypedAstParser().parse(defaultRemarkLexer.lex(fixture.source)).body,
  );
  const result = summarizeProgress(roots);

  assert.deepEqual(result, fixture.expectedMetrics);
});

test("TDD JSON boundary preserves nested report shape and only truncates output labels", () => {
  const result = calculateProgress(
    new TypedAstParser().parse(defaultRemarkLexer.lex(fixture.source)).body,
  );
  const original = JSON.stringify(result);
  const json = new JsonRenderer().render(
    { source: { path: fixture.jsonOutput.sourcePath }, progress: result },
    fixture.jsonOutput.options,
  );
  const parsed = JSON.parse(json);

  assert.deepEqual(parsed, fixture.jsonOutput.expectedReport);
  assert.equal(JSON.stringify(result), original);
});

test("TDD terminal boundary preserves complete nested tree and details output", () => {
  const result = calculateProgress(
    new TypedAstParser().parse(defaultRemarkLexer.lex(fixture.source)).body,
  );
  const renderer = new TerminalRenderer();

  assert.equal(
    renderer.render("tree", result, fixture.jsonOutput.options),
    fixture.jsonOutput.terminalOutput.tree,
  );
  assert.equal(
    renderer.render("details", result, fixture.jsonOutput.options),
    fixture.jsonOutput.terminalOutput.details,
  );
});
