import assert from "node:assert/strict";
import { test } from "node:test";
import { run } from "howdone/application";
import { consumerCases, createConsumerContext } from "../implementations/index.ts";

function ioFor(output: { stdout: string; stderr: string }) {
  return {
    stdout: { write: (chunk: string) => { output.stdout += chunk; } },
    stderr: { write: (chunk: string) => { output.stderr += chunk; } },
  };
}

for (const fixture of consumerCases) {
  test(`published application handles ${fixture.code}`, async () => {
    const context = createConsumerContext(fixture.code);
    const output = { stdout: "", stderr: "" };

    const exitCode = await run(
      [context.path, "--json"],
      ioFor(output),
      context.dependencies,
    );

    assert.equal(exitCode, 0);
    assert.equal(output.stderr, "");
    assert.deepEqual(context.reader.requests, [context.path]);
    assert.deepEqual(context.warning.messages, []);
    assert.equal(context.json.calls.length, 1);
    const report = JSON.parse(output.stdout) as {
      sourcePath: string;
      percentage: number;
      rootCount: number;
      frontmatterSections: number;
    };
    assert.equal(report.sourcePath, context.path);
    assert.equal(report.percentage, fixture.expected.percentage);
    assert.equal(report.frontmatterSections, fixture.expected.frontmatterSections);
    assert.equal(
      report.rootCount,
      fixture.expected.frontmatterSections + fixture.expected.bodyRootCount,
    );
  });
}

test("published application routes a body variant through the terminal port", async () => {
  const context = createConsumerContext("body-two-items");
  const output = { stdout: "", stderr: "" };

  const exitCode = await run([context.path], ioFor(output), context.dependencies);

  assert.equal(exitCode, 0);
  assert.equal(output.stderr, "");
  assert.equal(context.terminal.calls.length, 1);
  assert.match(output.stdout, /^consumer-terminal:default:50:first\n$/u);
});
