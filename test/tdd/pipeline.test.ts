import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JsonRenderer } from "../../src/adapters/output/json-renderer.ts";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import { TerminalRenderer } from "../../src/adapters/output/terminal-renderer.ts";
import {
  buildProgressRoots,
  calculateNodeProgress,
  calculateProgress,
  runMarkdownPipeline,
  summarizeProgress,
  TokenKind,
} from "howdone";
import { TypedAstParser } from "howdone/std";
import type { CheckboxNode, ProgressReport } from "howdone";

const source = (JSON.parse(
  readFileSync(new URL("./fixtures/markdown-samples.json", import.meta.url), "utf8"),
) as { pipelineSource: string }).pipelineSource;

test("TDD source -> lexer emits frontmatter, syntax, and EOF tokens", () => {
  const tokens = defaultRemarkLexer.lex(source);
  assert.equal(tokens[0]?.kind, TokenKind.frontmatter);
  assert.ok(tokens.some((token) => token.kind === TokenKind.syntaxNode));
  assert.equal(tokens.at(-1)?.kind, TokenKind.eof);
});

test("TDD lexer emits a local list token instead of exposing mdast", () => {
  const token = defaultRemarkLexer
    .lex("- [x] task\n")
    .find((candidate) => candidate.kind === TokenKind.syntaxNode);
  assert.equal(token?.kind, TokenKind.syntaxNode);
  if (token?.kind === TokenKind.syntaxNode && token.node.type === "list") {
    assert.equal(token.node.type, "list");
    assert.equal(token.node.items[0]?.checked, true);
  }
});

test("TDD lexer preserves the original source span", () => {
  const token = defaultRemarkLexer.lex("- [x] task\n")[0];
  assert.deepEqual(token?.start, { offset: 0, line: 1, column: 1 });
  assert.deepEqual(token?.end, { offset: 10, line: 1, column: 11 });
  assert.equal(token?.lexeme, "- [x] task");
});

test("TDD lexer delegates Markdown recognition to GFM task-list state", () => {
  const token = defaultRemarkLexer
    .lex("- [X] uppercase\n")
    .find((candidate) => candidate.kind === TokenKind.syntaxNode);
  assert.equal(
    token?.kind === TokenKind.syntaxNode && token.node.type === "list"
      ? token.node.items[0]?.checked
      : undefined,
    true,
  );
});

test("TDD lexer ignores task-looking code and table text", () => {
  const tokens = defaultRemarkLexer.lex(
    "```md\n- [x] code\n```\n\n| [x] |\n| --- |\n",
  );
  const syntax = tokens.filter((token) => token.kind === TokenKind.syntaxNode);
  assert.ok(syntax.every((token) => token.node.type !== "list"));
});

test("TDD lexer -> AST parser creates a typed root AST", () => {
  const document = new TypedAstParser().parse(defaultRemarkLexer.lex(source));
  assert.equal(document.type, "document");
  assert.equal(document.frontmatter[0]?.type, "frontmatter");
  assert.equal(document.frontmatter[0]?.format, "yaml");
  assert.deepEqual(document.body.children.map((node) => node.type), [
    "heading",
    "list",
  ]);
});

test("TDD AST parser preserves nested list-item boundaries", () => {
  const document = new TypedAstParser().parse(defaultRemarkLexer.lex(source));
  const list = document.body.children.find((node) => node.type === "list");
  assert.equal(list?.type, "list");
  if (list?.type === "list") {
    assert.equal(list.items[0]?.children[1]?.type, "list");
    assert.equal(
      list.items[0]?.children[1]?.type === "list"
        ? list.items[0].children[1].items.length
        : 0,
      2,
    );
  }
});

test("TDD source pipeline calls lexer then parser", () => {
  const calls: string[] = [];
  const lexer = {
    lex(input: string) {
      calls.push(`lex:${input}`);
      return defaultRemarkLexer.lex(input);
    },
  };
  const parser = {
    parse(tokens: Parameters<TypedAstParser["parse"]>[0]) {
      calls.push(`parse:${tokens.length}`);
      return new TypedAstParser().parse(tokens);
    },
  };
  const document = runMarkdownPipeline("- [x] task\n", lexer, parser, "tasks.md");
  assert.equal(document.sourceText, "- [x] task\n");
  assert.deepEqual(calls, ["lex:- [x] task\n", "parse:2"]);
  assert.equal(document.sourcePath, "tasks.md");
});

