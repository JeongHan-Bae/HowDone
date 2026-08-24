import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { NodeMarkdownFileReader } from "../../src/adapters/filesystem/node-file-reader.ts";
import { defaultTomlValueParser } from "../../src/adapters/frontmatter/toml-value-parser.ts";
import { defaultYamlValueParser } from "../../src/adapters/frontmatter/yaml-value-parser.ts";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import { JsonRenderer } from "../../src/adapters/output/json-renderer.ts";
import { TerminalRenderer } from "../../src/adapters/output/terminal-renderer.ts";
import { packageVersion } from "../../src/adapters/runtime/node-package-version.ts";
import { run } from "../../src/application/analyze.ts";
import type { ParsedArguments } from "../../src/application/cli/args.ts";
import { parseArguments } from "../../src/application/cli/args.ts";
import { TypedAstParser } from "../../src/core/index.ts";

interface PathVariant {
  kind: "relative" | "relative-space" | "absolute" | "absolute-space";
  segments: readonly string[];
  absolute: boolean;
}

interface ArgumentExpectation {
  help: boolean;
  version: boolean;
  path: string;
  mode: ParsedArguments["mode"];
  format: ParsedArguments["format"];
  formatExplicit?: boolean;
  precision: number | null;
  showTrailingZeros: boolean | null;
  maxLabelClusters: number | null;
  noTruncate: boolean;
  mergeFrontmatter?: boolean;
  frontmatterWeight?: number | null;
  frontmatterWeightInput?: string | null;
  silent?: boolean;
  strict?: boolean;
}

interface ArgumentFixture {
  argv: readonly string[];
  expected: ArgumentExpectation;
}

interface InvalidArgumentFixture {
  argv: readonly string[];
  message: string;
}

interface CliPathFixtures {
  markdown: string;
  pathVariants: readonly PathVariant[];
  mixedArguments: ArgumentFixture;
  validArguments: ArgumentFixture;
  boundaryArguments: ArgumentFixture;
  invalidArguments: readonly InvalidArgumentFixture[];
}

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/cli-paths.json", import.meta.url), "utf8"),
) as CliPathFixtures;

interface CapturedOutput {
  io: {
    stdout: { write(chunk: string): void };
    stderr: { write(chunk: string): void };
  };
  stdout(): string;
  stderr(): string;
}

function capture(): CapturedOutput {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write: (chunk: string) => { stdout += chunk; } },
      stderr: { write: (chunk: string) => { stderr += chunk; } },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function nativePathForVariant(
  variant: PathVariant,
  temporaryRoot: string,
): { absolute: string; relative: string } {
  const relative = path.join(...variant.segments);
  const absolute = path.resolve(temporaryRoot, ...variant.segments);
  return { absolute, relative };
}

function nativeRelativeWithDot(nativeRelativePath: string): string {
  return path.format({ dir: ".", base: nativeRelativePath });
}

function dependencies(baseDirectory: string) {
  return {
    lexer: defaultRemarkLexer,
    parser: new TypedAstParser(),
    fileReader: new NodeMarkdownFileReader(baseDirectory),
    terminalRenderer: new TerminalRenderer(),
    jsonRenderer: new JsonRenderer(),
    yamlValueParser: defaultYamlValueParser,
    tomlValueParser: defaultTomlValueParser,
    warning: { warn: () => {} },
    version: packageVersion,
  };
}

function expectedArguments(value: ArgumentExpectation): ParsedArguments {
  return {
    help: value.help,
    version: value.version,
    path: value.path,
    mode: value.mode,
    format: value.format,
    formatExplicit: value.formatExplicit ?? false,
    precision: value.precision ?? undefined,
    showTrailingZeros: value.showTrailingZeros ?? undefined,
    maxLabelClusters: value.maxLabelClusters ?? undefined,
    noTruncate: value.noTruncate,
    mergeFrontmatter: value.mergeFrontmatter ?? false,
    frontmatterWeight: value.frontmatterWeight ?? undefined,
    ...(value.frontmatterWeightInput === undefined
      ? {}
      : { frontmatterWeightInput: value.frontmatterWeightInput ?? undefined }),
    silent: value.silent ?? false,
    strict: value.strict ?? false,
  };
}

