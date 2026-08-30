import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import {
  consumerCompositionForCode,
  consumerOutputCapabilityOutputForCode,
  createConsumerContext,
  installConsumerFailure,
  jsonExpectedForSignature,
  type ConsumerFailure,
  type ConsumerContext,
} from "../../implementations/index.ts";

interface ConsumerWorld {
  context?: ConsumerContext;
  mode?: "terminal" | "json";
  status?: number;
  statuses?: number[];
  stdout: string;
  stderr: string;
  terminalStdout?: string;
  terminalStderr?: string;
  jsonStdout?: string;
  jsonStderr?: string;
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

function capabilityArguments(
  context: ConsumerContext,
  mode: "--tree" | "--details" | "--json" | undefined,
): string[] {
  if (context.capability === undefined) {
    throw new Error("output capability fixture is missing");
  }
  return [
    context.path,
    ...(mode === undefined ? [] : [mode]),
    ...(context.capability.request.color === "never" ? ["--no-color"] : []),
    ...(context.capability.request.pager === "never" ? ["--no-pager"] : []),
  ];
}

Given(
  "a consumer provides custom ports for the {string} input",
  function (this: ConsumerWorld, code: string) {
    this.context = createConsumerContext(code);
    this.stdout = "";
    this.stderr = "";
  },
);

Given(
  "a consumer provides the standard AST parser for the {string} input",
  function (this: ConsumerWorld, code: string) {
    this.context = createConsumerContext(code, undefined, false, "standard");
    this.stdout = "";
    this.stderr = "";
  },
);

Given(
  "a consumer provides observable output ports for the {string} input",
  function (this: ConsumerWorld, code: string) {
    this.context = createConsumerContext(code, undefined, true);
    this.stdout = "";
    this.stderr = "";
  },
);

Given(
  "a consumer provides the mixed composition fixture",
  function (this: ConsumerWorld) {
    this.context = createConsumerContext("yaml-plus-body");
    this.context.dependencies.yamlValueParser = {
      parse: () => ({ checks: { setup: false } }),
    };
    this.stdout = "";
    this.stderr = "";
  },
);

When(
  "the consumer invokes the published application in {string} mode",
  async function (this: ConsumerWorld, mode: string) {
    const context = contextOf(this);
    if (mode !== "terminal" && mode !== "json") {
      throw new Error(`unsupported consumer mode: ${mode}`);
    }
    this.mode = mode;
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
  "the consumer invokes the published application in all terminal modes with display options",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const output = {
      stdout: { write: (chunk: string) => { this.stdout += chunk; } },
      stderr: { write: (chunk: string) => { this.stderr += chunk; } },
    };
    const application = await publishedApplication();
    const modes: string[][] = [
      [],
      ["--tree"],
      ["--details"],
    ];
    this.statuses = [];
    for (const mode of modes) {
      this.statuses.push(await application.run(
        [
          context.path,
          ...mode,
          "--format",
          "decimal",
          "--precision",
          "3",
          "--show-trailing-zeros",
          "--max-label-clusters",
          "4",
        ],
        output,
        context.dependencies,
      ));
    }
  },
);

When(
  "the consumer invokes the published application with no optional output hooks",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const terminal = { stdout: "", stderr: "" };
    const json = { stdout: "", stderr: "" };
    const application = await publishedApplication();
    this.statuses = [
      await application.run(
        [context.path],
        {
          stdout: { write: (chunk: string) => { terminal.stdout += chunk; } },
          stderr: { write: (chunk: string) => { terminal.stderr += chunk; } },
        },
        context.dependencies,
      ),
      await application.run(
        [context.path, "--json"],
        {
          stdout: { write: (chunk: string) => { json.stdout += chunk; } },
          stderr: { write: (chunk: string) => { json.stderr += chunk; } },
        },
        context.dependencies,
      ),
    ];
    this.terminalStdout = terminal.stdout;
    this.terminalStderr = terminal.stderr;
    this.jsonStdout = json.stdout;
    this.jsonStderr = json.stderr;
    this.stderr = `${terminal.stderr}${json.stderr}`;
  },
);

