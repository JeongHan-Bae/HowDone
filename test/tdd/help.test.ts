import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CLI_COMMANDS,
  CLI_GLOBAL_OPTIONS,
  CLI_OPTIONS,
  CLI_USAGE,
} from "../../src/application/cli/args.ts";
import {
  HELP_SECTIONS,
  createDependenciesDocument,
  createVersionDocument,
  renderCliDocument,
  renderHelpOutput,
  renderHelpText,
} from "../../src/adapters/output/cli-help.ts";
import type { HelpSections } from "../../src/adapters/output/cli-help.ts";
import { terminalOutputText } from "../../src/adapters/output/terminal-colors.ts";
import {
  TerminalOutputDocument,
  type TerminalOutputPart as CliTerminalOutputPart,
} from "../../src/adapters/output/terminal-output.ts";
import { terminalVisualWidth } from "../../src/adapters/output/terminal-width.ts";
import { packageRuntimeDependencies } from "../../src/adapters/runtime/node-package-version.ts";

interface HelpLayoutOptions {
  columns: number;
  codeMarkers?: boolean;
  visualWidth?: (value: string) => number;
}

const renderHelpAtWidth = renderHelpText as unknown as (
  sections: HelpSections,
  runtimeDependencies: typeof packageRuntimeDependencies,
  syntaxReferencePath: string | undefined,
  options: HelpLayoutOptions,
) => string;

