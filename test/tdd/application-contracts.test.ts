import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { defaultTomlValueParser } from "../../src/adapters/frontmatter/toml-value-parser.ts";
import { defaultYamlValueParser } from "../../src/adapters/frontmatter/yaml-value-parser.ts";
import { defaultRemarkLexer } from "../../src/adapters/markdown/remark-lexer.ts";
import { run } from "howdone/application";
import { TypedAstParser } from "howdone/std";
import type {
  InfoDocument,
  InfoDocumentPort,
  JsonObject,
  JsonOutputOptions,
  JsonOutputPort,
  ProgressReport,
  ResolvedDisplayOptions,
  TerminalOutput,
  TerminalOutputLine,
  TerminalOutputOptions,
  TerminalOutputPort,
} from "howdone";

interface ProgressSnapshot {
  rootCount: number;
  explicitCheckboxCount: number;
  implicitNodeCount: number;
  nodeCount: number;
  completedEquivalent: number;
  progress: number;
  percentage: number;
  rootLabels: string[];
}

interface FrontmatterSnapshot extends ProgressSnapshot {
  format: "yaml" | "toml";
}

interface ReportSnapshot {
  sourcePath: string;
  frontmatter: FrontmatterSnapshot[];
  frontmatterPresent: boolean;
  markdownPresent: boolean;
  presentation: "separate" | "merged";
  frontmatterWeight: number | null;
  markdown: ProgressSnapshot;
  progress: ProgressSnapshot;
}

interface DiagnosticExpectation {
  kind: "warning" | "error";
  message: string;
  options: TerminalOutputOptions;
}

interface TerminalExpectation {
  mode: "default" | "tree" | "details";
  options: ResolvedDisplayOptions;
  print: Array<{
    tag: "report" | "warning" | "error";
    options: TerminalOutputOptions;
  }>;
}

interface JsonExpectation {
  renderOptions: ResolvedDisplayOptions | null;
  output: JsonObject;
  delivery: JsonOutputOptions;
}

interface ApplicationExpectation {
  status: number;
  readerPaths: string[];
  diagnostics: DiagnosticExpectation[];
  report?: ReportSnapshot;
  terminal?: TerminalExpectation;
  json?: JsonExpectation;
}

interface ApplicationCase {
  id: string;
  source: string;
  argv: string[];
  expected: ApplicationExpectation;
}

interface ApplicationFixtures {
  cases: ApplicationCase[];
}

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/application-contracts.json", import.meta.url), "utf8"),
) as ApplicationFixtures;

class TestTerminalOutput implements TerminalOutput {
  readonly lines: readonly TerminalOutputLine[] = [];
  readonly tag: "report" | "warning" | "error" | "info";

  constructor(tag: "report" | "warning" | "error" | "info") {
    this.tag = tag;
  }

  writeTo(destination: { write(chunk: string): void }): void {
    destination.write(`${this.tag}\n`);
  }
}

interface TerminalObservation {
  renderedReports: Array<{
    mode: "default" | "tree" | "details";
    report: ProgressReport;
    options: ResolvedDisplayOptions;
    output: TestTerminalOutput;
  }>;
  diagnostics: Array<{
    kind: "warning" | "error";
    message: string;
    output: TestTerminalOutput;
  }>;
  print: Array<{
    tag: TestTerminalOutput["tag"];
    options: TerminalOutputOptions | undefined;
  }>;
}

class RecordingTerminalRenderer
  implements TerminalOutputPort<TestTerminalOutput, InfoDocument> {
  readonly observation: TerminalObservation = {
    renderedReports: [],
    diagnostics: [],
    print: [],
  };

  render(
    mode: "default" | "tree" | "details",
    report: ProgressReport,
    options: ResolvedDisplayOptions,
  ): TestTerminalOutput {
    const output = new TestTerminalOutput("report");
    this.observation.renderedReports.push({ mode, report, options, output });
    return output;
  }

  renderDocument(): TestTerminalOutput {
    return new TestTerminalOutput("info");
  }

  renderWarning(document: { message: string }): TestTerminalOutput {
    const output = new TestTerminalOutput("warning");
    this.observation.diagnostics.push({
      kind: "warning",
      message: document.message,
      output,
    });
    return output;
  }

  renderError(document: { message: string }): TestTerminalOutput {
    const output = new TestTerminalOutput("error");
    this.observation.diagnostics.push({
      kind: "error",
      message: document.message,
      output,
    });
    return output;
  }

  print(content: TestTerminalOutput, options?: TerminalOutputOptions): void {
    this.observation.print.push({ tag: content.tag, options });
  }
}

interface JsonObservation {
  renders: Array<{
    report: ProgressReport;
    options: ResolvedDisplayOptions | undefined;
    output: JsonObject;
  }>;
  deliveries: Array<{
    content: JsonObject;
    options: JsonOutputOptions | undefined;
  }>;
}