test("TDD AST -> progress tree adds implicit ancestors and drops plain branches", () => {
  const ast = new TypedAstParser().parse(
    defaultRemarkLexer.lex("- A\n  - B\n    - [x] C\n- dropped\n"),
  ).body;
  const roots = buildProgressRoots(ast);
  assert.deepEqual(roots.map((node) => node.label), ["A"]);
  assert.equal(roots[0]?.implicit, true);
  assert.equal(roots[0]?.children[0]?.implicit, true);
  assert.equal(roots[0]?.children[0]?.children[0]?.checked, true);
});

test("TDD progress tree preserves depth labels", () => {
  const ast = new TypedAstParser().parse(defaultRemarkLexer.lex(source)).body;
  const roots = buildProgressRoots(ast);
  assert.deepEqual(
    [roots[0], roots[0]?.children[0], roots[0]?.children[0]?.children[0]].map(
      (node) => node?.depth,
    ),
    [0, 1, 2],
  );
});

test("TDD metrics calculate leaves before branches", () => {
  const node: CheckboxNode = {
    label: "root",
    checked: true,
    implicit: false,
    children: [
      {
        label: "done",
        checked: true,
        implicit: false,
        children: [],
        progress: 0,
        depth: 1,
      },
      {
        label: "pending",
        checked: false,
        implicit: false,
        children: [],
        progress: 0,
        depth: 1,
      },
    ],
    progress: 0,
    depth: 0,
  };
  assert.equal(calculateNodeProgress(node), 0.5);
  assert.equal(node.progress, 0.5);
});

test("TDD metrics expose the required numeric result fields", () => {
  const ast = new TypedAstParser().parse(defaultRemarkLexer.lex(source)).body;
  const result = calculateProgress(ast);
  assert.deepEqual(
    Object.keys(result).sort(),
    [
      "completedEquivalent",
      "explicitCheckboxCount",
      "implicitNodeCount",
      "nodeCount",
      "percentage",
      "progress",
      "rootCount",
      "roots",
    ],
  );
  assert.equal(result.explicitCheckboxCount, 3);
  assert.equal(result.implicitNodeCount, 2);
  assert.equal(result.nodeCount, 5);
  assert.equal(result.progress, 0.75);
});

test("TDD metrics average equally weighted roots", () => {
  const ast = new TypedAstParser().parse(
    defaultRemarkLexer.lex("- [x] done\n- [ ] pending\n"),
  ).body;
  const result = summarizeProgress(buildProgressRoots(ast));
  assert.equal(result.completedEquivalent, 1);
  assert.equal(result.progress, 0.5);
  assert.equal(result.percentage, 50);
});

test("TDD JSON adapter serializes the progress result without display truncation", () => {
  const ast = new TypedAstParser().parse(
    defaultRemarkLexer.lex("- [x] This label is longer than ten\n"),
  ).body;
  const result = calculateProgress(ast);
  const json = new JsonRenderer().render({
    source: { path: "tasks.md" },
    progress: result,
  }) as { progress: { roots: Array<{ label: string }>; percentage: number } };
  assert.equal(json.progress.percentage, 100);
  assert.equal(json.progress.roots[0]?.label, "This label is longer than ten");
});

test("TDD JSON adapter truncates labels only when display options request it", () => {
  const ast = new TypedAstParser().parse(
    defaultRemarkLexer.lex("- [x] 123456789012345\n"),
  ).body;
  const result = calculateProgress(ast);
  const json = new JsonRenderer().render(
    { source: { path: "tasks.md" }, progress: result },
    {
      maxLabelClusters: 5,
      ellipsis: "...",
      truncate: true,
      progressFormat: "percentage",
      precision: 2,
      showTrailingZeros: false,
    },
  ) as { progress: { roots: Array<{ label: string }> } };
  assert.equal(json.progress.roots[0]?.label, "12345...");
});

test("TDD terminal adapter truncates only terminal labels", () => {
  const ast = new TypedAstParser().parse(
    defaultRemarkLexer.lex("- [x] This label is longer than ten\n"),
  ).body;
  const result = calculateProgress(ast);
  const report: ProgressReport = {
    source: { path: "tasks.md" },
    markdown: result,
    markdownPresent: true,
    frontmatter: [],
    frontmatterPresent: false,
    presentation: "separate",
    progress: result,
  };
  const output = new TerminalRenderer().render(
    "tree",
    report,
    {
      maxLabelClusters: 10,
      ellipsis: "...",
      truncate: true,
      progressFormat: "percentage",
      precision: 2,
      showTrailingZeros: false,
    },
  );
  let plainText = "";
  output.writeTo({ write: (chunk: string) => { plainText += chunk; } });
  assert.match(plainText, /This label\.\.\./u);
});
