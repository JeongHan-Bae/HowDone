import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {JsonRenderer} from "../../src/adapters/output/json-renderer.ts";
import {TerminalRenderer} from "../../src/adapters/output/terminal-renderer.ts";
import {defaultRemarkLexer} from "../../src/adapters/markdown/remark-lexer.ts";
import type {
  ProgressReport,
  ProgressResult,
  ResolvedDisplayOptions,
  TerminalOutput,
} from "howdone";
import {buildProgressRoots, calculateProgress, summarizeProgress,} from "howdone";
import {TypedAstParser} from "howdone/std";

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

function plainText(output: TerminalOutput): string {
  let text = "";
  output.writeTo({ write: (chunk: string) => { text += chunk; } });
  return text;
}

function reportFor(progress: ProgressResult): ProgressReport {
  return {
    source: { path: "tasks.md" },
    markdown: progress,
    markdownPresent: true,
    frontmatter: [],
    frontmatterPresent: false,
    presentation: "separate",
    progress,
  };
}

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
  const parsed = new JsonRenderer().render(
      {source: {path: fixture.jsonOutput.sourcePath}, progress: result},
      fixture.jsonOutput.options,
  );

  assert.deepEqual(parsed, fixture.jsonOutput.expectedReport);
  assert.equal(JSON.stringify(result), original);
});

test("TDD terminal boundary preserves complete nested tree and details output", () => {
  const result = calculateProgress(
    new TypedAstParser().parse(defaultRemarkLexer.lex(fixture.source)).body,
  );
  const renderer = new TerminalRenderer();

  assert.equal(
    plainText(renderer.render("tree", reportFor(result), fixture.jsonOutput.options)),
    fixture.jsonOutput.terminalOutput.tree,
  );
  assert.equal(
    plainText(renderer.render("details", reportFor(result), fixture.jsonOutput.options)),
    fixture.jsonOutput.terminalOutput.details,
  );
});
