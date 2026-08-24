import assert from "node:assert/strict";
import { Then } from "@cucumber/cucumber";
import {
  nativePathArgument,
  stdoutText,
  type ScenarioState,
} from "./support.ts";

Then("stdout is valid JSON", function (this: ScenarioState) {
  const parsed = JSON.parse(stdoutText(this)) as unknown;
  assert.equal(typeof parsed, "object");
  assert.notEqual(parsed, null);
  assert.equal(Array.isArray(parsed), false);
});

Then(
  "stdout JSON has keys {string}",
  function (this: ScenarioState, expected: string) {
    const parsed = JSON.parse(stdoutText(this)) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed), expected.split(","));
  },
);

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
  "stdout JSON reports frontmatter {string} progress {string} and percentage {string}",
  function (
    this: ScenarioState,
    format: string,
    expectedProgress: string,
    expectedPercentage: string,
  ) {
    const parsed = JSON.parse(stdoutText(this)) as {
      frontmatter?: Array<{
        format?: string;
        progress?: { progress?: number; percentage?: number };
      }>;
    };
    const section = parsed.frontmatter?.find(
      (candidate) => candidate.format === format,
    );
    assert.equal(section?.progress?.progress, Number(expectedProgress));
    assert.equal(section?.progress?.percentage, Number(expectedPercentage));
  },
);

Then(
  "stdout JSON reports frontmatter formats {string}",
  function (this: ScenarioState, expected: string) {
    const parsed = JSON.parse(stdoutText(this)) as {
      frontmatter?: Array<{ format?: string }>;
    };
    assert.equal(
      parsed.frontmatter?.map((section) => section.format).join(","),
      expected,
    );
  },
);

Then(
  "stdout JSON reports presentation {string}",
  function (this: ScenarioState, expected: string) {
    const parsed = JSON.parse(stdoutText(this)) as {
      presentation?: string;
    };
    assert.equal(parsed.presentation, expected);
  },
);

Then(
  "stdout JSON reports frontmatter weight {string}",
  function (this: ScenarioState, expected: string) {
    const parsed = JSON.parse(stdoutText(this)) as {
      frontmatterWeight?: number;
    };
    assert.equal(parsed.frontmatterWeight, Number(expected));
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
