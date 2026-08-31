import assert from "node:assert/strict";
import { test } from "node:test";
import { JsonRenderer } from "../../src/adapters/output/json-renderer.ts";
import type { JsonObject } from "howdone";
import { inputStream, terminalStream } from "./output-streams.ts";

interface FakeStdout {
  stream: NodeJS.WriteStream;
  text: () => string;
}

function fakeStdout(isTTY: boolean): FakeStdout {
  let output = "";
  const stream = {
    isTTY,
    write: (chunk: string) => {
      output += chunk;
      return true;
    },
  } as unknown as NodeJS.WriteStream;
  return { stream, text: () => output };
}

function jsonFixture(): JsonObject {
  return {
    key: "text",
    number: 1.25,
    boolean: true,
    nil: null,
    array: ["item", false],
    object: { nested: 0 },
  };
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/gu, "");
}

test("TDD JSON renderer returns a JSON object rather than rendered text", () => {
  const content = new JsonRenderer().render({
    source: { path: "tasks.md" },
    progress: {
      rootCount: 0,
      explicitCheckboxCount: 0,
      implicitNodeCount: 0,
      nodeCount: 0,
      completedEquivalent: 0,
      progress: 0,
      percentage: 0,
      roots: [],
    },
  });

  assert.equal(typeof content, "object");
  assert.equal(Array.isArray(content), false);
  assert.equal(content.source instanceof Object, true);
  assert.equal(
    `${JSON.stringify(content, null, 2)}\n`.endsWith("\n"),
    true,
  );
});

test("TDD JSON delivery stays plain for a non-TTY target", () => {
  const target = fakeStdout(false);
  const renderer = new JsonRenderer(undefined, { stdout: target.stream });
  const content = jsonFixture();

  renderer.writeWithTerminalFeatures(content);

  assert.equal(target.text(), `${JSON.stringify(content, null, 2)}\n`);
  assert.doesNotMatch(target.text(), /\u001b/gu);
});

test("TDD JSON delivery colors syntax without changing the JSON document", () => {
  const target = fakeStdout(true);
  const renderer = new JsonRenderer(undefined, { stdout: target.stream });
  const content = jsonFixture();

  renderer.writeWithTerminalFeatures(content, { color: "auto" });

  assert.match(target.text(), /\u001b\[/u);
  assert.equal(
    stripAnsi(target.text()),
    `${JSON.stringify(content, null, 2)}\n`,
  );
  assert.deepEqual(JSON.parse(stripAnsi(target.text())), content);
});

test("TDD JSON delivery honors no-color on a TTY", () => {
  const target = fakeStdout(true);
  const renderer = new JsonRenderer(undefined, { stdout: target.stream });
  const content = jsonFixture();

  renderer.writeWithTerminalFeatures(content, { color: "never" });

  assert.equal(target.text(), `${JSON.stringify(content, null, 2)}\n`);
});

test("TDD JSON Pager keeps the same object and replays complete JSON on q", async () => {
  const stdout = terminalStream(true, 5);
  const stdin = inputStream(true);
  let output = "";
  stdout.on("data", (chunk: Buffer | string) => {
    output += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
  });
  const content = jsonFixture();
  const renderer = new JsonRenderer(undefined, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
  });

  const completion = renderer.writeWithTerminalFeatures(content, {
    color: "never",
  });
  assert.ok(completion instanceof Promise);
  setTimeout(() => stdin.write("q"), 25);
  await completion;

  assert.ok(output.includes(`${JSON.stringify(content, null, 2)}\n`));
  assert.equal(stdin.rawMode, false);
});
