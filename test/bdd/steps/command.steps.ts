import assert from "node:assert/strict";
import { Then, When } from "@cucumber/cucumber";
import {
  nativePathArgument,
  packageRuntimeDependencies,
  runHowdone,
  splitArguments,
  stderrText,
  packageVersion,
  stdoutText,
  type ScenarioState,
} from "./support.ts";

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
  assert.equal(this.result?.status, 0, stderrText(this));
});

Then("the command fails", function (this: ScenarioState) {
  assert.notEqual(this.result?.status, 0);
});

Then("stdout contains {string}", function (this: ScenarioState, expected: string) {
  assert.ok(stdoutText(this).includes(expected));
});

Then("stdout equals {string}", function (this: ScenarioState, expected: string) {
  assert.equal(stdoutText(this), expected + "\n");
});

Then("stdout equals the package.json version", function (this: ScenarioState) {
  assert.equal(stdoutText(this), `${packageVersion}\n`);
});

Then(
  "stdout contains every package.json runtime dependency",
  function (this: ScenarioState) {
    const stdout = stdoutText(this);
    for (const dependency of packageRuntimeDependencies) {
      assert.ok(stdout.includes(`${dependency.name}@${dependency.version}`));
    }
  },
);

Then("stderr is empty", function (this: ScenarioState) {
  assert.equal(stderrText(this), "");
});

Then("stderr contains {string}", function (this: ScenarioState, expected: string) {
  assert.ok(stderrText(this).includes(expected));
});

Then(
  "stderr contains {string} exactly once",
  function (this: ScenarioState, expected: string) {
    assert.equal(stderrText(this).split(expected).length - 1, 1);
  },
);

Then("stdout does not contain {string}", function (this: ScenarioState, unexpected: string) {
  assert.equal(stdoutText(this).includes(unexpected), false);
});
