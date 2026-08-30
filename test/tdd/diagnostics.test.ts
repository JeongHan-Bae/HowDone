import assert from "node:assert/strict";
import { test } from "node:test";
import { run } from "howdone/application";
import { defaultTomlValueParser } from "../../src/adapters/frontmatter/toml-value-parser.ts";
import { defaultYamlValueParser } from "../../src/adapters/frontmatter/yaml-value-parser.ts";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import { InkTerminalRenderer } from "../../src/adapters/output/ink-terminal-renderer.ts";
import {
  terminalColorForSemantic,
  terminalOutputText,
} from "../../src/adapters/output/terminal-colors.ts";
import { TerminalOutputDocument } from "../../src/adapters/output/terminal-output.ts";
import {
  createDependenciesDocument,
  createVersionDocument,
  HELP_SECTIONS,
  renderCliDocument,
  renderHelpOutput,
} from "../../src/adapters/output/cli-help.ts";
import type { CliInfoDocument } from "../../src/adapters/output/cli-help.ts";
import { TypedAstParser } from "howdone";
import type {
  ErrorDocument,
  InfoCommand,
  InfoDocument,
  InfoDocumentPort,
  JsonObject,
  JsonOutputPort,
  TerminalOutput,
  TerminalOutputOptions,
  TerminalOutputPort,
  WarningDocument,
} from "howdone";
import type {
  CliDependencies,
  CliIO,
} from "howdone/application";

interface CapturedOutput {
  stdout: string;
  stderr: string;
}

interface TestInfoDocument extends InfoDocument {
  readonly kind: "help" | "version" | "dependencies";
}

interface PrintCall {
  content: TerminalOutput;
  options: TerminalOutputOptions | undefined;
}

interface FakeStream {
  stream: NodeJS.WriteStream;
  text: () => string;
}

const terminalOutput: TerminalOutput = {
  lines: [{ parts: [{ text: "terminal output" }] }],
  writeTo: (destination) => { destination.write("terminal output\n"); },
};

const warningOutput: TerminalOutput = {
  lines: [{ parts: [{ text: "warning output", semantic: "warning" }] }],
  writeTo: (destination) => { destination.write("warning output\n"); },
};

const errorOutput: TerminalOutput = {
  lines: [{ parts: [{ text: "error output", semantic: "error" }] }],
  writeTo: (destination) => { destination.write("error output\n"); },
};

const helpOutput: TerminalOutput = {
  lines: [{ parts: [{ text: "help output" }] }],
  writeTo: (destination) => { destination.write("help output\n"); },
};

const versionOutput: TerminalOutput = {
  lines: [{ parts: [{ text: "version output" }] }],
  writeTo: (destination) => { destination.write("version output\n"); },
};

const dependenciesOutput: TerminalOutput = {
  lines: [{ parts: [{ text: "dependencies output" }] }],
  writeTo: (destination) => { destination.write("dependencies output\n"); },
};

const jsonOutput: JsonObject = { result: true };

function ioFor(output: CapturedOutput): CliIO {
  return {
    stdout: { write: (chunk: string) => { output.stdout += chunk; } },
    stderr: { write: (chunk: string) => { output.stderr += chunk; } },
  };
}