When(
  "the consumer invokes the published application with a JSON formatting option",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    this.mode = "json";
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

When(
  "the consumer invokes the published application information commands",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const output = {
      stdout: { write: (chunk: string) => { this.stdout += chunk; } },
      stderr: { write: (chunk: string) => { this.stderr += chunk; } },
    };
    const application = await publishedApplication();
    this.statuses = [];
    for (const command of ["--help", "--version", "--dependencies"] as const) {
      this.statuses.push(await application.run(
        [command, "--no-color", "--no-pager"],
        output,
        context.dependencies,
      ));
    }
  },
);

When(
  "the consumer invokes the published application information command",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const output = {
      stdout: { write: (chunk: string) => { this.stdout += chunk; } },
      stderr: { write: (chunk: string) => { this.stderr += chunk; } },
    };
    this.status = await (await publishedApplication()).run(
      ["--help"],
      output,
      context.dependencies,
    );
  },
);

When(
  "the consumer invokes the published application with merged weighted display options",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const terminal = { stdout: "", stderr: "" };
    const json = { stdout: "", stderr: "" };
    const application = await publishedApplication();
    this.statuses = [
      await application.run(
        [
          context.path,
          "--tree",
          "--merge-frontmatter",
          "--frontmatter-weight",
          "0.25",
          "--format",
          "decimal",
          "--precision",
          "3",
          "--show-trailing-zeros",
          "--max-label-clusters",
          "4",
          "--no-color",
          "--no-pager",
        ],
        {
          stdout: { write: (chunk: string) => { terminal.stdout += chunk; } },
          stderr: { write: (chunk: string) => { terminal.stderr += chunk; } },
        },
        context.dependencies,
      ),
      await application.run(
        [
          context.path,
          "--json",
          "--merge-frontmatter",
          "--frontmatter-weight=0.25",
          "--max-label-clusters=4",
          "--no-color",
          "--no-pager",
        ],
        {
          stdout: { write: (chunk: string) => { json.stdout += chunk; } },
          stderr: { write: (chunk: string) => { json.stderr += chunk; } },
        },
        context.dependencies,
      ),
    ];
    this.terminalStdout = terminal.stdout;
    this.terminalStderr = terminal.stderr;
    this.jsonStdout = json.stdout;
    this.jsonStderr = json.stderr;
    this.stderr = terminal.stderr + json.stderr;
  },
);

When(
  "the consumer invokes the published application with an invalid frontmatter weight",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const output = {
      stdout: { write: (chunk: string) => { this.stdout += chunk; } },
      stderr: { write: (chunk: string) => { this.stderr += chunk; } },
    };
    this.status = await (await publishedApplication()).run(
      [context.path, "--frontmatter-weight", "0", "--silent"],
      output,
      context.dependencies,
    );
  },
);

When(
  "the consumer invokes the published application with strict and silent JSON formatting",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const output = {
      stdout: { write: (chunk: string) => { this.stdout += chunk; } },
      stderr: { write: (chunk: string) => { this.stderr += chunk; } },
    };
    this.status = await (await publishedApplication()).run(
      [context.path, "--json", "--precision", "2", "--strict", "--silent"],
      output,
      context.dependencies,
    );
  },
);

Given(
  "a consumer provides the output capability fixture {string}",
  function (this: ConsumerWorld, capabilityCode: string) {
    this.context = createConsumerContext("body-two-items", capabilityCode);
    this.stdout = "";
    this.stderr = "";
  },
);

Given(
  "a consumer provides diagnostic output ports",
  function (this: ConsumerWorld) {
    this.context = createConsumerContext("body-two-items", undefined, true);
    this.stdout = "";
    this.stderr = "";
  },
);

Given(
  "a consumer provides fallback diagnostic ports for the {string} input",
  function (this: ConsumerWorld, code: string) {
    this.context = createConsumerContext(code);
    this.stdout = "";
    this.stderr = "";
  },
);

