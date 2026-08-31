import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

interface PackageMetadata {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  bin?: Record<string, string>;
}

function readPackage(url: URL): PackageMetadata {
  return JSON.parse(readFileSync(url, "utf8")) as PackageMetadata;
}

const expectedCore = readPackage(
  new URL("../../../packages/core/package.json", import.meta.url),
);
const expectedCli = readPackage(
  new URL("../../../packages/cli/package.json", import.meta.url),
);
const core = readPackage(
  new URL("../../../node_modules/howdone/package.json", import.meta.url),
);
const installedCliUrl = new URL(
  "../../../node_modules/howdone-cli/package.json",
  import.meta.url,
);
const cli = existsSync(fileURLToPath(installedCliUrl))
  ? readPackage(installedCliUrl)
  : expectedCli;

test("published package metadata separates core and CLI contracts", () => {
  assert.deepEqual(core.keywords, expectedCore.keywords);
  assert.deepEqual(cli.keywords, expectedCli.keywords);
  assert.equal(core.name, "howdone");
  assert.equal(cli.name, "howdone-cli");
  assert.equal(
    core.description,
    "HowDone's framework-independent hexagonal core package.",
  );
  assert.equal(
    cli.description,
    "HowDone's primary CLI product and howdone command executor.",
  );
  assert.match(core.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u);
  assert.equal(cli.version, core.version);

  assert.deepEqual(core.dependencies ?? {}, {});
  assert.equal(core.bin, undefined);

  assert.deepEqual(cli.bin, {
    howdone: "./dist/boot/cli-main.js",
    "howdone-cli": "./dist/boot/cli-main.js",
  });
  assert.equal(cli.dependencies?.howdone, core.version);

  for (const dependency of [
    "mdast-util-to-string",
    "remark-frontmatter",
    "remark-gfm",
    "remark-parse",
    "smol-toml",
    "unified",
    "yaml",
  ]) {
    assert.equal(typeof cli.dependencies?.[dependency], "string");
  }

  assert.equal(cli.dependencies?.tsx, undefined);
  assert.equal(cli.dependencies?.typescript, undefined);
  assert.equal(cli.dependencies?.["@cucumber/cucumber"], undefined);
});
