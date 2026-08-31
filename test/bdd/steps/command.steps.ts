import assert from "node:assert/strict";
import { Then, When } from "@cucumber/cucumber";
import {
  displayFixturePathArgument,
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

When(
  "I run howdone with the ASCII-escaped display fixture path and arguments {string}",
  function (this: ScenarioState, value: string) {
    runHowdone(this, [displayFixturePathArgument(this), ...splitArguments(value)]);
  },
);

function decodeUnicodeEscapes(value: string): string {
  return value.replaceAll("\\n", "\n").replace(
    /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/gu,
    (_match, codePoint: string | undefined, codeUnit: string | undefined) =>
      String.fromCodePoint(Number.parseInt(codePoint ?? codeUnit ?? "0", 16)),
  );
}

Then("the command succeeds", function (this: ScenarioState) {
  assert.equal(this.result?.status, 0, stderrText(this));
});

Then("the command fails", function (this: ScenarioState) {
  assert.equal(this.result?.status, 1);
});

Then("stdout contains {string}", function (this: ScenarioState, expected: string) {
  assert.ok(stdoutText(this).includes(decodeUnicodeEscapes(expected)));
});

Then("stdout equals {string}", function (this: ScenarioState, expected: string) {
  assert.equal(stdoutText(this), `${decodeUnicodeEscapes(expected)}\n`);
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

Then(
  "the {string} help section does not contain {string}",
  function (this: ScenarioState, title: string, unexpected: string) {
    const stdout = stdoutText(this);
    const start = stdout.indexOf(`${title}:`);
    assert.notEqual(start, -1);
    const next = stdout.indexOf("\n\n", start + title.length + 1);
    const section = next === -1 ? stdout.slice(start) : stdout.slice(start, next);
    assert.equal(section.includes(unexpected), false);
  },
);

Then("stdout contains no terminal control sequences", function (this: ScenarioState) {
  assert.doesNotMatch(stdoutText(this), /\u001B/u);
});

Then("stderr contains no terminal control sequences", function (this: ScenarioState) {
  assert.doesNotMatch(stderrText(this), /\u001B/u);
});

Then("stdout is empty", function (this: ScenarioState) {
  assert.equal(stdoutText(this), "");
});

Then("stdout preserves terminal empty-line markers", function (this: ScenarioState) {
  assert.ok(stdoutText(this).includes("\n\\\n"));
});
