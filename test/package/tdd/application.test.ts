import assert from "node:assert/strict";
import { test } from "node:test";
import { run } from "howdone/application";
import {
  consumerCases,
  consumerOutputCapabilityCases,
  consumerOutputCapabilityOutputForCode,
  createConsumerContext,
  jsonExpectedForSignature,
  type ConsumerParserMode,
} from "../implementations/index.ts";

function ioFor(output: { stdout: string; stderr: string }) {
  return {
    stdout: { write: (chunk: string) => { output.stdout += chunk; } },
    stderr: { write: (chunk: string) => { output.stderr += chunk; } },
  };
}

function capabilityArguments(
  path: string,
  capability: { request: { color: "auto" | "never"; pager: "auto" | "never" } },
  mode: "--tree" | "--json",
): string[] {
  return [
    path,
    mode,
    ...(capability.request.color === "never" ? ["--no-color"] : []),
    ...(capability.request.pager === "never" ? ["--no-pager"] : []),
  ];
}

test("consumer output fixtures define the complete 64-case matrix", () => {
  assert.equal(consumerOutputCapabilityCases.length, 64);
  assert.equal(
    new Set(consumerOutputCapabilityCases.map((fixture) => fixture.code.split("-")[0])).size,
    16,
  );
  assert.equal(
    new Set(
      consumerOutputCapabilityCases.map((fixture) =>
        `${fixture.request.color}/${fixture.request.pager}`
      ),
    ).size,
    4,
  );
});

test("published Core runs the complete consumer pipeline in order", async () => {
  const context = createConsumerContext("yaml-plus-body");
  const events: string[] = [];
  const base = context.dependencies;
  const dependencies: typeof context.dependencies = {
    ...base,
    fileReader: {
      read: async (filePath) => {
        events.push("reader");
        return base.fileReader.read(filePath);
      },
    },
    lexer: {
      lex: (source) => {
        events.push("lexer");
        return base.lexer.lex(source);
      },
    },
    parser: {
      parse: (tokens) => {
        events.push("parser");
        return base.parser.parse(tokens);
      },
    },
    yamlValueParser: {
      parse: (section) => {
        events.push("yaml-parser");
        return base.yamlValueParser.parse(section);
      },
    },
    jsonRenderer: {
      render: (report, options) => {
        events.push("json-renderer");
        return context.json.render(report, options);
      },
    },
  };
  const output = { stdout: "", stderr: "" };

  const status = await run(
    [context.path, "--json"],
    ioFor(output),
    dependencies,
  );

  const expected = jsonExpectedForSignature("1|2|100", context.path);
  assert.equal(status, 0);
  assert.deepEqual(events, [
    "reader",
    "lexer",
    "parser",
    "yaml-parser",
    "json-renderer",
  ]);
  assert.equal(output.stderr, "");
  assert.deepEqual(JSON.parse(output.stdout), expected);
  assert.deepEqual(context.json.renderedObjects[0], expected);
});

async function assertApplicationCase(
  fixture: (typeof consumerCases)[number],
  parserMode: ConsumerParserMode,
): Promise<void> {
  const context = createConsumerContext(
    fixture.code,
    undefined,
    false,
    parserMode,
  );
  const output = { stdout: "", stderr: "" };

  const exitCode = await run(
    [context.path, "--json"],
    ioFor(output),
    context.dependencies,
  );

  assert.equal(exitCode, 0);
  assert.equal(output.stderr, "");
  assert.deepEqual(context.reader.requests, [context.path]);
  assert.equal(context.json.calls.length, 1);
  const signature = [
    fixture.expected.frontmatterSections,
    fixture.expected.frontmatterSections + fixture.expected.bodyRootCount,
    fixture.expected.percentage,
  ].join("|");
  const expected = jsonExpectedForSignature(signature, context.path);
  assert.deepEqual(JSON.parse(output.stdout), expected);
  assert.deepEqual(context.json.renderedObjects[0], expected);
  assert.equal(
    JSON.stringify(JSON.parse(output.stdout)),
    JSON.stringify(expected),
  );
}