Given(
  "a consumer provides the failing {string} port for the {string} input",
  function (this: ConsumerWorld, failure: string, code: string) {
    this.context = createConsumerContext(code, undefined, true);
    installConsumerFailure(this.context, failure as ConsumerFailure);
    this.stdout = "";
    this.stderr = "";
  },
);

When(
  "the consumer invokes the published application diagnostics in terminal and JSON modes",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const terminal = { stdout: "", stderr: "" };
    const json = { stdout: "", stderr: "" };
    const application = await publishedApplication();
    this.statuses = [
      await application.run(
        [context.path, "--frontmatter-weight", "0.5"],
        {
          stdout: { write: (chunk: string) => { terminal.stdout += chunk; } },
          stderr: { write: (chunk: string) => { terminal.stderr += chunk; } },
        },
        context.dependencies,
      ),
      await application.run(
        [context.path, "--json", "--precision", "2", "--strict"],
        {
          stdout: { write: (chunk: string) => { json.stdout += chunk; } },
          stderr: { write: (chunk: string) => { json.stderr += chunk; } },
        },
        context.dependencies,
      ),
    ];
    this.terminalStdout = terminal.stdout;
    this.jsonStdout = json.stdout;
    this.stderr = `${terminal.stderr}${json.stderr}`;
  },
);

When(
  "the consumer invokes the published application diagnostics without a print hook",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const terminal = { stdout: "", stderr: "" };
    const json = { stdout: "", stderr: "" };
    const application = await publishedApplication();
    this.statuses = [
      await application.run(
        [context.path, "--frontmatter-weight", "0.5"],
        {
          stdout: { write: (chunk: string) => { terminal.stdout += chunk; } },
          stderr: { write: (chunk: string) => { terminal.stderr += chunk; } },
        },
        context.dependencies,
      ),
      await application.run(
        [context.path, "--json", "--precision", "2", "--strict"],
        {
          stdout: { write: (chunk: string) => { json.stdout += chunk; } },
          stderr: { write: (chunk: string) => { json.stderr += chunk; } },
        },
        context.dependencies,
      ),
    ];
    this.terminalStdout = terminal.stdout;
    this.terminalStderr = terminal.stderr;
    this.jsonStdout = json.stdout;
    this.jsonStderr = json.stderr;
    this.stderr = `${terminal.stderr}${json.stderr}`;
  },
);

When(
  "the consumer invokes the published application in terminal and JSON modes",
  async function (this: ConsumerWorld) {
    const context = contextOf(this);
    const terminal = { stdout: "", stderr: "" };
    const json = { stdout: "", stderr: "" };
    const application = await publishedApplication();
    this.statuses = [];
    for (const mode of [undefined, "--tree", "--details"] as const) {
      this.statuses.push(await application.run(
        capabilityArguments(context, mode),
        {
          stdout: { write: (chunk: string) => { terminal.stdout += chunk; } },
          stderr: { write: (chunk: string) => { terminal.stderr += chunk; } },
        },
        context.dependencies,
      ));
    }
    this.statuses.push(await application.run(
      capabilityArguments(context, "--json"),
      {
        stdout: { write: (chunk: string) => { json.stdout += chunk; } },
        stderr: { write: (chunk: string) => { json.stderr += chunk; } },
      },
      context.dependencies,
    ));
    this.terminalStdout = terminal.stdout;
    this.jsonStdout = json.stdout;
    this.stderr = `${terminal.stderr}${json.stderr}`;
  },
);

Then("the published application succeeds", function (this: ConsumerWorld) {
  assert.equal(this.status, 0, this.stderr);
});

Then("the published application fails", function (this: ConsumerWorld) {
  assert.equal(this.status, 1, this.stderr);
});

Then(
  "all terminal mode invocations succeed",
  function (this: ConsumerWorld) {
    assert.deepEqual(this.statuses, [0, 0, 0], this.stderr);
    assert.equal(this.stderr, "");
  },
);

Then(
  "fallback report delivery succeeds",
  function (this: ConsumerWorld) {
    assert.deepEqual(this.statuses, [0, 0], this.stderr);
    assert.equal(this.stderr, "");
  },
);

