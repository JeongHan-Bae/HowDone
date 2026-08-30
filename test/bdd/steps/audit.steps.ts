import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import {
  cliAuditFixtures,
  createWorkspace,
  frontmatterFixtures,
  runHowdone,
  stderrText,
  stdoutText,
  type CliAuditCase,
  type ScenarioState,
} from "./support.ts";

function auditCaseOf(world: ScenarioState): CliAuditCase {
  if (world.auditCase === undefined) {
    throw new Error("the CLI audit fixture has not been selected");
  }
  return world.auditCase;
}

Given(
  "the CLI audit fixture {string}",
  function (this: ScenarioState, id: string) {
    const auditCase = cliAuditFixtures.cases.find(
      (candidate) => candidate.id === id,
    );
    if (auditCase === undefined) {
      throw new Error("unknown CLI audit fixture: " + id);
    }
    const source = auditCase.source ?? (
      auditCase.sourceFixture === undefined
        ? undefined
        : frontmatterFixtures.cases.find(
          (candidate) => candidate.id === auditCase.sourceFixture,
        )?.source
    );
    if (source === undefined) {
      throw new Error("missing source for CLI audit fixture: " + id);
    }
    this.auditCase = auditCase;
    createWorkspace(this, auditCase.fileName ?? "tasks.md", source);
  },
);

When(
  "I run the CLI audit fixture",
  function (this: ScenarioState) {
    runHowdone(this, auditCaseOf(this).arguments);
  },
);

Then(
  "the CLI audit result matches its fixture",
  function (this: ScenarioState) {
    const auditCase = auditCaseOf(this);
    const expected = auditCase.expected;
    const stdout = stdoutText(this);
    const stderr = stderrText(this);
    assert.equal(this.result?.status, expected.status, stderr);
    if (expected.stdoutExact !== undefined) {
      assert.equal(stdout, expected.stdoutExact);
    }
    for (const fragment of expected.stdoutContains ?? []) {
      assert.ok(stdout.includes(fragment), fragment);
    }
    for (const fragment of expected.stdoutNotContains ?? []) {
      assert.equal(stdout.includes(fragment), false, fragment);
    }
    const expectedJson = expected.stdoutJsonFixture === undefined
      ? expected.stdoutJson
      : cliAuditFixtures.jsonOutputs[expected.stdoutJsonFixture];
    if (
      expected.stdoutJsonFixture !== undefined &&
      expectedJson === undefined
    ) {
      throw new Error(
        "missing JSON output fixture: " + expected.stdoutJsonFixture,
      );
    }
    if (expectedJson !== undefined) {
      assert.deepEqual(JSON.parse(stdout), expectedJson);
    } else if (
      auditCase.arguments.includes("--json") &&
      expected.status === 0
    ) {
      throw new Error(
        "successful JSON CLI audit cases must provide stdoutJson in the fixture: " +
          stdout,
      );
    }
    if (expected.stderrExact !== undefined) {
      assert.equal(stderr, expected.stderrExact);
    }
    for (const fragment of expected.stderrContains ?? []) {
      assert.ok(stderr.includes(fragment), fragment);
    }
    for (const fragment of expected.stderrNotContains ?? []) {
      assert.equal(stderr.includes(fragment), false, fragment);
    }
    let previousIndex = -1;
    for (const fragment of expected.stderrOrder ?? []) {
      const index = stderr.indexOf(fragment, previousIndex + 1);
      assert.notEqual(index, -1, fragment);
      previousIndex = index;
    }
  },
);
