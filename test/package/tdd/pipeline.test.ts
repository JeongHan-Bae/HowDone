import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateCombinedProgress,
  calculateFrontmatterProgress,
  calculateProgress,
  classifyFrontmatter,
  runMarkdownPipeline,
} from "howdone";
import {
  ConsumerFileReader,
  ConsumerTomlValueParser,
  ConsumerYamlValueParser,
  consumerCases,
  consumerLexer,
  consumerParser,
  lexerCodeForReaderCode,
  lexerCodeForTokens,
  parserCodeForLexerCode,
  parserOutputForCode,
  readerOutputForCode,
} from "../implementations/index.ts";

for (const fixture of consumerCases) {
  test(`consumer pipeline maps every ${fixture.code} fixture stage`, async () => {
    const reader = new ConsumerFileReader(fixture.code);
    const source = await reader.read(fixture.path);
    assert.equal(source, readerOutputForCode(fixture.code).source);

    const tokens = consumerLexer.lex(source);
    const lexerCode = lexerCodeForReaderCode(fixture.code);
    assert.equal(lexerCodeForTokens(tokens), lexerCode);

    const parserCode = parserCodeForLexerCode(lexerCode);
    const parserFixture = parserOutputForCode(parserCode);
    const document = runMarkdownPipeline(
      source,
      consumerLexer,
      consumerParser,
      fixture.path,
    );
    assert.deepEqual(document.ast.frontmatter, parserFixture.frontmatter);
    assert.deepEqual(document.ast.body, parserFixture.body);

    const markdown = calculateProgress(document.ast.body);
    const frontmatter = document.ast.frontmatter.map((section) => {
      const parser = section.format === "yaml"
        ? new ConsumerYamlValueParser()
        : new ConsumerTomlValueParser();
      return calculateFrontmatterProgress(
        section.format,
        classifyFrontmatter(parser.parse(section)),
      );
    });
    const combined = calculateCombinedProgress(markdown, frontmatter);

    assert.equal(
      document.ast.frontmatter.length,
      fixture.expected.frontmatterSections,
    );
    assert.equal(markdown.rootCount, fixture.expected.bodyRootCount);
    assert.equal(combined.percentage, fixture.expected.percentage);
  });
}