Then(
  "fallback report delivery writes the exact terminal and JSON outputs",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.equal(this.terminalStdout, "consumer-terminal:default:50:first\n");
    assert.equal(this.terminalStderr, "");
    assert.equal(this.jsonStderr, "");
    const expected = jsonExpectedForSignature("0|2|50", context.path);
    assert.deepEqual(JSON.parse(this.jsonStdout ?? ""), expected);
    assert.match(this.jsonStdout ?? "", /\n$/u);
    assert.equal(context.terminal.featureCalls.length, 0);
    assert.equal(context.json.featureCalls.length, 0);
  },
);

Then(
  "fallback diagnostic delivery returns warning success and strict error",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(this.statuses, [0, 1], this.stderr);
    assert.equal(context.terminal.diagnosticCalls.length, 2);
    assert.deepEqual(
      context.terminal.diagnosticCalls.map(({ options }) => options),
      [undefined, undefined],
    );
  },
);

Then(
  "fallback diagnostic delivery writes warning and error to stderr",
  function (this: ConsumerWorld) {
    assert.match(
      this.terminalStderr ?? "",
      /Warning: --frontmatter-weight is invalid without --merge-frontmatter/u,
    );
    assert.match(
      this.jsonStderr ?? "",
      /howdone: error: The following options have no effect with --json/u,
    );
    assert.equal(this.jsonStdout, "");
    assert.equal(this.terminalStdout, "consumer-terminal:default:50:first\n");
  },
);

Then(
  "the consumer receives the {string} error diagnostic",
  function (this: ConsumerWorld, message: string) {
    const context = contextOf(this);
    assert.equal(context.terminal.diagnosticCalls.length, 1);
    const call = context.terminal.diagnosticCalls[0];
    assert.ok(call);
    assert.deepEqual(call.document.lines[0]?.parts[0], {
      text: `howdone: error: ${message}`,
      semantic: "error",
    });
    assert.deepEqual(call.options, {
      color: "auto",
      pager: "never",
      target: "stderr",
    });
  },
);

Then(
  "the failing Core collaborator does not write report output",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.equal(this.stdout, "");
    assert.equal(this.stderr, "");
    assert.equal(context.terminal.featureCalls.length, 0);
    assert.equal(context.json.featureCalls.length, 0);
  },
);

Then(
  "the consumer received every terminal mode and resolved display option",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(
      context.terminal.renderCalls.map((call) => call.mode),
      ["default", "tree", "details"],
    );
    assert.deepEqual(
      context.terminal.renderCalls.map((call) => call.options),
      [
        {
          maxLabelClusters: 4,
          ellipsis: "...",
          truncate: true,
          progressFormat: "decimal",
          precision: 3,
          showTrailingZeros: true,
        },
        {
          maxLabelClusters: 4,
          ellipsis: "...",
          truncate: true,
          progressFormat: "decimal",
          precision: 3,
          showTrailingZeros: true,
        },
        {
          maxLabelClusters: 4,
          ellipsis: "...",
          truncate: true,
          progressFormat: "decimal",
          precision: 3,
          showTrailingZeros: true,
        },
      ],
    );
  },
);

Then(
  "every terminal report delivery targeted stdout",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(
      context.terminal.featureCalls.map((call) => call.options),
      [
        { color: "auto", pager: "auto", target: "stdout" },
        { color: "auto", pager: "auto", target: "stdout" },
        { color: "auto", pager: "auto", target: "stdout" },
      ],
    );
  },
);

Then(
  "all mixed composition invocations succeed",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(this.statuses, [0, 0], this.stderr);
    assert.equal(this.stderr, "");
    assert.deepEqual(context.reader.requests, [context.path, context.path]);
  },
);

Then(
  "the mixed composition reports match its fixture",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    const expected = consumerCompositionForCode("mixed-weighted").report;
    assert.deepEqual(context.terminal.renderedReports[0], expected);
    assert.deepEqual(context.json.renderCalls[0]?.report, expected);
  },
);