test("TDD path variants are generated and round-trip through native node:path", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "howdone-path-contract-"),
  );
  try {
    for (const variant of fixture.pathVariants) {
      const nativePaths = nativePathForVariant(variant, temporaryRoot);
      const nativeAbsolutePath = nativePaths.absolute;
      const nativeRelativePath = nativePaths.relative;

      assert.equal(path.isAbsolute(nativeAbsolutePath), true);
      assert.equal(path.isAbsolute(nativeRelativePath), false);
      assert.equal(
        path.resolve(temporaryRoot, nativeRelativePath),
        nativeAbsolutePath,
      );
      assert.equal(
        path.relative(temporaryRoot, nativeAbsolutePath),
        path.normalize(nativeRelativePath),
      );
      const inputPath = variant.absolute
        ? nativeAbsolutePath
        : nativeRelativePath;
      assert.equal(path.isAbsolute(inputPath), variant.absolute);

      await mkdir(path.dirname(nativeAbsolutePath), { recursive: true });
      await writeFile(nativeAbsolutePath, fixture.markdown, "utf8");

      const reader = new NodeMarkdownFileReader(temporaryRoot);
      assert.equal(await reader.read(inputPath), fixture.markdown);
      assert.equal(await reader.read(nativeRelativePath), fixture.markdown);
      assert.equal(await reader.read(nativeAbsolutePath), fixture.markdown);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("TDD uses node:path formatting for a dot-relative path argument", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "howdone-dot-path-"),
  );
  try {
    const variant = fixture.pathVariants.find(
      (candidate) => candidate.kind === "relative-space",
    );
    assert.ok(variant);
    const nativePaths = nativePathForVariant(variant, temporaryRoot);
    const nativeAbsolutePath = nativePaths.absolute;
    await mkdir(path.dirname(nativeAbsolutePath), { recursive: true });
    await writeFile(nativeAbsolutePath, fixture.markdown, "utf8");

    const nativeRelativePath = path.relative(
      temporaryRoot,
      nativeAbsolutePath,
    );
    const dotRelativePath = nativeRelativeWithDot(nativeRelativePath);

    assert.notEqual(dotRelativePath, nativeRelativePath);
    assert.equal(path.resolve(temporaryRoot, dotRelativePath), nativeAbsolutePath);
    assert.equal(
      await new NodeMarkdownFileReader(temporaryRoot).read(dotRelativePath),
      fixture.markdown,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("TDD parses a complete mixed argument object including end-of-options", () => {
  assert.deepEqual(
    parseArguments(fixture.mixedArguments.argv),
    expectedArguments(fixture.mixedArguments.expected),
  );
});

test("TDD accepts valid option spellings in any non-conflicting order", () => {
  assert.deepEqual(
    parseArguments(fixture.validArguments.argv),
    expectedArguments(fixture.validArguments.expected),
  );
});

test("TDD accepts the documented numeric boundary values", () => {
  assert.deepEqual(
    parseArguments(fixture.boundaryArguments.argv),
    expectedArguments(fixture.boundaryArguments.expected),
  );
});

test("TDD rejects argument boundary values without falling through", () => {
  for (const invalid of fixture.invalidArguments) {
    assert.throws(
      () => parseArguments(invalid.argv),
      new RegExp(invalid.message, "u"),
      invalid.argv.join(" "),
    );
  }
});

test("TDD defers frontmatter weight legality to the merge operation", () => {
  const illegal = parseArguments([
    "--merge-frontmatter",
    "--frontmatter-weight",
    "0",
  ]);
  assert.equal(illegal.frontmatterWeight, undefined);
  assert.equal(illegal.frontmatterWeightInput, "0");

  const validWithoutMerge = parseArguments([
    "--frontmatter-weight",
    "0.5",
  ]);
  assert.equal(validWithoutMerge.frontmatterWeight, 0.5);
  assert.equal(validWithoutMerge.frontmatterWeightInput, "0.5");

  const silent = parseArguments(["--silent", "-s", "tasks.md"]);
  assert.equal(silent.silent, true);
});

test("TDD composes a native path with every display option through the app port", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "howdone-app-path-"),
  );
  try {
    const variant = fixture.pathVariants.find(
      (candidate) => candidate.kind === "relative-space",
    );
    assert.ok(variant);
    const nativePaths = nativePathForVariant(variant, temporaryRoot);
    const nativeAbsolutePath = nativePaths.absolute;
    await mkdir(path.dirname(nativeAbsolutePath), { recursive: true });
    await writeFile(nativeAbsolutePath, fixture.markdown, "utf8");
    const nativeRelativePath = path.relative(temporaryRoot, nativeAbsolutePath);
    const dotRelativePath = nativeRelativeWithDot(nativeRelativePath);
    const output = capture();

    const exitCode = await run(
      [
        "--tree",
        dotRelativePath,
        "--format",
        "decimal",
        "--precision=3",
        "--show-trailing-zeros",
        "--max-label-clusters",
        "5",
      ],
      output.io,
      dependencies(temporaryRoot),
    );

    assert.equal(exitCode, 0);
    assert.equal(output.stderr(), "");
    assert.match(output.stdout(), /Overall completion: 0\.500/u);
    assert.match(output.stdout(), /\[0\.500\] Paren\.\.\./u);
    assert.match(output.stdout(), /\[1\.000\] Child\.\.\./u);
    assert.match(output.stdout(), /\[0\.000\] pendi\.\.\./u);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