function sectionText(helpText: string, title: string, nextTitle: string): string {
  const start = helpText.indexOf(`${title}:`);
  const end = helpText.indexOf(`\n\n${nextTitle}:`, start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return helpText.slice(start, end);
}

interface PackageMetadata {
  dependencies: Record<string, string>;
}

const packageMetadata = JSON.parse(
  readFileSync(new URL("../../packages/cli/package.json", import.meta.url), "utf8"),
) as PackageMetadata;

const expectedRuntimeDependencies = Object.entries(
  packageMetadata.dependencies,
).map(([name, version]) => ({ name, version }));

test("TDD help content keeps usage, options, and sections structured", () => {
  assert.equal(typeof HELP_SECTIONS.usage, "string");
  assert.deepEqual(HELP_SECTIONS.usage.split("\n"), CLI_USAGE);
  assert.deepEqual(
    HELP_SECTIONS.commands.map(({ command }) => command),
    CLI_COMMANDS,
  );
  assert.deepEqual(
    HELP_SECTIONS.options.map(({ command, argument }) => ({ command, argument })),
    CLI_OPTIONS,
  );
  assert.deepEqual(
    HELP_SECTIONS.globalOptions.map(({ command, argument }) => ({ command, argument })),
    CLI_GLOBAL_OPTIONS,
  );
  assert.equal(Array.isArray(HELP_SECTIONS.options), true);
  assert.ok(HELP_SECTIONS.options.length > 0);
  assert.equal(
    HELP_SECTIONS.options.some((option) =>
      option.command === "-h, --help" || option.command === "-v, --version"
    ),
    false,
  );

  const format = HELP_SECTIONS.options.find(
    (option) => option.command === "--format",
  );
  const percentage = HELP_SECTIONS.options.find(
    (option) =>
      Array.isArray(option.command) && option.command.includes("--percentage"),
  );
  const decimal = HELP_SECTIONS.options.find(
    (option) =>
      Array.isArray(option.command) && option.command.includes("--decimal"),
  );
  assert.deepEqual(format?.argument, "decimal|percentage");
  assert.deepEqual(percentage?.argument, "");
  assert.deepEqual(decimal?.argument, "");
  const helpText = renderHelpText(HELP_SECTIONS, packageRuntimeDependencies);
  assert.match(helpText, /^Usage:\n/u);
  assert.match(helpText, /Syntax reference:/u);
  assert.match(helpText, /Node\.js 18\.18 or newer is required\./u);
  assert.match(helpText, /Runtime dependencies:/u);
  assert.match(
    helpText,
    /These dependencies are installed with the published package\./u,
  );
  assert.doesNotMatch(helpText, /tsx/iu);
  assert.deepEqual(packageRuntimeDependencies, expectedRuntimeDependencies);
  for (const dependency of expectedRuntimeDependencies) {
    assert.ok(helpText.includes(`${dependency.name}@${dependency.version}`));
  }
  assert.equal(
    helpText,
    renderHelpText(HELP_SECTIONS, packageRuntimeDependencies),
  );
  assert.match(
    renderHelpText(
      HELP_SECTIONS,
      packageRuntimeDependencies,
      "/installed/howdone-cli/docs/syntax.md",
    ),
    /\/installed\/howdone-cli\/docs\/syntax\.md/u,
  );

});

test("TDD help keeps headings, references, and code as separate semantics", () => {
  const document = renderHelpOutput(HELP_SECTIONS, [
    { name: "chalk", version: "5.6.2" },
  ]);
  const titleLines = document.lines.filter((line) =>
    line.parts.length === 1 && line.parts[0]?.semantic === "accent"
  );
  assert.deepEqual(
    titleLines.map((line) => line.parts[0]?.text),
    [
      "Usage:",
      "Commands:",
      "Options:",
      "Global options:",
      "Supported paths:",
      "Calculation rules:",
      "Frontmatter display:",
      "Default output:",
      "Display defaults:",
      "Option policy:",
      "Syntax reference:",
      "Requirements:",
    ],
  );

  const codeText = document.lines
    .flatMap((line) => line.parts)
    .filter((part) => part.semantic === "code" &&
      (part as CliTerminalOutputPart).terminalPresentation !== "reference")
    .map((part) => part.text);
  for (const value of [
    "howdone <markdown-path> [options]",
    "howdone --help",
    "howdone --version",
    "howdone --dependencies",
    "--help",
    "-h",
    "--format",
    "decimal|percentage",
    "--precision",
    "N",
    "--json",
    "--option=N",
    "--silent",
    "-s",
    "--strict",
    "--no-color",
    "--no-pager",
  ]) {
    assert.ok(codeText.includes(value), `missing code semantic: ${value}`);
  }

  const referenceText = document.lines
    .flatMap((line) => line.parts)
    .filter((part) => part.semantic === "code" &&
      (part as CliTerminalOutputPart).terminalPresentation === "reference")
    .map((part) => part.text);
  for (const value of [
    "docs/syntax.md",
    "chalk@5.6.2",
  ]) {
    assert.ok(
      referenceText.some((text) => text.includes(value)),
      `missing reference semantic: ${value}`,
    );
  }

  const defaultOutput = document.lines.find((line) =>
    line.parts.some((part) => part.text.includes("prints the overall percentage."))
  );
  assert.deepEqual(
    defaultOutput?.parts.map((part) => [
      part.text,
      part.semantic,
      (part as CliTerminalOutputPart).terminalPresentation,
    ]),
    [
      ["  ", undefined, undefined],
      ["With only a Markdown path, ", undefined, undefined],
      ["howdone", "code", undefined],
      [
        " prints the overall percentage. The same concise percentage is used for a body-only or one-section frontmatter-only document. Expanded source sections appear when multiple source components exist; an explicit merge requests one combined result.",
        undefined,
        undefined,
      ],
    ],
  );

  const plainOutput = terminalOutputText(
    new TerminalOutputDocument(document.lines),
    false,
  );
  assert.match(plainOutput, /`howdone --help`/u);
  assert.match(plainOutput, /`--format` `decimal\|percentage`/u);
  assert.doesNotMatch(plainOutput, /`docs\/syntax\.md`|`chalk@5\.6\.2`/u);
  assert.match(plainOutput, /docs\/syntax\.md/u);
  assert.match(plainOutput, /chalk@5\.6\.2/u);
  assert.equal(
    new TerminalOutputDocument([{
      parts: [{
        text: "--json",
        semantic: "code",
        terminalPresentation: "reference",
      }],
    }]).toString(),
    "--json\n",
  );
});

test("TDD CLI keeps version and dependencies as information-document semantics", () => {
  const version = renderCliDocument(createVersionDocument("0.1.2"));
  assert.deepEqual(version.lines, [{
    parts: [{ text: "0.1.2", semantic: "accent" }],
  }]);

  const dependencies = renderCliDocument(createDependenciesDocument([
    { name: "chalk", version: "5.6.2" },
  ]));
  assert.deepEqual(dependencies.lines, [{
    parts: [{
      text: "chalk@5.6.2",
      semantic: "code",
      terminalPresentation: "reference",
    }],
  }]);

  assert.equal(
    terminalOutputText(new TerminalOutputDocument(version.lines), false),
    "0.1.2\n",
  );
  assert.equal(
    terminalOutputText(new TerminalOutputDocument(dependencies.lines), false),
    "chalk@5.6.2\n",
  );
});

test("TDD Help renders only explicitly declared semantic parts", () => {
  const sections: HelpSections = {
    ...HELP_SECTIONS,
    defaultOutput: [[
      "Plain --json stays plain; ",
      { type: "option", text: "--json" },
      " is code, while ",
      { type: "file", text: "docs/syntax.md" },
      " is a reference.",
    ]],
  };
  const document = renderHelpOutput(sections, []);
  const line = document.lines.find((candidate) =>
    candidate.parts.some((part) => part.text === "Plain --json stays plain; ")
  );

  assert.deepEqual(
    line?.parts.map((part) => [
      part.text,
      part.semantic,
      (part as CliTerminalOutputPart).terminalPresentation,
    ]),
    [
      ["  ", undefined, undefined],
      ["Plain --json stays plain; ", undefined, undefined],
      ["--json", "code", undefined],
      [" is code, while ", undefined, undefined],
      ["docs/syntax.md", "code", "reference"],
      [" is a reference.", undefined, undefined],
    ],
  );
});

test("TDD help layout keeps wrapped descriptions in the description column", () => {
  const helpText = renderHelpAtWidth(
    HELP_SECTIONS,
    packageRuntimeDependencies,
    undefined,
    { columns: 60 },
  );
  const options = sectionText(helpText, "Options", "Global options");
  const continuation = options
    .split("\n")
    .find((line) => line.includes("components,"));

  assert.ok(continuation);
  assert.equal(continuation.startsWith(" ".repeat(36)), true);
});

test("TDD help layout splits structured long aliases before the description", () => {
  const sections = {
    ...HELP_SECTIONS,
    options: [
      {
        command: ["--show-trailing-zeros", "--keep-trailing-zeros"] as const,
        argument: "",
        description: [["Keep zeroes to the selected precision."]],
      },
    ],
  };
  const helpText = renderHelpAtWidth(
    sections,
    [],
    undefined,
    { columns: 80, visualWidth: terminalVisualWidth },
  );
  const options = sectionText(helpText, "Options", "Global options");

  assert.match(options, /\n {2}--show-trailing-zeros,\n/u);
  assert.match(options, /\n {2}--keep-trailing-zeros\s+Keep zeroes/u);
});

test("TDD help layout keeps the fixed label rule without terminal columns", () => {
  const sections = {
    ...HELP_SECTIONS,
    options: [
      {
        command: ["--show-trailing-zeros", "--keep-trailing-zeros"] as const,
        argument: "",
        description: [["Keep zeroes to the selected precision."]],
      },
    ],
  };
  const helpText = renderHelpText(sections, []);
  const options = sectionText(helpText, "Options", "Global options");

  assert.match(options, /\n {2}--show-trailing-zeros,\n/u);
  assert.match(options, /\n {2}--keep-trailing-zeros\s+Keep zeroes/u);
});

test("TDD help TTY layout measures code without non-TTY markers", () => {
  const helpText = renderHelpAtWidth(
    HELP_SECTIONS,
    [],
    undefined,
    { columns: 80, codeMarkers: false, visualWidth: terminalVisualWidth },
  );
  const commands = sectionText(helpText, "Commands", "Options");
  const line = commands
    .split("\n")
    .find((candidate) => candidate.includes("Print this help"));

  assert.ok(line);
  assert.equal(line.indexOf("Print this help"), 36);
});

test("TDD help layout stacks columns when the terminal is too narrow", () => {
  const helpText = renderHelpAtWidth(
    HELP_SECTIONS,
    [],
    undefined,
    { columns: 40 },
  );
  const options = sectionText(helpText, "Options", "Global options");
  const description = options
    .split("\n")
    .find((line) => line.includes("With --merge-frontmatter"));

  assert.ok(description);
  assert.equal(description.startsWith("    "), true);
  assert.equal(description.startsWith(" ".repeat(36)), false);
});

test("TDD help layout pads CJK labels by terminal cell width", () => {
  const sections = {
    ...HELP_SECTIONS,
    options: [
      {
        command: "--\u4e2d\u6587",
        argument: "",
        description: [["Description"]],
      },
    ],
  };
  const helpText = renderHelpAtWidth(
    sections,
    [],
    undefined,
    { columns: 80, visualWidth: terminalVisualWidth },
  );
  const options = sectionText(helpText, "Options", "Global options");
  const line = options
    .split("\n")
    .find((candidate) => candidate.includes("Description"));

  assert.ok(line);
  assert.equal(line.indexOf("Description"), 32);
});
