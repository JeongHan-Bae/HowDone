import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  HELP_SECTIONS,
  renderDependenciesText,
  renderHelpText,
} from "../../src/application/cli/help.ts";
import { packageRuntimeDependencies } from "../../src/adapters/runtime/node-package-version.ts";

interface PackageMetadata {
  dependencies: Record<string, string>;
}

const packageMetadata = JSON.parse(
  readFileSync(new URL("../../packages/cli/package.json", import.meta.url), "utf8"),
) as PackageMetadata;

const expectedRuntimeDependencies = Object.entries(
  packageMetadata.dependencies,
).map(([name, version]) => ({ name, version }));

test("TDD help content keeps usage, options, and sections structured", () => {
  assert.equal(typeof HELP_SECTIONS.usage, "string");
  assert.deepEqual(HELP_SECTIONS.usage.split("\n"), [
    "howdone <markdown-path> [options]",
    "howdone --help",
    "howdone --version",
    "howdone --dependencies",
  ]);
  assert.deepEqual(
    HELP_SECTIONS.commands.map(({ command }) => command),
    [["--help", "-h"], ["--version", "-v"], "--dependencies"],
  );
  assert.equal(Array.isArray(HELP_SECTIONS.options), true);
  assert.ok(HELP_SECTIONS.options.length > 0);
  assert.equal(
    HELP_SECTIONS.options.some((option) =>
      option.command === "-h, --help" || option.command === "-v, --version"
    ),
    false,
  );

  const format = HELP_SECTIONS.options.find(
    (option) => option.command === "--format",
  );
  const percentage = HELP_SECTIONS.options.find(
    (option) =>
      Array.isArray(option.command) && option.command.includes("--percentage"),
  );
  const decimal = HELP_SECTIONS.options.find(
    (option) =>
      Array.isArray(option.command) && option.command.includes("--decimal"),
  );
  assert.deepEqual(format?.argument, "decimal|percentage");
  assert.deepEqual(percentage?.argument, "");
  assert.deepEqual(decimal?.argument, "");
  assert.ok(HELP_SECTIONS.options.every((option) =>
    option.description.every((line: unknown) => typeof line === "string")
  ));

  const helpText = renderHelpText(HELP_SECTIONS, packageRuntimeDependencies);
  assert.match(helpText, /^Usage:\n/u);
  assert.match(helpText, /Syntax reference:/u);
  assert.match(helpText, /Node\.js 18\.18 or newer is required\./u);
  assert.match(helpText, /Runtime dependencies:/u);
  assert.match(
    helpText,
    /These dependencies are installed with the published package\./u,
  );
  assert.doesNotMatch(helpText, /tsx/iu);
  assert.deepEqual(packageRuntimeDependencies, expectedRuntimeDependencies);
  for (const dependency of expectedRuntimeDependencies) {
    assert.ok(helpText.includes(`${dependency.name}@${dependency.version}`));
  }
  assert.equal(
    helpText,
    renderHelpText(HELP_SECTIONS, packageRuntimeDependencies),
  );
  assert.match(
    renderHelpText(
      HELP_SECTIONS,
      packageRuntimeDependencies,
      "/installed/howdone-cli/docs/syntax.md",
    ),
    /\/installed\/howdone-cli\/docs\/syntax\.md/u,
  );

  assert.equal(
    renderDependenciesText(packageRuntimeDependencies),
    `${expectedRuntimeDependencies.map(({ name, version }) => `${name}@${version}`).join("\n")}\n`,
  );
});