function fakeStream(isTTY: boolean): FakeStream {
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

function infoPort(): InfoDocumentPort<TestInfoDocument> {
  return {
    execute: (command) => ({ kind: command }),
  };
}

function dependenciesFor(
  terminalRenderer: TerminalOutputPort<TerminalOutput, TestInfoDocument>,
  jsonRenderer: JsonOutputPort,
  documents: InfoDocumentPort<TestInfoDocument> = infoPort(),
): CliDependencies<TerminalOutput, TestInfoDocument> {
  return {
    lexer: defaultRemarkLexer,
    parser: new TypedAstParser(),
    yamlValueParser: defaultYamlValueParser,
    tomlValueParser: defaultTomlValueParser,
    fileReader: { read: async () => "- [x] done\n" },
    terminalRenderer,
    jsonRenderer,
    infoPort: documents,
  };
}

function baseTerminalRenderer(): TerminalOutputPort<
  TerminalOutput,
  TestInfoDocument
> {
  return {
    render: () => terminalOutput,
    renderDocument: (document) => document.kind === "help" ? helpOutput :
      document.kind === "version" ? versionOutput : dependenciesOutput,
    renderWarning: () => warningOutput,
    renderError: () => errorOutput,
  };
}

test("TDD core forwards warning semantics to TerminalOutputPort", async () => {
  const warningDocuments: WarningDocument[] = [];
  const printCalls: PrintCall[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderWarning: (document) => {
      warningDocuments.push(document);
      return warningOutput;
    },
    print: (content, options) => { printCalls.push({ content, options }); },
  };

  const status = await run(
    ["tasks.md", "--tree", "--frontmatter-weight", "0.5"],
    ioFor(output),
    dependenciesFor(terminalRenderer, { render: () => jsonOutput }),
  );

  assert.equal(status, 0);
  assert.deepEqual(warningDocuments, [{
    message: "--frontmatter-weight is invalid without --merge-frontmatter. The value was ignored.",
  }]);
  assert.equal(printCalls[0]?.content, warningOutput);
  assert.deepEqual(printCalls[0]?.options, {
    color: "auto",
    pager: "never",
    target: "stderr",
  });
  assert.equal(output.stderr, "");
  assert.equal(printCalls[1]?.content, terminalOutput);
  assert.deepEqual(printCalls[1]?.options, {
    color: "auto",
    pager: "auto",
    target: "stdout",
  });
});

test("TDD core keeps JSON data separate from terminal error documents", async () => {
  const errorDocuments: ErrorDocument[] = [];
  const printCalls: PrintCall[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderError: (document) => {
      errorDocuments.push(document);
      return errorOutput;
    },
    print: (content, options) => { printCalls.push({ content, options }); },
  };

  const status = await run(
    ["tasks.md", "--json", "--precision", "2", "--strict"],
    ioFor(output),
    dependenciesFor(terminalRenderer, { render: () => jsonOutput }),
  );

  assert.equal(status, 1);
  assert.deepEqual(errorDocuments, [{
    message: "The following options have no effect with --json because JSON contains raw numeric fields and complete labels: --precision.",
  }]);
  assert.deepEqual(printCalls, [{
    content: errorOutput,
    options: { color: "auto", pager: "never", target: "stderr" },
  }]);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "");
});

test("TDD core sends the CLI information document to terminal rendering", async () => {
  const helpDocumentsReceived: TestInfoDocument[] = [];
  const printCalls: PrintCall[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const fullDocument = { kind: "help" as const };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderDocument: (document) => {
      helpDocumentsReceived.push(document);
      return helpOutput;
    },
    print: (content, options) => { printCalls.push({ content, options }); },
  };
  const documents: InfoDocumentPort<TestInfoDocument> = {
    execute: (command) => command === "help"
      ? fullDocument
      : { kind: command },
  };

  const status = await run(
    ["--help"],
    ioFor(output),
    dependenciesFor(terminalRenderer, { render: () => jsonOutput }, documents),
  );

  assert.equal(status, 0);
  assert.deepEqual(helpDocumentsReceived, [fullDocument]);
  assert.deepEqual(printCalls, [{
    content: helpOutput,
    options: { color: "auto", pager: "auto", target: "stdout" },
  }]);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "");
});

test("TDD core converts an information Port failure into an error document", async () => {
  const errorDocuments: ErrorDocument[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderError: (document) => {
      errorDocuments.push(document);
      return errorOutput;
    },
  };
  const documents: InfoDocumentPort<TestInfoDocument> = {
    execute: () => {
      throw new Error("information Port failed");
    },
  };

  const status = await run(
    ["--help"],
    ioFor(output),
    dependenciesFor(terminalRenderer, { render: () => jsonOutput }, documents),
  );

  assert.equal(status, 1);
  assert.deepEqual(errorDocuments, [{ message: "information Port failed" }]);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "error output\n");
});

test("TDD core converts information rendering failures into an error document", async () => {
  const errorDocuments: ErrorDocument[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderDocument: () => {
      throw new Error("information rendering failed");
    },
    renderError: (document) => {
      errorDocuments.push(document);
      return errorOutput;
    },
  };

  const status = await run(
    ["--version"],
    ioFor(output),
    dependenciesFor(terminalRenderer, { render: () => jsonOutput }),
  );

  assert.equal(status, 1);
  assert.deepEqual(errorDocuments, [{ message: "information rendering failed" }]);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "error output\n");
});

