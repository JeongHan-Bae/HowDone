import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildProgressRoots,
  calculateCombinedProgress,
  calculateFrontmatterProgress,
  calculateNodeProgress,
  calculateProgress,
  classifyFrontmatter,
  collectLayerStatistics,
  flattenProgressNodes,
  resolveDisplayOptions,
  runMarkdownPipeline,
  summarizeProgress,
} from "howdone";
import { TypedAstParser } from "howdone/std";
import {
  ConsumerFileReader,
  ConsumerTomlValueParser,
  ConsumerYamlValueParser,
  consumerCases,
  consumerLexer,
  consumerParser,
  coreProgressCases,
  displayOptionsCases,
  frontmatterOutputForSection,
  lexerOutputForCode,
  lexerCodeForReaderCode,
  lexerCodeForTokens,
  parserCodeForLexerCode,
  parserOutputForCode,
  readerOutputForCode,
} from "../implementations/index.ts";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

for (const fixture of coreProgressCases) {
  test(`published Core preserves the complete fixed progress contract ${fixture.code}`, () => {
    const roots = buildProgressRoots(fixture.ast);
    const result = calculateProgress(fixture.ast);

    assert.deepEqual(roots, fixture.expectedRoots);
    assert.deepEqual(result, fixture.expectedResult);
    assert.deepEqual(
      flattenProgressNodes(result).map((node) => node.label),
      fixture.expectedFlatLabels,
    );
    assert.deepEqual(collectLayerStatistics(result), fixture.expectedLayers);
  });

  test(`published Core exposes direct metric operations for ${fixture.code}`, () => {
    const roots = clone(fixture.expectedResult.roots);
    const rootProgress = roots.map((root) => calculateNodeProgress(root));

    assert.deepEqual(
      rootProgress,
      fixture.expectedResult.roots.map((root) => root.progress),
    );
    assert.deepEqual(summarizeProgress(roots), fixture.expectedResult);
    assert.deepEqual(
      flattenProgressNodes(roots).map((node) => node.label),
      fixture.expectedFlatLabels,
    );
  });
}

for (const fixture of displayOptionsCases) {
  test(`published Core resolves fixed display options ${fixture.code}`, () => {
    const input = fixture.input;
    if (fixture.error !== undefined) {
      assert.throws(
        () => resolveDisplayOptions(
          input.maxLabelClusters,
          input.noTruncate,
          input.progressFormat,
          input.precision,
          input.showTrailingZeros,
        ),
        (error: unknown) =>
          error instanceof Error && error.message.includes(fixture.error!),
      );
      return;
    }

    assert.deepEqual(
      resolveDisplayOptions(
        input.maxLabelClusters,
        input.noTruncate,
        input.progressFormat,
        input.precision,
        input.showTrailingZeros,
      ),
      fixture.expected,
    );
  });
}

for (const fixture of consumerCases) {
  test(`consumer pipeline maps every ${fixture.code} fixture stage`, async () => {
    const reader = new ConsumerFileReader(fixture.code);
    const source = await reader.read(fixture.path);
    assert.equal(source, readerOutputForCode(fixture.code).source);

    const tokens = consumerLexer.lex(source);
    const lexerCode = lexerCodeForReaderCode(fixture.code);
    assert.equal(lexerCodeForTokens(tokens), lexerCode);
    assert.deepEqual(
      {
        sections: tokens.flatMap((token) =>
          token.kind === "frontmatter"
            ? [{ format: token.node.format, value: token.node.value }]
            : []
        ),
        body: tokens.flatMap((token) =>
          token.kind === "syntax-node" ? [token.node] : []
        ),
      },
      lexerOutputForCode(lexerCode),
    );

    const parserCode = parserCodeForLexerCode(lexerCode);
    const parserFixture = parserOutputForCode(parserCode);
    const document = runMarkdownPipeline(
      source,
      consumerLexer,
      consumerParser,
      fixture.path,
    );
    assert.equal(document.sourceText, source);
    assert.equal(document.sourcePath, fixture.path);
    assert.deepEqual(document.tokens, tokens);
    assert.deepEqual(document.ast.frontmatter, parserFixture.frontmatter);
    assert.deepEqual(document.ast.body, parserFixture.body);

    const markdown = calculateProgress(document.ast.body);
    const frontmatter = document.ast.frontmatter.map((section) => {
      const parser = section.format === "yaml"
        ? new ConsumerYamlValueParser()
        : new ConsumerTomlValueParser();
      const semantic = classifyFrontmatter(parser.parse(section));
      const result = calculateFrontmatterProgress(
        section.format,
        semantic,
      );
      assert.deepEqual(
        {
          format: section.format,
          checklists: semantic.checklists,
          progress: result.progress,
        },
        frontmatterOutputForSection(section.format, section.value),
      );
      return result;
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

for (const fixture of consumerCases) {
  test(`published standard parser handles ${fixture.code} tokens`, async () => {
    const reader = new ConsumerFileReader(fixture.code);
    const source = await reader.read(fixture.path);
    const lexerCode = lexerCodeForReaderCode(fixture.code);
    const parserCode = parserCodeForLexerCode(lexerCode);
    const parserFixture = parserOutputForCode(parserCode);
    const document = runMarkdownPipeline(
      source,
      consumerLexer,
      new TypedAstParser(),
      fixture.path,
    );

    assert.deepEqual(document.ast.frontmatter, parserFixture.frontmatter);
    assert.deepEqual(document.ast.body, parserFixture.body);
  });
}
