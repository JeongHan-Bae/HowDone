import { resolveDisplayOptions } from "../core/config/options.ts";
import { runMarkdownPipeline } from "../core/source/pipeline.ts";
import { calculateProgress } from "../core/progress/analyzer.ts";
import { parseArguments, ArgumentError } from "./cli/args.ts";
import { HELP_TEXT } from "./cli/help.ts";
import { VERSION } from "./version.ts";
import type { CliDependencies, CliIO } from "./types.ts";

export { VERSION } from "./version.ts";

const defaultIO: CliIO = {
  stdout: process.stdout,
  stderr: process.stderr,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printError(io: CliIO, message: string): void {
  io.stderr.write(`howdone: error: ${message}\n`);
}

export async function run(
  argv: readonly string[] = process.argv.slice(2),
  io: CliIO = defaultIO,
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
    io.stdout.write(HELP_TEXT);
    return 0;
  }
  if (argumentsValue.version) {
    io.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (argumentsValue.path === undefined) {
    printError(io, "a Markdown file path is required");
    io.stderr.write("Run `howdone --help` for usage.\n");
    return 1;
  }

  try {
    const markdown = await dependencies.fileReader.read(argumentsValue.path);
    const sourceDocument = runMarkdownPipeline(
      markdown,
      dependencies.lexer,
      dependencies.parser,
      argumentsValue.path,
    );
    const result = calculateProgress(sourceDocument.ast);
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
        dependencies.jsonRenderer.render({
          source: { path: argumentsValue.path },
          progress: result,
        }, jsonOptions),
      );
    } else {
      io.stdout.write(
        dependencies.terminalRenderer.render(
          argumentsValue.mode,
          result,
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