for (const parserMode of ["custom", "standard"] as const) {
  for (const fixture of consumerCases) {
    test(
      `published application handles ${fixture.code} with the ${parserMode} parser`,
      () => assertApplicationCase(fixture, parserMode),
    );
  }
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

test("published core routes all information commands through the document port", async () => {
  const context = createConsumerContext("body-two-items");
  const output = { stdout: "", stderr: "" };

  const statuses = [];
  for (const command of ["--help", "--version", "--dependencies"] as const) {
    statuses.push(await run(
      [command, "--no-color", "--no-pager"],
      ioFor(output),
      context.dependencies,
    ));
  }

  assert.deepEqual(statuses, [0, 0, 0]);
  assert.deepEqual(
    context.terminal.infoDocuments.map((document) =>
      typeof document === "object" && document !== null &&
        "kind" in document ? document.kind : undefined
    ),
    ["help", "version", "dependencies"],
  );
  assert.equal(output.stdout, [
    "consumer info:help",
    "consumer info:version",
    "consumer info:dependencies",
    "",
  ].join("\n"));
  assert.equal(output.stderr, "");
  assert.deepEqual(context.reader.requests, []);
});

test("published core returns an error when an information Port fails", async () => {
  const context = createConsumerContext("body-two-items", undefined, true);
  const output = { stdout: "", stderr: "" };
  context.dependencies.infoPort = {
    execute: () => {
      throw new Error("consumer information Port failed");
    },
  };

  const status = await run(
    ["--help"],
    ioFor(output),
    context.dependencies,
  );

  assert.equal(status, 1);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "");
  assert.deepEqual(
    context.terminal.diagnosticCalls.map(({ document }) =>
      document.lines[0]?.parts[0],
    ),
    [{
      text: "howdone: error: consumer information Port failed",
      semantic: "error",
    }],
  );
  assert.deepEqual(context.reader.requests, []);
});

test("published core forwards warning and error documents to the terminal port", async () => {
  const context = createConsumerContext("body-two-items", undefined, true);
  const terminalOutput = { stdout: "", stderr: "" };
  const jsonOutput = { stdout: "", stderr: "" };

  const terminalStatus = await run(
    [context.path, "--frontmatter-weight", "0.5"],
    ioFor(terminalOutput),
    context.dependencies,
  );
  const jsonStatus = await run(
    [context.path, "--json", "--precision", "2", "--strict"],
    ioFor(jsonOutput),
    context.dependencies,
  );

  assert.equal(terminalStatus, 0);
  assert.equal(jsonStatus, 1);
  assert.deepEqual(
    context.terminal.diagnosticCalls.map(({ document }) =>
      document.lines[0]?.parts[0],
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
  assert.deepEqual(
    context.terminal.diagnosticCalls.map(({ options }) => options),
    [
      { color: "auto", pager: "never", target: "stderr" },
      { color: "auto", pager: "never", target: "stderr" },
    ],
  );
  assert.equal(terminalOutput.stderr, "");
  assert.equal(jsonOutput.stderr, "");
  assert.equal(context.terminal.calls[0], "consumer-terminal:default:50:first");
  assert.equal(terminalOutput.stdout, "");
  assert.equal(jsonOutput.stdout, "");
});

test("published core forwards no-color to terminal warning rendering", async () => {
  const context = createConsumerContext("body-only-complete", undefined, true);
  const output = { stdout: "", stderr: "" };

  const status = await run(
    [context.path, "--json", "--precision", "2", "--no-color"],
    ioFor(output),
    context.dependencies,
  );

  assert.equal(status, 0);
  assert.deepEqual(context.terminal.diagnosticCalls.map(({ options }) => options), [
    { color: "never", pager: "never", target: "stderr" },
  ]);
  assert.equal(
    (JSON.parse(output.stdout) as { percentage?: number }).percentage,
    100,
  );
});

test("published core does not let silent suppress a strict warning error", async () => {
  const context = createConsumerContext("body-only-complete", undefined, true);
  const output = { stdout: "", stderr: "" };

  const status = await run(
    [context.path, "--json", "--precision", "2", "--strict", "--silent"],
    ioFor(output),
    context.dependencies,
  );

  assert.equal(status, 1);
  assert.deepEqual(
    context.terminal.diagnosticCalls.map(({ document }) =>
      document.lines[0]?.parts[0],
    ),
    [{
      text: "howdone: error: The following options have no effect with --json because JSON contains raw numeric fields and complete labels: --precision.",
      semantic: "error",
    }],
  );
  assert.deepEqual(context.reader.requests, []);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "");
});

test("published core rejects an invalid frontmatter weight before reading", async () => {
  const context = createConsumerContext("body-two-items", undefined, true);
  const output = { stdout: "", stderr: "" };

  const status = await run(
    [context.path, "--frontmatter-weight", "0", "--silent"],
    ioFor(output),
    context.dependencies,
  );

  assert.equal(status, 1);
  assert.deepEqual(context.reader.requests, []);
  assert.deepEqual(
    context.terminal.diagnosticCalls.map(({ document }) =>
      document.lines[0]?.parts[0],
    ),
    [{
      text: "howdone: error: --frontmatter-weight must be a decimal strictly between 0 and 1; received: 0\nRun `howdone --help` for usage.",
      semantic: "error",
    }],
  );
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "");
});

