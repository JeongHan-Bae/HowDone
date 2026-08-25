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
  TypedAstParser,
} from "howdone";
import type {
  FrontmatterAst,
  FrontmatterValueParser,
  ProgressReport,
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

for (const fixture of fixtures.cases) {
  test(`TDD output contract ${fixture.id} keeps its presentation shape`, () => {
    const report = reportFor(fixture.source);
    const parsed = JSON.parse(new JsonRenderer().render(report)) as {
      source?: unknown;
      progress?: { progress?: number; percentage?: number };
      presentation?: string;
      markdown?: { progress?: number };
      frontmatter?: Array<{
        format?: string;
        progress?: { progress?: number };
      }>;
    };

    assert.equal(typeof parsed, "object");
    assert.notEqual(parsed, null);
    assert.equal(Array.isArray(parsed), false);
    assert.deepEqual(Object.keys(parsed), fixture.expectedKeys);
    assert.equal(parsed.progress?.progress, fixture.expectedProgress);
    assert.equal(parsed.progress?.percentage, fixture.expectedPercentage);
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

    const tree = new TerminalRenderer().render("tree", report, options);
    for (const section of fixture.expectedTreeSections) {
      assert.ok(tree.includes(section), `${fixture.id} is missing ${section}`);
    }
  });
}