Then(
  "the mixed composition output options match their fixture",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    const expected = consumerCompositionForCode("mixed-weighted");
    assert.deepEqual(
      context.terminal.renderCalls[0]?.options,
      expected.terminalOptions,
    );
    assert.deepEqual(
      context.json.renderCalls[0]?.options,
      expected.jsonOptions,
    );
    assert.equal(this.terminalStdout, "consumer-terminal:tree:75:checks\n");
    const jsonOutput = jsonExpectedForSignature("1|2|75", context.path);
    assert.deepEqual(JSON.parse(this.jsonStdout ?? ""), jsonOutput);
  },
);

Then(
  "exactly one selected output port was called for each mixed invocation",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.equal(context.terminal.calls.length, 1);
    assert.equal(context.json.calls.length, 1);
    assert.equal(context.terminal.renderedOutputs.length, 1);
    assert.equal(context.json.renderedObjects.length, 1);
  },
);

Then("the information commands succeed", function (this: ConsumerWorld) {
  assert.deepEqual(this.statuses, [0, 0, 0], this.stderr);
  assert.equal(this.stderr, "");
});

Then(
  "the consumer information render received stdout target and no color",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(
      context.terminal.infoRenderCalls.map((call) => call.options),
      [
        { color: "never", target: "stdout" },
        { color: "never", target: "stdout" },
        { color: "never", target: "stdout" },
      ],
    );
  },
);

Then(
  "the consumer received help, version, and dependency documents",
  function (this: ConsumerWorld) {
    const kinds = contextOf(this).terminal.infoDocuments.map((document) =>
      typeof document === "object" && document !== null && "kind" in document
        ? document.kind
        : undefined
    );
    assert.deepEqual(kinds, ["help", "version", "dependencies"]);
  },
);

Then(
  "the consumer information commands did not read Markdown",
  function (this: ConsumerWorld) {
    assert.deepEqual(contextOf(this).reader.requests, []);
  },
);

Then(
  "the consumer file reader received the mapped path",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(context.reader.requests, [context.path]);
  },
);

Then("the consumer terminal output has no diagnostics", function (this: ConsumerWorld) {
  assert.deepEqual(contextOf(this).terminal.diagnosticCalls, []);
});

Then(
  "the consumer terminal warning matched {string}",
  function (this: ConsumerWorld, code: string) {
    const context = contextOf(this);
    assert.equal(context.terminal.diagnosticCalls.length, 1);
    const text = context.terminal.diagnosticCalls[0]?.document.lines[0]?.parts[0]?.text;
    assert.ok(text?.includes("no effect with --json"), code);
  },
);

Then(
  "the consumer terminal error matched {string}",
  function (this: ConsumerWorld, code: string) {
    const context = contextOf(this);
    assert.equal(context.terminal.diagnosticCalls.length, 1, code);
    const part = context.terminal.diagnosticCalls[0]?.document.lines[0]?.parts[0];
    assert.deepEqual(part, {
      text: "howdone: error: --frontmatter-weight must be a decimal strictly between 0 and 1; received: 0\nRun `howdone --help` for usage.",
      semantic: "error",
    });
    assert.equal(this.stdout, "");
    assert.equal(this.stderr, "");
    assert.deepEqual(context.reader.requests, []);
  },
);

Then(
  "the consumer terminal error contains the JSON warning text",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.equal(context.terminal.diagnosticCalls.length, 1);
    const part = context.terminal.diagnosticCalls[0]?.document.lines[0]?.parts[0];
    assert.equal(part?.semantic, "error");
    assert.ok(part?.text.includes("have no effect with --json"));
    assert.equal(this.stdout, "");
    assert.equal(this.stderr, "");
    assert.deepEqual(context.reader.requests, []);
  },
);

Then(
  "consumer output contains the mapped percentage",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    if (this.mode === "json") {
      const expectedResult = context.expected;
      const signature = [
        expectedResult.frontmatterSections,
        expectedResult.frontmatterSections + expectedResult.bodyRootCount,
        expectedResult.percentage,
      ].join("|");
      const expected = jsonExpectedForSignature(signature, context.path);
      assert.deepEqual(JSON.parse(this.stdout), expected);
      return;
    }
    assert.ok(this.stdout.includes(String(context.expected.percentage)));
  },
);

