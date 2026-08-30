import {
  buildProgressReport,
  calculateFrontmatterProgress,
  calculateProgress,
  classifyFrontmatter,
  resolveDisplayOptions,
  runMarkdownPipeline,
} from "howdone";
import type {
  InfoCommand,
  InfoDocument,
  TerminalOutput,
  TerminalOutputOptions,
  TerminalOutputTarget,
} from "howdone";
import {
  parseArguments,
  ArgumentError,
} from "./cli/args.ts";
import type { ParsedArguments } from "./cli/args.ts";
import type { CliDependencies, CliIO } from "./types.ts";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function printTerminalOutput<
  TOutput extends TerminalOutput,
  TDocument extends InfoDocument,
>(
  content: TOutput,
  target: TerminalOutputTarget,
  noColor: boolean,
  pager: "auto" | "never",
  io: CliIO,
  dependencies: CliDependencies<TOutput, TDocument>,
): Promise<void> {
  const options: TerminalOutputOptions = {
    color: noColor ? "never" : "auto",
    pager,
    target,
  };
  if (dependencies.terminalRenderer.print !== undefined) {
    await dependencies.terminalRenderer.print(content, options);
    return;
  }
  const destination = target === "stdout" ? io.stdout : io.stderr;
  content.writeTo(destination);
}

function renderInfoDocumentOutput<
  TOutput extends TerminalOutput,
  TDocument extends InfoDocument,
>(
  document: TDocument,
  target: TerminalOutputTarget,
  noColor: boolean,
  dependencies: CliDependencies<TOutput, TDocument>,
): TOutput {
  return dependencies.terminalRenderer.renderDocument(document, {
    color: noColor ? "never" : "auto",
    target,
  });
}

function infoCommandFor(argumentsValue: ParsedArguments): InfoCommand | undefined {
  if (argumentsValue.help) return "help";
  if (argumentsValue.version) return "version";
  if (argumentsValue.dependencies) return "dependencies";
  return undefined;
}

async function emitDiagnostic<
  TOutput extends TerminalOutput,
  TDocument extends InfoDocument,
>(
  message: string,
  semantic: "warning" | "error",
  noColor: boolean,
  io: CliIO,
  dependencies: CliDependencies<TOutput, TDocument>,
): Promise<void> {
  const output = semantic === "warning"
    ? dependencies.terminalRenderer.renderWarning({ message })
    : dependencies.terminalRenderer.renderError({ message });
  await printTerminalOutput(output, "stderr", noColor, "never", io, dependencies);
}

async function emitWarning<
  TOutput extends TerminalOutput,
  TDocument extends InfoDocument,
>(
  message: string,
  silent: boolean,
  noColor: boolean,
  io: CliIO,
  dependencies: CliDependencies<TOutput, TDocument>,
): Promise<void> {
  if (silent) return;
  await emitDiagnostic(
    message,
    "warning",
    noColor,
    io,
    dependencies,
  );
}

async function warnOrThrow<
  TOutput extends TerminalOutput,
  TDocument extends InfoDocument,
>(
  message: string,
  strict: boolean,
  silent: boolean,
  noColor: boolean,
  io: CliIO,
  dependencies: CliDependencies<TOutput, TDocument>,
): Promise<void> {
  if (strict) throw new Error(message);
  await emitWarning(message, silent, noColor, io, dependencies);
}

async function warnForJsonFormatting<
  TOutput extends TerminalOutput,
  TDocument extends InfoDocument,
>(
  argumentsValue: ParsedArguments,
  io: CliIO,
  dependencies: CliDependencies<TOutput, TDocument>,
): Promise<void> {
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
  await warnOrThrow(
    `The following options have no effect with --json because JSON contains raw numeric fields and complete labels: ${ignoredOptions.join(", ")}.`,
    argumentsValue.strict,
    argumentsValue.silent,
    argumentsValue.noColor,
    io,
    dependencies,
  );
}

export async function run<
  TOutput extends TerminalOutput,
  TDocument extends InfoDocument,
>(
  argv: readonly string[],
  io: CliIO,
  dependencies: CliDependencies<TOutput, TDocument>,
): Promise<number> {
  let argumentsValue;
  try {
    argumentsValue = parseArguments(argv);
  } catch (error) {
    const message = error instanceof ArgumentError
      ? `${errorMessage(error)}\nRun \`howdone --help\` for usage.`
      : errorMessage(error);
    await emitDiagnostic(
      message,
      "error",
      argv.includes("--no-color"),
      io,
      dependencies,
    );
    return 1;
  }

  try {
    const infoCommand = infoCommandFor(argumentsValue);
    if (infoCommand !== undefined) {
      const document = renderInfoDocumentOutput(
        dependencies.infoPort.execute(infoCommand),
        "stdout",
        argumentsValue.noColor,
        dependencies,
      );
      await printTerminalOutput(
        document,
        "stdout",
        argumentsValue.noColor,
        argumentsValue.noPager ? "never" : "auto",
        io,
        dependencies,
      );
      return 0;
    }
    if (argumentsValue.path === undefined) {
      await emitDiagnostic(
        "a Markdown file path is required",
        "error",
        argumentsValue.noColor,
        io,
        dependencies,
      );
      return 1;
    }

    await warnForJsonFormatting(argumentsValue, io, dependencies);
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
    if (frontmatterWeight !== undefined && !mergeFrontmatter) {
      await warnOrThrow(
        "--frontmatter-weight is invalid without --merge-frontmatter. The value was ignored.",
        argumentsValue.strict,
        argumentsValue.silent,
        argumentsValue.noColor,
        io,
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
      await warnOrThrow(
        `--merge-frontmatter is invalid because at least two source components are required.${weightMessage} The merge was ignored.`,
        argumentsValue.strict,
        argumentsValue.silent,
        argumentsValue.noColor,
        io,
        dependencies,
      );
    } else if (reportBuild.weightIgnored) {
      await warnOrThrow(
        "--frontmatter-weight is invalid unless both frontmatter and Markdown have checklist roots. The value was ignored.",
        argumentsValue.strict,
        argumentsValue.silent,
        argumentsValue.noColor,
        io,
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
      const jsonOutput = dependencies.jsonRenderer.render(
        reportBuild.report,
        jsonOptions,
      );
      if (dependencies.jsonRenderer.writeWithTerminalFeatures) {
        await dependencies.jsonRenderer.writeWithTerminalFeatures(
          jsonOutput,
          {
            color: argumentsValue.noColor ? "never" : "auto",
            pager: argumentsValue.noPager ? "never" : "auto",
          },
        );
      } else {
        io.stdout.write(`${JSON.stringify(jsonOutput, null, 2)}\n`);
      }
    } else {
      const terminalOutput = dependencies.terminalRenderer.render(
        argumentsValue.mode,
        reportBuild.report,
        options,
      );
      await printTerminalOutput(
        terminalOutput,
        "stdout",
        argumentsValue.noColor,
        argumentsValue.noPager ? "never" : "auto",
        io,
        dependencies,
      );
    }
    return 0;
  } catch (error) {
    await emitDiagnostic(
      errorMessage(error),
      "error",
      argumentsValue.noColor,
      io,
      dependencies,
    );
    return 1;
  }
}
