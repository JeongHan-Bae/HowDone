import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { defaultTomlValueParser } from "../../src/adapters/frontmatter/toml-value-parser.ts";
import { defaultYamlValueParser } from "../../src/adapters/frontmatter/yaml-value-parser.ts";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import { JsonRenderer } from "../../src/adapters/output/json-renderer.ts";
import { TerminalRenderer } from "../../src/adapters/output/terminal-renderer.ts";
import {
  calculateCombinedProgress,
  calculateFrontmatterProgress,
  calculateProgress,
  classifyFrontmatter,
  resolveDisplayOptions,
} from "howdone";
import { TypedAstParser } from "howdone/std";
import type {
  FrontmatterAst,
  FrontmatterValueParser,
  ProgressReport,
  TerminalOutput,
} from "howdone";

function valueParserFor(section: FrontmatterAst): FrontmatterValueParser {
  return section.format === "yaml"
    ? defaultYamlValueParser
    : defaultTomlValueParser;
}

interface OutputCase {
  id: string;
  source: string;
  expectedKeys: readonly string[];
  expectedProgress: number;
  expectedPercentage: number;
  expectedMarkdownProgress?: number;
  expectedFrontmatterProgress?: number;
  expectedFrontmatterFormats?: readonly string[];
  expectedTreeSections: readonly string[];
}

interface OutputFixtures {
  cases: readonly OutputCase[];
}

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/output-contracts.json", import.meta.url), "utf8"),
) as OutputFixtures;

const options = resolveDisplayOptions(
  undefined,
  false,
  "percentage",
  2,
  false,
);

function reportFor(source: string): ProgressReport {
  const document = new TypedAstParser().parse(defaultRemarkLexer.lex(source));
  const markdown = calculateProgress(document.body);
  const frontmatter = document.frontmatter.map((section) =>
    calculateFrontmatterProgress(
      section.format,
      classifyFrontmatter(valueParserFor(section).parse(section)),
    )
  );
  const markdownPresent = document.body.children.length > 0;
  const frontmatterPresent = document.frontmatter.length > 0;
  return {
    source: { path: "tasks.md" },
    markdown,
    markdownPresent,
    frontmatter,
    frontmatterPresent,
    presentation: "separate",
    progress: frontmatterPresent
      ? calculateCombinedProgress(markdown, frontmatter)
      : markdown,
  };
}

function plainText(output: TerminalOutput): string {
  let text = "";
  output.writeTo({ write: (chunk: string) => { text += chunk; } });
  return text;
}

const progressKeys = [
  "rootCount",
  "explicitCheckboxCount",
  "implicitNodeCount",
  "nodeCount",
  "completedEquivalent",
  "progress",
  "percentage",
  "roots",
];

const nodeKeys = [
  "label",
  "checked",
  "implicit",
  "children",
  "progress",
  "depth",
];

function recordOf(value: unknown, description: string): Record<string, unknown> {
  assert.equal(typeof value, "object", `${description} must be an object`);
  assert.notEqual(value, null, `${description} must not be null`);
  assert.equal(Array.isArray(value), false, `${description} must not be an array`);
  return value as Record<string, unknown>;
}

function assertNodeShape(value: unknown, description: string): void {
  const node = recordOf(value, description);
  assert.deepEqual(Object.keys(node).sort(), [...nodeKeys].sort(), description);
  assert.equal(typeof node.label, "string");
  assert.ok(node.checked === null || typeof node.checked === "boolean");
  assert.equal(typeof node.implicit, "boolean");
  assert.equal(typeof node.progress, "number");
  assert.equal(typeof node.depth, "number");
  assert.ok(Array.isArray(node.children));
  for (const [index, child] of node.children.entries()) {
    assertNodeShape(child, `${description}.children[${index}]`);
  }
}

function assertProgressShape(value: unknown, description: string): void {
  const progress = recordOf(value, description);
  assert.deepEqual(Object.keys(progress).sort(), [...progressKeys].sort(), description);
  for (const key of progressKeys.slice(0, -1)) {
    assert.equal(typeof progress[key], "number", `${description}.${key}`);
  }
  assert.ok(Array.isArray(progress.roots));
  for (const [index, root] of progress.roots.entries()) {
    assertNodeShape(root, `${description}.roots[${index}]`);
  }
}

for (const fixture of fixtures.cases) {
  test(`TDD output contract ${fixture.id} keeps its presentation shape`, () => {
    const report = reportFor(fixture.source);
    const parsed = new JsonRenderer().render(report) as {
      source?: unknown;
      progress?: { progress?: number; percentage?: number };
      presentation?: string;
      markdown?: { progress?: number };
      frontmatter?: Array<{
        format?: string;
        checklists?: unknown[];
        progress?: { progress?: number };
      }>;
    };

    assert.equal(typeof parsed, "object");
    assert.notEqual(parsed, null);
    assert.equal(Array.isArray(parsed), false);
    assert.deepEqual(Object.keys(parsed), fixture.expectedKeys);
    assert.equal(parsed.progress?.progress, fixture.expectedProgress);
    assert.equal(parsed.progress?.percentage, fixture.expectedPercentage);
    assertProgressShape(parsed.progress, `${fixture.id}.progress`);
    assert.equal(parsed.presentation, fixture.expectedTreeSections.length > 0
      ? "separate"
      : undefined);
    if (fixture.expectedMarkdownProgress !== undefined) {
      assert.equal(parsed.markdown?.progress, fixture.expectedMarkdownProgress);
    } else {
      assert.equal(parsed.markdown, undefined);
    }
    assert.deepEqual(
      parsed.frontmatter?.map((section) => section.format),
      fixture.expectedFrontmatterFormats,
    );
    if (fixture.expectedFrontmatterProgress !== undefined) {
      assert.equal(
        parsed.frontmatter?.[0]?.progress?.progress,
        fixture.expectedFrontmatterProgress,
      );
    }

    if (parsed.markdown !== undefined) {
      assertProgressShape(parsed.markdown, `${fixture.id}.markdown`);
    }
    for (const [index, section] of (parsed.frontmatter ?? []).entries()) {
      assert.ok(Array.isArray(section.checklists));
      assertProgressShape(section.progress, `${fixture.id}.frontmatter[${index}].progress`);
    }

    const tree = plainText(new TerminalRenderer().render("tree", report, options));
    for (const section of fixture.expectedTreeSections) {
      assert.ok(tree.includes(section), `${fixture.id} is missing ${section}`);
    }
  });
}