Then(
  "the terminal output port received warning and error semantics",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(this.statuses, [0, 1], this.stderr);
    assert.deepEqual(
      context.terminal.diagnosticCalls.map((call) =>
        call.document.lines[0]?.parts[0],
      ),
      [
        {
          text: "Warning: --frontmatter-weight is invalid without --merge-frontmatter. The value was ignored.",
          semantic: "warning",
        },
        {
          text: "howdone: error: The following options have no effect with --json because JSON contains raw numeric fields and complete labels: --precision.",
          semantic: "error",
        },
      ],
    );
  },
);

Then(
  "the JSON port received no terminal diagnostics",
  function (this: ConsumerWorld) {
    assert.equal(contextOf(this).terminal.diagnosticCalls.length, 2);
    assert.equal(this.terminalStdout, "");
    assert.equal(this.jsonStdout, "");
    assert.equal(this.stderr, "");
  },
);

Then(
  "both diagnostic invocations used automatic color",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(
      context.terminal.diagnosticCalls.map((call) => call.options),
      [
        { color: "auto", pager: "never", target: "stderr" },
        { color: "auto", pager: "never", target: "stderr" },
      ],
    );
  },
);

Then(
  "all capability invocations succeed",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    assert.deepEqual(this.statuses, [0, 0, 0, 0], this.stderr);
    assert.equal(this.stderr, "");
    assert.deepEqual(
      context.reader.requests,
      [context.path, context.path, context.path, context.path],
    );
  },
);

Then(
  "consumer terminal delivery matches its output fixture",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    if (context.capability === undefined) {
      throw new Error("output capability fixture is missing");
    }
    const expected = consumerOutputCapabilityOutputForCode(
      context.capability.code,
    ).terminal;
    assert.equal(context.terminal.label, expected.label);
    assert.notEqual(context.terminal.label, context.json.label);
    assert.equal(context.terminal.renderedOutputs.length, 3);
    for (const output of context.terminal.renderedOutputs) {
      assert.deepEqual(output.lines, expected.content.lines);
    }
    assert.equal(
      context.terminal.featureCalls.length,
      expected.hook ? 3 : 0,
    );
    if (expected.hook) {
      assert.equal(this.terminalStdout, "");
      for (const [index, delivery] of context.terminal.featureCalls.entries()) {
        assert.deepEqual(delivery.options, {
          ...context.capability.request,
          target: "stdout",
        });
        assert.deepEqual(delivery.effective, expected.effective);
        assert.equal(delivery.content, context.terminal.renderedOutputs[index]);
      }
    } else {
      assert.equal(this.terminalStdout, expected.fallbackStdout.repeat(3));
    }
  },
);

Then(
  "consumer JSON delivery matches its output fixture",
  function (this: ConsumerWorld) {
    const context = contextOf(this);
    if (context.capability === undefined) {
      throw new Error("output capability fixture is missing");
    }
    const expected = consumerOutputCapabilityOutputForCode(
      context.capability.code,
    ).json;
    assert.equal(context.json.label, expected.label);
    assert.notEqual(expected.label, context.terminal.label);
    assert.deepEqual(context.json.renderedObjects[0], expected.object);
    assert.equal(
      context.json.featureCalls.length,
      expected.hook ? 1 : 0,
    );
    if (expected.hook) {
      assert.equal(this.jsonStdout, "");
      const delivery = context.json.featureCalls[0];
      assert.ok(delivery);
      assert.deepEqual(delivery.options, context.capability.request);
      assert.deepEqual(delivery.effective, expected.effective);
      assert.equal(
        delivery.content,
        context.json.renderedObjects[0],
      );
    } else {
      const jsonStdout = this.jsonStdout;
      if (jsonStdout === undefined) throw new Error("JSON stdout is missing");
      assert.deepEqual(JSON.parse(jsonStdout), expected.object);
      assert.match(jsonStdout, /\n$/u);
    }
  },
);
