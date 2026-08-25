import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HELP_SECTIONS,
  type HelpCommand,
  type HelpOption,
} from "../src/application/cli/help.js";

interface CliMetadata {
  bin?: Record<string, string>;
}

interface ExpectedOption {
  command: HelpCommand;
  argument?: string;
}

const expectedUsage = [
  "howdone <markdown-path> [options]",
  "howdone --help",
  "howdone --version",
  "howdone --dependencies",
] as const;

const expectedCommands: readonly HelpCommand[] = [
  ["--help", "-h"],
  ["--version", "-v"],
  "--dependencies",
];

const expectedOptions: readonly ExpectedOption[] = [
  { command: "--format", argument: "decimal|percentage" },
  { command: ["--format decimal", "--decimal"] },
  { command: ["--format percentage", "--percentage"] },
  { command: "--precision", argument: "N" },
  { command: ["--show-trailing-zeros", "--keep-trailing-zeros"] },
  { command: ["--no-trailing-zeros", "--trim-trailing-zeros"] },
  { command: "--tree" },
  { command: "--details" },
  { command: "--json" },
  { command: "--max-label-clusters", argument: "N" },
  { command: "--no-truncate" },
  { command: ["--silent", "-s"] },
  { command: "--merge-frontmatter" },
  { command: "--frontmatter-weight", argument: "N" },
  { command: "--strict" },
  { command: "--" },
];

function isAlias(command: HelpCommand): command is readonly [string, string] {
  return Array.isArray(command);
}

function renderCommand(command: HelpCommand): string {
  return isAlias(command) ? command.join(", ") : command;
}

function renderOption(option: HelpOption | ExpectedOption): string {
  const command = renderCommand(option.command);
  const argument = option.argument ?? "";
  return [command, argument].filter((part) => part.length > 0).join(" ");
}

function section(text: string, title: string, nextTitle: string): string {
  const start = text.indexOf(`${title}:`);
  const end = text.indexOf(`\n\n${nextTitle}:`, start);
  if (start < 0 || end < 0) {
    throw new Error(`CLI help is missing the ${title} section`);
  }
  return text.slice(start, end);
}

function assertSameLabels(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `${label} mismatch: expected ${expectedJson}, received ${actualJson}`,
    );
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function assertRenderedLabel(text: string, label: string, sectionName: string): void {
  const pattern = new RegExp(`^  ${escapeRegExp(label)}(?:\\s|$)`, "mu");
  if (!pattern.test(text)) {
    throw new Error(`CLI help ${sectionName} is missing: ${label}`);
  }
}

function main(): void {
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  const cliMetadata = JSON.parse(
    readFileSync(resolve(projectRoot, "packages", "cli", "package.json"), "utf8"),
  ) as CliMetadata;
  const binNames = Object.keys(cliMetadata.bin ?? {}).sort();
  assertSameLabels(binNames, ["howdone", "howdone-cli"], "CLI bin names");

  const helpText = execFileSync(
    process.execPath,
    [resolve(projectRoot, "bin", "howdone.cjs"), "--help"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  const usageSection = section(helpText, "Usage", "Commands");
  const usageLines = usageSection
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  assertSameLabels(usageLines, expectedUsage, "CLI usage");

  const actualCommands = HELP_SECTIONS.commands.map(renderOption);
  const expectedCommandLabels = expectedCommands.map(renderCommand);
  assertSameLabels(actualCommands, expectedCommandLabels, "CLI commands");
  const commandSection = section(helpText, "Commands", "Options");
  for (const command of expectedCommandLabels) {
    assertRenderedLabel(commandSection, command, "Commands");
  }

  const actualOptions = HELP_SECTIONS.options.map(renderOption);
  const expectedOptionLabels = expectedOptions.map(renderOption);
  assertSameLabels(actualOptions, expectedOptionLabels, "CLI options");
  const optionSection = section(helpText, "Options", "Supported paths");
  for (const option of expectedOptionLabels) {
    assertRenderedLabel(optionSection, option, "Options");
  }

  if (!helpText.includes("Value options accept either --option N or --option=N.")) {
    throw new Error("CLI help is missing the value-option spelling rule");
  }
  const syntaxReferencePath = resolve(projectRoot, "docs", "syntax.md");
  if (!helpText.includes(syntaxReferencePath)) {
    throw new Error(
      `CLI help is missing the clickable syntax reference path: ${syntaxReferencePath}`,
    );
  }

  console.log(
    `CLI help contract OK: 4 command forms (3 standalone), ${expectedOptionLabels.length} options`,
  );
}

main();
