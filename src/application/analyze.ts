import {
  buildProgressReport,
  calculateFrontmatterProgress,
  calculateProgress,
  classifyFrontmatter,
  resolveDisplayOptions,
  runMarkdownPipeline,
} from "howdone";
import {
  parseArguments,
  ArgumentError,
} from "./cli/args.ts";
import type { ParsedArguments } from "./cli/args.ts";
import {
  HELP_SECTIONS,
  renderDependenciesText,
  renderHelpText,
} from "./cli/help.ts";
import type { CliDependencies, CliIO } from "./types.ts";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printError(io: CliIO, message: string): void {
  io.stderr.write(`howdone: error: ${message}\n`);
}

function emitWarning(
  message: string,
  silent: boolean,
  dependencies: CliDependencies,
): void {
  if (!silent) dependencies.warning.warn(message);
}

function warnOrThrow(
  message: string,
  strict: boolean,
  silent: boolean,
  dependencies: CliDependencies,
): void {
  if (strict) throw new Error(message);
  emitWarning(message, silent, dependencies);
}

function warnForJsonFormatting(
  argumentsValue: ParsedArguments,
  dependencies: CliDependencies,
): void {
  if (argumentsValue.mode !== "json") return;
  const ignoredOptions: string[] = [];
  if (argumentsValue.formatExplicit) {
    ignoredOptions.push("--format/--decimal/--percentage");
  }
  if (argumentsValue.precision !== undefined) {
    ignoredOptions.push("--precision");
  }
  if (argumentsValue.showTrailingZeros !== undefined) {
    ignoredOptions.push("--show-trailing-zeros/--no-trailing-zeros");
  }
  if (ignoredOptions.length === 0) return;
  warnOrThrow(
    `The following options have no effect with --json because JSON contains raw numeric fields and complete labels: ${ignoredOptions.join(", ")}.`,
    argumentsValue.strict,
    argumentsValue.silent,
    dependencies,
  );
}

export async function run(
  argv: readonly string[],
  io: CliIO,
  dependencies: CliDependencies,
): Promise<number> {
  let argumentsValue;
  try {
    argumentsValue = parseArguments(argv);
  } catch (error) {
    if (error instanceof ArgumentError) {
      printError(io, error.message);
      io.stderr.write("Run `howdone --help` for usage.\n");
      return 1;
    }
    printError(io, errorMessage(error));
    return 1;
  }

  if (argumentsValue.help) {
    io.stdout.write(
      renderHelpText(HELP_SECTIONS, dependencies.runtimeDependencies),
    );
    return 0;
  }
  if (argumentsValue.version) {
    io.stdout.write(`${dependencies.version}\n`);
    return 0;
  }
  if (argumentsValue.dependencies) {
    io.stdout.write(renderDependenciesText(dependencies.runtimeDependencies));
    return 0;
  }
  if (argumentsValue.path === undefined) {
    printError(io, "a Markdown file path is required");
    io.stderr.write("Run `howdone --help` for usage.\n");
    return 1;
  }

  try {
    warnForJsonFormatting(argumentsValue, dependencies);
    const sourceText = await dependencies.fileReader.read(argumentsValue.path);
    const sourceDocument = runMarkdownPipeline(
      sourceText,
      dependencies.lexer,
      dependencies.parser,
      argumentsValue.path,
    );
    const markdown = calculateProgress(sourceDocument.ast.body);
    const frontmatter = sourceDocument.ast.frontmatter.map((section) =>
      calculateFrontmatterProgress(
        section.format,
        classifyFrontmatter(
          (section.format === "yaml"
            ? dependencies.yamlValueParser
            : dependencies.tomlValueParser).parse(section),
        ),
      )
    );
    let mergeFrontmatter = argumentsValue.mergeFrontmatter;
    let frontmatterWeight = argumentsValue.frontmatterWeight;
    const weightInput = argumentsValue.frontmatterWeightInput;
    if (weightInput !== undefined && frontmatterWeight === undefined) {
      warnOrThrow(
        `--frontmatter-weight is illegal; expected a decimal strictly between 0 and 1, received: ${weightInput}. The value was ignored.`,
        argumentsValue.strict,
        argumentsValue.silent,
        dependencies,
      );
      frontmatterWeight = undefined;
    } else if (weightInput !== undefined && !mergeFrontmatter) {
      warnOrThrow(
        "--frontmatter-weight is invalid without --merge-frontmatter. The value was ignored.",
        argumentsValue.strict,
        argumentsValue.silent,
        dependencies,
      );
      mergeFrontmatter = false;
      frontmatterWeight = undefined;
    }
    const reportBuild = buildProgressReport(
      argumentsValue.path,
      markdown,
      frontmatter,
      sourceDocument.ast.body.children.length > 0,
      { mergeFrontmatter, frontmatterWeight },
    );
    if (reportBuild.mergeIgnored) {
      const weightMessage = frontmatterWeight !== undefined
        ? " --frontmatter-weight is also invalid unless both frontmatter and Markdown have checklist roots."
        : "";
      warnOrThrow(
        `--merge-frontmatter is invalid because at least two source components are required.${weightMessage} The merge was ignored.`,
        argumentsValue.strict,
        argumentsValue.silent,
        dependencies,
      );
    } else if (reportBuild.weightIgnored) {
      warnOrThrow(
        "--frontmatter-weight is invalid unless both frontmatter and Markdown have checklist roots. The value was ignored.",
        argumentsValue.strict,
        argumentsValue.silent,
        dependencies,
      );
    }
    const options = resolveDisplayOptions(
      argumentsValue.maxLabelClusters,
      argumentsValue.noTruncate,
      argumentsValue.format,
      argumentsValue.precision,
      argumentsValue.showTrailingZeros,
    );

    if (argumentsValue.mode === "json") {
      const jsonOptions =
        !argumentsValue.noTruncate &&
        argumentsValue.maxLabelClusters !== undefined
          ? options
          : undefined;
      io.stdout.write(
        dependencies.jsonRenderer.render(reportBuild.report, jsonOptions),
      );
    } else {
      io.stdout.write(
        dependencies.terminalRenderer.render(
          argumentsValue.mode,
          reportBuild.report,
          options,
        ),
      );
    }
    return 0;
  } catch (error) {
    printError(io, errorMessage(error));
    return 1;
  }
}
