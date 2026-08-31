import assert from "node:assert/strict";
import { Then } from "@cucumber/cucumber";
import {
  cliJsonOutputFixtures,
  stdoutText,
  type ScenarioState,
} from "./support.ts";

function inputArgument(argumentsValue: readonly string[]): string | undefined {
  if (argumentsValue[0] !== undefined && !argumentsValue[0].startsWith("-")) {
    return argumentsValue[0];
  }
  const endOfOptions = argumentsValue.indexOf("--");
  return endOfOptions < 0 ? undefined : argumentsValue[endOfOptions + 1];
}

function normalizedArguments(argumentsValue: readonly string[]): readonly string[] {
  if (argumentsValue[0] !== undefined && !argumentsValue[0].startsWith("-")) {
    return argumentsValue.slice(1);
  }
  const endOfOptions = argumentsValue.indexOf("--");
  if (endOfOptions < 0 || argumentsValue[endOfOptions + 1] === undefined) {
    return argumentsValue;
  }
  return [
    ...argumentsValue.slice(0, endOfOptions),
    "--",
    "$input-path",
  ];
}

function resolveInputPath(value: unknown, inputPath: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveInputPath(item, inputPath));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveInputPath(item, inputPath),
      ]),
    );
  }
  return value === "$input-path" ? inputPath : value;
}

function normalizedSource(source: string | undefined): string | undefined {
  return source?.replaceAll("\r\n", "\n").replace(/\n$/u, "");
}

export function assertJsonOutputMatchesFixture(world: ScenarioState): void {
  const argumentsValue = world.arguments;
  if (argumentsValue === undefined) {
    throw new Error("JSON output arguments are missing");
  }
  const inputPath = inputArgument(argumentsValue);
  if (inputPath === undefined) {
    throw new Error("JSON output input path is missing");
  }
  const normalized = normalizedArguments(argumentsValue);
  const fixture = cliJsonOutputFixtures.cases.find((candidate) =>
    candidate.arguments.length === normalized.length &&
    candidate.arguments.every((argument, index) => argument === normalized[index]) &&
    (candidate.sourceFixture === undefined
      ? normalizedSource(candidate.source) === normalizedSource(world.source)
      : candidate.sourceFixture === world.sourceFixture)
  );
  if (fixture === undefined) {
    throw new Error(
      `missing CLI JSON output fixture for ${world.sourceFixture ?? "source"}: ${JSON.stringify(normalized)}`,
    );
  }
  const expected = cliJsonOutputFixtures.outputs[fixture.output];
  if (expected === undefined) {
    throw new Error(`missing CLI JSON output oracle: ${fixture.output}`);
  }
  assert.deepEqual(
    JSON.parse(stdoutText(world)),
    resolveInputPath(expected, inputPath),
  );
}

Then("stdout is valid JSON", function (this: ScenarioState) {
  const parsed = JSON.parse(stdoutText(this)) as unknown;
  assert.equal(typeof parsed, "object");
  assert.notEqual(parsed, null);
  assert.equal(Array.isArray(parsed), false);
  assertJsonOutputMatchesFixture(this);
});