test("TDD core forwards no-color to information rendering before printing", async () => {
  const renderOptions: TerminalOutputOptions[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderDocument: (_document, options) => {
      if (options !== undefined) renderOptions.push(options);
      return helpOutput;
    },
  };

  const status = await run(
    ["--help", "--no-color"],
    ioFor(output),
    dependenciesFor(terminalRenderer, { render: () => jsonOutput }),
  );

  assert.equal(status, 0);
  assert.deepEqual(renderOptions, [{ color: "never", target: "stdout" }]);
});

test("TDD core routes every information command to the same document output port", async () => {
  const requestedCommands: InfoCommand[] = [];
  const received: TestInfoDocument[] = [];
  const printCalls: PrintCall[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const documents: InfoDocumentPort<TestInfoDocument> = {
    execute: (command) => {
      requestedCommands.push(command);
      return { kind: command };
    },
  };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderDocument: (document) => {
      received.push(document);
      return document.kind === "version"
        ? versionOutput
        : document.kind === "dependencies"
        ? dependenciesOutput
        : helpOutput;
    },
    print: (content, options) => { printCalls.push({ content, options }); },
  };

  const statuses = [];
  for (const command of ["--help", "--version", "--dependencies"] as const) {
    statuses.push(await run(
      [command, "--no-color", "--no-pager"],
      ioFor(output),
      dependenciesFor(terminalRenderer, { render: () => jsonOutput }, documents),
    ));
  }

  assert.deepEqual(statuses, [0, 0, 0]);
  assert.deepEqual(requestedCommands, ["help", "version", "dependencies"]);
  assert.deepEqual(received.map((document) => document.kind), [
    "help",
    "version",
    "dependencies",
  ]);
  assert.deepEqual(printCalls, [
    {
      content: helpOutput,
      options: { color: "never", pager: "never", target: "stdout" },
    },
    {
      content: versionOutput,
      options: { color: "never", pager: "never", target: "stdout" },
    },
    {
      content: dependenciesOutput,
      options: { color: "never", pager: "never", target: "stdout" },
    },
  ]);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "");
});

test("TDD core keeps argument usage guidance inside one error document", async () => {
  const errorDocuments: ErrorDocument[] = [];
  const printCalls: PrintCall[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderError: (document) => {
      errorDocuments.push(document);
      return errorOutput;
    },
    print: (content, options) => { printCalls.push({ content, options }); },
  };

  const status = await run(
    ["--unknown"],
    ioFor(output),
    dependenciesFor(terminalRenderer, { render: () => jsonOutput }),
  );

  assert.equal(status, 1);
  assert.deepEqual(errorDocuments, [{
    message: "Unknown option: --unknown\nRun `howdone --help` for usage.",
  }]);
  assert.deepEqual(printCalls, [{
    content: errorOutput,
    options: { color: "auto", pager: "never", target: "stderr" },
  }]);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "");
});

test("TDD core falls back to IO streams when terminal print is absent", async () => {
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const status = await run(
    ["tasks.md", "--frontmatter-weight", "0.5"],
    ioFor(output),
    dependenciesFor(baseTerminalRenderer(), { render: () => jsonOutput }),
  );

  assert.equal(status, 0);
  assert.equal(output.stderr, "warning output\n");
  assert.equal(output.stdout, "terminal output\n");
});

test("TDD core sends reader failures to stderr as error output", async () => {
  const errorDocuments: ErrorDocument[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderError: (document) => {
      errorDocuments.push(document);
      return errorOutput;
    },
  };
  const dependencies = {
    ...dependenciesFor(terminalRenderer, { render: () => jsonOutput }),
    fileReader: {
      read: async () => {
        throw new Error("reader failed");
      },
    },
  };

  const status = await run(
    ["tasks.md"],
    ioFor(output),
    dependencies,
  );

  assert.equal(status, 1);
  assert.deepEqual(errorDocuments, [{ message: "reader failed" }]);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "error output\n");
});

