import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { After, Given, Then, When } from "@cucumber/cucumber";

interface ScenarioState {
  directory?: string;
  result?: ReturnType<typeof spawnSync>;
}

function createWorkspace(world: ScenarioState, fileName: string, source: string): void {
  const directory = mkdtempSync(join(tmpdir(), "howdone-bdd-"));
  world.directory = directory;
  writeFileSync(join(directory, fileName), source, "utf8");
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

Given("an empty howdone workspace", function (this: ScenarioState) {
  this.directory = mkdtempSync(join(tmpdir(), "howdone-bdd-"));
});

When("I run howdone with arguments {string}", function (this: ScenarioState, value: string) {
  assert.ok(this.directory);
  const entryPoint = resolve(process.cwd(), "bin", "howdone.cjs");
  this.result = spawnSync(process.execPath, [entryPoint, ...splitArguments(value)], {
    cwd: this.directory,
    encoding: "utf8",
  });
});

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

Then("stderr contains {string}", function (this: ScenarioState, expected: string) {
  assert.ok((this.result?.stderr ?? "").includes(expected));
});

After(function (this: ScenarioState) {
  if (this.directory !== undefined) {
    rmSync(this.directory, { recursive: true, force: true });
  }
});
