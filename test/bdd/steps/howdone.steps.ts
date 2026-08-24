import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { After, Given, Then, When } from "@cucumber/cucumber";

interface ScenarioState {
  directory?: string;
  filePath?: string;
  result?: ReturnType<typeof spawnSync>;
}

interface PathVariant {
  kind: string;
  segments: readonly string[];
  absolute: boolean;
}

interface PathFixtures {
  pathVariants: readonly PathVariant[];
}

const pathFixtures = JSON.parse(
  readFileSync(new URL("../../fixtures/cli-paths.json", import.meta.url), "utf8"),
) as PathFixtures;

function createWorkspace(world: ScenarioState, fileName: string, source: string): void {
  const directory = mkdtempSync(path.join(tmpdir(), "howdone-bdd-"));
  const filePath = path.resolve(directory, fileName);
  mkdirSync(path.dirname(filePath), { recursive: true });
  world.directory = directory;
  world.filePath = filePath;
  writeFileSync(filePath, source, "utf8");
}

function createNativeVariantWorkspace(
  world: ScenarioState,
  kind: string,
  source: string,
): void {
  const directory = mkdtempSync(path.join(tmpdir(), "howdone-bdd-"));
  const variant = pathFixtures.pathVariants.find(
    (candidate) => candidate.kind === kind,
  );
  if (variant === undefined) {
    throw new Error(`unsupported native path kind: ${kind}`);
  }
  const filePath = path.resolve(directory, ...variant.segments);
  mkdirSync(path.dirname(filePath), { recursive: true });
  world.directory = directory;
  world.filePath = filePath;
  writeFileSync(filePath, source, "utf8");
}

function splitArguments(value: string): string[] {
  const matches = value.match(/(?:[^\s"]+|"[^"]*")+/gu) ?? [];
  return matches.map((argument) =>
    argument.startsWith('"') && argument.endsWith('"')
      ? argument.slice(1, -1)
      : argument,
  );
}

Given("a Markdown file containing:", function (this: ScenarioState, source: string) {
  createWorkspace(this, "tasks.md", source);
});

Given(
  "a Markdown file named {string} containing:",
  function (this: ScenarioState, fileName: string, source: string) {
    createWorkspace(this, fileName, source);
  },
);

Given(
  "a file named {string} containing:",
  function (this: ScenarioState, fileName: string, source: string) {
    createWorkspace(this, fileName, source);
  },
);

Given(
  "a Markdown directory named {string}",
  function (this: ScenarioState, directoryName: string) {
    const directory = mkdtempSync(path.join(tmpdir(), "howdone-bdd-"));
    const filePath = path.resolve(directory, directoryName);
    mkdirSync(filePath, { recursive: true });
    this.directory = directory;
    this.filePath = filePath;
  },
);

Given("an empty howdone workspace", function (this: ScenarioState) {
  this.directory = mkdtempSync(path.join(tmpdir(), "howdone-bdd-"));
});

Given(
  "a Markdown fixture for native path variant {string} containing:",
  function (this: ScenarioState, kind: string, source: string) {
    createNativeVariantWorkspace(this, kind, source);
  },
);

function runHowdone(world: ScenarioState, argumentsValue: readonly string[]): void {
  if (world.directory === undefined) {
    throw new Error("the BDD workspace has not been created");
  }
  const entryPoint = path.resolve(process.cwd(), "bin", "howdone.cjs");
  world.result = spawnSync(process.execPath, [entryPoint, ...argumentsValue], {
    cwd: world.directory,
    encoding: "utf8",
  });
}

function nativePathArgument(world: ScenarioState, kind: string): string {
  if (world.directory === undefined || world.filePath === undefined) {
    throw new Error("the BDD file workspace has not been created");
  }
  const relativePath = path.relative(world.directory, world.filePath);
  if (kind === "absolute") {
    return world.filePath;
  }
  if (kind === "relative" || kind === "relative-space") {
    return relativePath;
  }
  if (kind === "absolute-space") {
    return world.filePath;
  }
  if (kind === "relative-dot") {
    return path.format({ dir: ".", base: relativePath });
  }
  throw new Error(`unsupported native path kind: ${kind}`);
}

function stdoutText(world: ScenarioState): string {
  const stdout = world.result?.stdout;
  return typeof stdout === "string"
    ? stdout
    : stdout?.toString("utf8") ?? "";
}

When(
  "I run howdone with arguments {string}",
  function (this: ScenarioState, value: string) {
    runHowdone(this, splitArguments(value));
  },
);

When(
  "I run howdone with the native {word} path and arguments {string}",
  function (this: ScenarioState, kind: string, value: string) {
    runHowdone(this, [nativePathArgument(this, kind), ...splitArguments(value)]);
  },
);

Then("the command succeeds", function (this: ScenarioState) {
  assert.equal(this.result?.status, 0, String(this.result?.stderr ?? ""));
});

Then("the command fails", function (this: ScenarioState) {
  assert.notEqual(this.result?.status, 0);
});

Then("stdout contains {string}", function (this: ScenarioState, expected: string) {
  assert.ok((this.result?.stdout ?? "").includes(expected));
});

Then("stdout equals {string}", function (this: ScenarioState, expected: string) {
  assert.equal(this.result?.stdout, `${expected}\n`);
});

Then("stdout is a semantic version", function (this: ScenarioState) {
  assert.match(stdoutText(this), /^\d+\.\d+\.\d+\n$/u);
});

Then("stderr is empty", function (this: ScenarioState) {
  const stderr = this.result?.stderr;
  assert.equal(typeof stderr === "string" ? stderr : stderr?.toString("utf8") ?? "", "");
});

Then("stderr contains {string}", function (this: ScenarioState, expected: string) {
  assert.ok((this.result?.stderr ?? "").includes(expected));
});

Then("stdout is valid JSON", function (this: ScenarioState) {
  assert.doesNotThrow(() => JSON.parse(stdoutText(this)));
});

Then(
  "stdout JSON has source path equal to the native {word} path",
  function (this: ScenarioState, kind: string) {
    const parsed = JSON.parse(stdoutText(this)) as {
      source?: { path?: string };
    };
    assert.equal(parsed.source?.path, nativePathArgument(this, kind));
  },
);

Then(
  "stdout JSON reports progress {string} and percentage {string}",
  function (this: ScenarioState, expectedProgress: string, expectedPercentage: string) {
    const parsed = JSON.parse(stdoutText(this)) as {
      progress?: { progress?: number; percentage?: number };
    };
    assert.equal(parsed.progress?.progress, Number(expectedProgress));
    assert.equal(parsed.progress?.percentage, Number(expectedPercentage));
  },
);

Then(
  "stdout JSON contains nested labels {string}, {string}, and {string}",
  function (this: ScenarioState, rootLabel: string, firstChild: string, secondChild: string) {
    const parsed = JSON.parse(stdoutText(this)) as {
      progress?: {
        roots?: Array<{
          label: string;
          children: Array<{ label: string }>;
        }>;
      };
    };
    const root = parsed.progress?.roots?.[0];
    assert.equal(root?.label, rootLabel);
    assert.equal(root?.children[0]?.label, firstChild);
    assert.equal(root?.children[1]?.label, secondChild);
  },
);

Then("stdout does not contain {string}", function (this: ScenarioState, unexpected: string) {
  assert.equal(stdoutText(this).includes(unexpected), false);
});

After(function (this: ScenarioState) {
  if (this.directory !== undefined) {
    rmSync(this.directory, { recursive: true, force: true });
  }
});