class RecordingJsonRenderer implements JsonOutputPort {
  readonly observation: JsonObservation = { renders: [], deliveries: [] };
  private readonly expected: JsonObject;

  constructor(expected: JsonObject) {
    this.expected = expected;
  }

  render(
    report: ProgressReport,
    options?: ResolvedDisplayOptions,
  ): JsonObject {
    this.observation.renders.push({
      report,
      options,
      output: this.expected,
    });
    return this.expected;
  }

  writeWithTerminalFeatures(
    content: JsonObject,
    options?: JsonOutputOptions,
  ): void {
    this.observation.deliveries.push({ content, options });
  }
}

function reportSnapshot(report: ProgressReport): ReportSnapshot {
  const progressSnapshot = (result: ProgressReport["progress"]): ProgressSnapshot => ({
    rootCount: result.rootCount,
    explicitCheckboxCount: result.explicitCheckboxCount,
    implicitNodeCount: result.implicitNodeCount,
    nodeCount: result.nodeCount,
    completedEquivalent: result.completedEquivalent,
    progress: result.progress,
    percentage: result.percentage,
    rootLabels: result.roots.map((root) => root.label),
  });
  return {
    sourcePath: report.source.path,
    frontmatter: (report.frontmatter ?? []).map((section) => ({
      format: section.format,
      ...progressSnapshot(section.progress),
    })),
    frontmatterPresent: report.frontmatterPresent ?? false,
    markdownPresent: report.markdownPresent ?? false,
    presentation: report.presentation ?? "separate",
    frontmatterWeight: report.frontmatterWeight ?? null,
    markdown: progressSnapshot(report.markdown ?? report.progress),
    progress: progressSnapshot(report.progress),
  };
}

function diagnosticSnapshot(
  renderer: RecordingTerminalRenderer,
): DiagnosticExpectation[] {
  return renderer.observation.diagnostics.map((diagnostic, index) => ({
    kind: diagnostic.kind,
    message: diagnostic.message,
    options: renderer.observation.print[index]?.options ?? {},
  }));
}

function ioFor(output: { stdout: string; stderr: string }) {
  return {
    stdout: { write: (chunk: string) => { output.stdout += chunk; } },
    stderr: { write: (chunk: string) => { output.stderr += chunk; } },
  };
}

for (const fixture of fixtures.cases) {
  test(`TDD application contract ${fixture.id} keeps combined options observable`, async () => {
    const output = { stdout: "", stderr: "" };
    const readerPaths: string[] = [];
    const terminal = new RecordingTerminalRenderer();
    const jsonExpected = fixture.expected.json?.output ?? { case: "unused" };
    const json = new RecordingJsonRenderer(jsonExpected);
    const infoPort: InfoDocumentPort = {
      execute: () => ({}),
    };
    const status = await run(
      fixture.argv,
      ioFor(output),
      {
        lexer: defaultRemarkLexer,
        parser: new TypedAstParser(),
        yamlValueParser: defaultYamlValueParser,
        tomlValueParser: defaultTomlValueParser,
        fileReader: {
          read: async (filePath: string) => {
            readerPaths.push(filePath);
            return fixture.source;
          },
        },
        terminalRenderer: terminal,
        jsonRenderer: json,
        infoPort,
      },
    );

    assert.equal(status, fixture.expected.status);
    assert.deepEqual(readerPaths, fixture.expected.readerPaths);
    assert.deepEqual(diagnosticSnapshot(terminal), fixture.expected.diagnostics);
    assert.equal(output.stdout, "");
    assert.equal(output.stderr, "");

    if (fixture.expected.report !== undefined) {
      const report = terminal.observation.renderedReports[0]?.report ??
        json.observation.renders[0]?.report;
      assert.ok(report);
      assert.deepEqual(reportSnapshot(report), fixture.expected.report);
    }

    if (fixture.expected.terminal !== undefined) {
      assert.equal(terminal.observation.renderedReports.length, 1);
      const rendered = terminal.observation.renderedReports[0];
      assert.ok(rendered);
      assert.equal(rendered.mode, fixture.expected.terminal.mode);
      assert.deepEqual(rendered.options, fixture.expected.terminal.options);
      assert.deepEqual(terminal.observation.print, fixture.expected.terminal.print);
      assert.equal(json.observation.renders.length, 0);
    } else {
      assert.equal(terminal.observation.renderedReports.length, 0);
    }

    if (fixture.expected.json !== undefined) {
      assert.equal(json.observation.renders.length, 1);
      const rendered = json.observation.renders[0];
      assert.ok(rendered);
      assert.deepEqual(
        rendered.options ?? null,
        fixture.expected.json.renderOptions,
      );
      assert.equal(rendered.output, fixture.expected.json.output);
      assert.deepEqual(json.observation.deliveries, [{
        content: fixture.expected.json.output,
        options: fixture.expected.json.delivery,
      }]);
      assert.equal(terminal.observation.renderedReports.length, 0);
    } else {
      assert.equal(json.observation.renders.length, 0);
    }
  });
}