for (const capability of consumerOutputCapabilityCases) {
  test(
    `published application forwards consumer output capabilities ${capability.code}`,
    async () => {
      const context = createConsumerContext("body-two-items", capability.code);
      const expected = consumerOutputCapabilityOutputForCode(capability.code);
      const terminalOutput = { stdout: "", stderr: "" };
      const jsonOutput = { stdout: "", stderr: "" };

      const terminalStatus = await run(
        capabilityArguments(context.path, capability, "--tree"),
        ioFor(terminalOutput),
        context.dependencies,
      );
      const jsonStatus = await run(
        capabilityArguments(context.path, capability, "--json"),
        ioFor(jsonOutput),
        context.dependencies,
      );

      assert.equal(terminalStatus, 0, capability.code);
      assert.equal(jsonStatus, 0, capability.code);
      assert.equal(terminalOutput.stderr, "");
      assert.equal(jsonOutput.stderr, "");
      assert.equal(context.reader.requests.length, 2);

      assert.equal(context.terminal.label, expected.terminal.label);
      assert.notEqual(context.terminal.label, context.json.label);
      assert.equal(context.terminal.calls.length, 1);
      assert.equal(context.terminal.calls[0], expected.terminal.label);
      assert.equal(context.terminal.renderedOutputs.length, 1);
      assert.deepEqual(
        context.terminal.renderedOutputs[0]?.lines,
        expected.terminal.content.lines,
      );
      assert.equal(
        context.terminal.featureCalls.length,
        expected.terminal.hook ? 1 : 0,
      );
      if (expected.terminal.hook) {
        const delivery = context.terminal.featureCalls[0];
        assert.ok(delivery);
        assert.equal(delivery.content, context.terminal.renderedOutputs[0]);
        assert.deepEqual(delivery.options, {
          ...capability.request,
          target: "stdout",
        });
        assert.deepEqual(delivery.effective, expected.terminal.effective);
        assert.equal(terminalOutput.stdout, "");
      } else {
        assert.equal(context.terminal.print, undefined);
        assert.equal(terminalOutput.stdout, expected.terminal.fallbackStdout);
      }

      assert.equal(context.json.label, expected.json.label);
      assert.notEqual(expected.terminal.label, expected.json.label);
      assert.equal(context.json.calls.length, 1);
      assert.equal(context.json.renderedObjects.length, 1);
      assert.deepEqual(context.json.renderedObjects[0], expected.json.object);
      assert.deepEqual(
        JSON.parse(context.json.calls[0] ?? "null"),
        expected.json.object,
      );
      assert.equal(
        context.json.featureCalls.length,
        expected.json.hook ? 1 : 0,
      );
      if (expected.json.hook) {
        const delivery = context.json.featureCalls[0];
        assert.ok(delivery);
        assert.equal(delivery.content, context.json.renderedObjects[0]);
        assert.deepEqual(delivery.options, capability.request);
        assert.deepEqual(delivery.effective, expected.json.effective);
        assert.equal(jsonOutput.stdout, "");
      } else {
        assert.equal(context.json.writeWithTerminalFeatures, undefined);
        assert.deepEqual(JSON.parse(jsonOutput.stdout), expected.json.object);
        assert.match(jsonOutput.stdout, /\n$/u);
      }
    },
  );
}
