import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import {
  createConsumerContext,
  type ConsumerContext,
} from "../../implementations/index.ts";

interface ConsumerWorld {
  context?: ConsumerContext;
  status?: number;
  stdout: string;
  stderr: string;
}

function contextOf(world: ConsumerWorld): ConsumerContext {
  if (world.context === undefined) throw new Error("consumer context is missing");
  return world.context;
}

async function publishedApplication(): Promise<{
  run: typeof import("howdone/application").run;
}> {
  const entry = process.env.HOWDONE_PACKAGE_APPLICATION_ENTRY;
  if (entry === undefined) {
    throw new Error("published application entry is missing");
  }
  return import(entry);
}

Given(
  "a consumer provides ports for the {string} input",
  function (this: ConsumerWorld, code: string) {
    this.context = createConsumerContext(code);
    this.stdout = "";
    this.stderr = "";
  },
);

When(
  "the consumer invokes the published application in {string} mode",
  async function (this: ConsumerWorld, mode: string) {
    const context = contextOf(this);
    const output = {
      stdout: { write: (chunk: string) => { this.stdout += chunk; } },
      stderr: { write: (chunk: string) => { this.stderr += chunk; } },
    };
    const argv = mode === "json"
      ? [context.path, "--json"]
      : [context.path];
    this.status = await (await publishedApplication()).run(
      argv,
      output,
      context.dependencies,
    );
  },
);

When(
  "the consumer invokes the published application with a JSON formatting option",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const output = {
      stdout: { write: (chunk: string) => { this.stdout += chunk; } },
      stderr: { write: (chunk: string) => { this.stderr += chunk; } },
    };
    this.status = await (await publishedApplication()).run(
      [context.path, "--json", "--precision", "2"],
      output,
      context.dependencies,
    );
  },
);

Then("the published application succeeds", function (this: ConsumerWorld) {
  assert.equal(this.status, 0, this.stderr);
});

Then(
  "the consumer file reader received the mapped path",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(context.reader.requests, [context.path]);
  },
);

Then("the consumer warning port has no messages", function (this: ConsumerWorld) {
  assert.deepEqual(contextOf(this).warning.messages, []);
});

Then(
  "the consumer warning port matched {string}",
  function (this: ConsumerWorld, code: string) {
    assert.deepEqual(contextOf(this).warning.codes, [code]);
  },
);

Then(
  "consumer output contains the mapped percentage",
  function (this: ConsumerWorld) {
    assert.ok(this.stdout.includes(String(contextOf(this).expected.percentage)));
  },
);