test("TDD strict warning handling takes precedence over silent suppression", async () => {
  const errorDocuments: ErrorDocument[] = [];
  const output: CapturedOutput = { stdout: "", stderr: "" };
  const terminalRenderer: TerminalOutputPort<
    TerminalOutput,
    TestInfoDocument
  > = {
    ...baseTerminalRenderer(),
    renderError: (document) => {
      errorDocuments.push(document);
      return errorOutput;
    },
  };

  const status = await run(
    ["tasks.md", "--json", "--precision", "2", "--strict", "--silent"],
    ioFor(output),
    dependenciesFor(terminalRenderer, { render: () => jsonOutput }),
  );

  assert.equal(status, 1);
  assert.deepEqual(errorDocuments, [{
    message: "The following options have no effect with --json because JSON contains raw numeric fields and complete labels: --precision.",
  }]);
  assert.equal(output.stdout, "");
  assert.equal(output.stderr, "error output\n");
});

test("TDD CLI styles code, warning, and error terminal semantics", async () => {
  assert.equal(terminalColorForSemantic("code"), "magenta");
  assert.notEqual(terminalColorForSemantic("code"), terminalColorForSemantic("accent"));
  assert.equal(terminalColorForSemantic("warning"), "yellow");
  assert.equal(terminalColorForSemantic("error"), "red");

  const document = new TerminalOutputDocument([{
    parts: [
      { text: "Run " },
      { text: "vvv", semantic: "code" },
      { text: " for usage." },
    ],
  }]);
  assert.equal(document.toString(), "Run `vvv` for usage.\n");
  assert.equal(terminalOutputText(document, false), "Run `vvv` for usage.\n");

  const terminalStderr = fakeStream(true);
  const renderer = new InkTerminalRenderer({ stderr: terminalStderr.stream });
  await renderer.print(document, { color: "auto", target: "stderr" });
  const warning = renderer.renderWarning({ message: "terminal warning" });
  await renderer.print(warning, { target: "stderr" });
  const error = renderer.renderError({ message: "terminal error" });
  await renderer.print(error, { target: "stderr" });

  const terminalText = terminalStderr.text();
  assert.match(terminalText, /\u001b\[35mvvv/u);
  assert.doesNotMatch(terminalText, /\u001b\[1m/u);
  assert.doesNotMatch(terminalText, /`vvv`/u);
  assert.match(terminalText, /\u001b\[33mWarning: terminal warning/u);
  assert.match(terminalText, /\u001b\[31mhowdone: error: terminal error/u);
});

test("TDD CLI styles help titles and references while keeping code unbolded", async () => {
  const stdout = fakeStream(true);
  const renderer = new InkTerminalRenderer({
    stdout: stdout.stream,
    documentRenderer: () => renderHelpOutput(
      HELP_SECTIONS,
      [{ name: "chalk", version: "5.6.2" }],
    ),
  });
  const help = renderer.renderDocument({});
  await renderer.print(help, { color: "auto", pager: "never", target: "stdout" });

  const text = stdout.text();
  assert.match(text, /\u001b\[36mUsage:/u);
  assert.match(text, /\u001b\[35m/u);
  assert.match(text, /\u001b\[35mchalk@5\.6\.2/u);
  assert.doesNotMatch(text, /\u001b\[1m/u);
  assert.doesNotMatch(text, /`--format`/u);
});

test("TDD CLI styles version as accent and dependencies as references", async () => {
  const stdout = fakeStream(true);
  const renderer = new InkTerminalRenderer<CliInfoDocument>({
    stdout: stdout.stream,
    documentRenderer: (document, options) => renderCliDocument(document, {
      columns: options.columns,
      codeMarkers: options.codeMarkers,
    }),
  });

  const version = renderer.renderDocument(
    createVersionDocument("0.1.2"),
    { color: "auto", pager: "never", target: "stdout" },
  );
  await renderer.print(version, {
    color: "auto",
    pager: "never",
    target: "stdout",
  });
  const dependencies = renderer.renderDocument(
    createDependenciesDocument([{ name: "chalk", version: "5.6.2" }]),
    { color: "auto", pager: "never", target: "stdout" },
  );
  await renderer.print(dependencies, {
    color: "auto",
    pager: "never",
    target: "stdout",
  });

  const text = stdout.text();
  assert.match(text, /\u001b\[36m0.1.2/u);
  assert.match(text, /\u001b\[35mchalk@5.6.2/u);
  assert.doesNotMatch(text, /`chalk@5.6.2`/u);
  assert.doesNotMatch(text, /\u001b\[1m/u);
});
