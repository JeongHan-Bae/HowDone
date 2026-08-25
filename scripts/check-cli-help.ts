import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLI_COMMANDS,
  CLI_OPTIONS,
  CLI_SYNTAX_REFERENCE,
  CLI_USAGE,
  type CliCommandHeader,
  type CliOptionHeader,
} from "../src/application/cli/args.js";
import {
  HELP_SECTIONS,
  type HelpOption,
} from "../src/application/cli/help.js";

interface CliMetadata {
  bin?: Record<string, string>;
}

function isAlias(
  command: CliCommandHeader,
): command is readonly [string, string] {
  return Array.isArray(command);
}

function renderCommand(command: CliCommandHeader): string {
  return isAlias(command) ? command.join(", ") : command;
}

function renderOption(
  option: CliOptionHeader | Pick<HelpOption, "command" | "argument">,
): string {
  const command = renderCommand(option.command);
  const argument = option.argument;
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

function assertRenderedDescriptions(
  text: string,
  options: readonly HelpOption[],
  sectionName: string,
): void {
  for (const option of options) {
    if (option.description.length === 0) {
      throw new Error(`CLI help ${sectionName} has an empty description`);
    }
    for (const line of option.description) {
      if (!text.includes(line)) {
        throw new Error(
          `CLI help ${sectionName} is missing description text: ${line}`,
        );
      }
    }
  }
}

function assertRenderedSection(
  text: string,
  title: string,
  nextTitle: string,
  expected: string,
): void {
  const actual = section(text, title, nextTitle)
    .split("\n")
    .slice(1)
    .map((line) => line.trim());
  assertSameLabels(actual, expected.split("\n"), `Help ${title}`);
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
  assertSameLabels(usageLines, CLI_USAGE, "CLI usage");

  assertSameLabels(
    HELP_SECTIONS.usage.split("\n"),
    CLI_USAGE,
    "Help usage contract",
  );
  const actualCommands = HELP_SECTIONS.commands.map(renderOption);
  const expectedCommandLabels = CLI_COMMANDS.map(renderCommand);
  assertSameLabels(actualCommands, expectedCommandLabels, "Help commands");
  const commandSection = section(helpText, "Commands", "Options");
  for (const command of expectedCommandLabels) {
    assertRenderedLabel(commandSection, command, "Commands");
  }
  assertRenderedDescriptions(commandSection, HELP_SECTIONS.commands, "Commands");

  const actualOptions = HELP_SECTIONS.options.map(renderOption);
  const expectedOptionLabels = CLI_OPTIONS.map(renderOption);
  assertSameLabels(actualOptions, expectedOptionLabels, "Help options");
  const optionSection = section(helpText, "Options", "Supported paths");
  for (const option of expectedOptionLabels) {
    assertRenderedLabel(optionSection, option, "Options");
  }
  assertRenderedDescriptions(optionSection, HELP_SECTIONS.options, "Options");

  assertRenderedSection(
    helpText,
    "Supported paths",
    "Calculation rules",
    HELP_SECTIONS.supportedPaths,
  );
  assertRenderedSection(
    helpText,
    "Calculation rules",
    "Frontmatter display",
    HELP_SECTIONS.calculationRules,
  );
  assertRenderedSection(
    helpText,
    "Frontmatter display",
    "Default output",
    HELP_SECTIONS.frontmatterDisplay,
  );
  assertRenderedSection(
    helpText,
    "Default output",
    "Display defaults",
    HELP_SECTIONS.defaultOutput,
  );
  assertRenderedSection(
    helpText,
    "Display defaults",
    "Option policy",
    HELP_SECTIONS.displayDefaults,
  );
  assertRenderedSection(
    helpText,
    "Option policy",
    "Syntax reference",
    HELP_SECTIONS.optionPolicy,
  );

  const syntaxReferenceSection = section(
    helpText,
    "Syntax reference",
    "Requirements",
  );
  const renderedSyntaxReference = syntaxReferenceSection
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (!HELP_SECTIONS.syntaxReference.includes(CLI_SYNTAX_REFERENCE)) {
    throw new Error("Help syntax reference does not describe the CLI syntax file");
  }
  const syntaxReferencePath = resolve(projectRoot, CLI_SYNTAX_REFERENCE);
  assertSameLabels(
    renderedSyntaxReference,
    [syntaxReferencePath],
    "CLI syntax reference",
  );
  if (!existsSync(syntaxReferencePath)) {
    throw new Error(`CLI syntax reference does not exist: ${syntaxReferencePath}`);
  }

  console.log(
    `CLI help contract OK: ${CLI_USAGE.length} command forms (${CLI_COMMANDS.length} standalone), ${CLI_OPTIONS.length} options`,
  );
}

main();
