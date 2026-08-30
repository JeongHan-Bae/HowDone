import { TypedAstParser } from "howdone/std";
import { run } from "howdone/application";
import type { RuntimeDependency, TerminalOutput } from "howdone";
import type { CliDependencies, CliIO } from "howdone/application";
import { defaultRemarkLexer } from "../adapters/markdown/remark-lexer.ts";
import { defaultTomlValueParser } from "../adapters/frontmatter/toml-value-parser.ts";
import { defaultYamlValueParser } from "../adapters/frontmatter/yaml-value-parser.ts";
import { defaultFileReader } from "../adapters/filesystem/node-file-reader.ts";
import { defaultJsonRenderer } from "../adapters/output/json-renderer.ts";
import { InkTerminalRenderer } from "../adapters/output/ink-terminal-renderer.ts";
import { terminalVisualWidth } from "../adapters/output/terminal-width.ts";
import { defaultCliIO } from "../adapters/runtime/node-cli-io.ts";
import {
  createDependenciesDocument,
  createHelpDocument,
  createVersionDocument,
  renderCliDocument,
} from "../adapters/output/cli-help.ts";
import type { CliInfoDocument } from "../adapters/output/cli-help.ts";

/**
 * @brief Supplies artifact-specific values to the shared CLI runtime.
 *
 * @details
 * Source-checkout and published-package execution use the same application
 * and adapters. They differ only in where their package metadata and shipped
 * syntax reference are located, so those values remain at their thin entry
 * points instead of being guessed by the shared composition.
 */
export interface CliRuntimeOptions {
  /** @brief Version displayed by the CLI version information command. */
  readonly version: string;

  /** @brief Runtime dependencies displayed by Help and dependencies output. */
  readonly runtimeDependencies: readonly RuntimeDependency[];

  /** @brief Installed path to the CLI syntax reference document. */
  readonly syntaxReferencePath: string;
}

/**
 * @brief Builds the default CLI runner for one artifact layout.
 *
 * @details
 * This is the single CLI composition point. It constructs the standard Core
 * parser, external syntax adapters, filesystem adapter, output adapters, and
 * CLI-owned information-document Port, then supplies it to the Core
 * application. The returned runner owns the process IO used by the default
 * command entrypoints.
 *
 * @param options Artifact-specific metadata and documentation paths.
 * @returns A runner that executes the composed CLI for an argument list.
 */
export function createCliRuntime(
  options: CliRuntimeOptions,
): (argv: readonly string[]) => Promise<number> {
  const io: CliIO = defaultCliIO;
  const terminalRenderer = new InkTerminalRenderer<CliInfoDocument>({
    documentRenderer: (document, rendererOptions) => renderCliDocument(document, {
      columns: rendererOptions.columns,
      codeMarkers: rendererOptions.codeMarkers,
      visualWidth: terminalVisualWidth,
    }),
  });
  const dependencies: CliDependencies<TerminalOutput, CliInfoDocument> = {
    lexer: defaultRemarkLexer,
    parser: new TypedAstParser(),
    yamlValueParser: defaultYamlValueParser,
    tomlValueParser: defaultTomlValueParser,
    fileReader: defaultFileReader,
    terminalRenderer,
    jsonRenderer: defaultJsonRenderer,
    infoPort: {
      execute: (command) => command === "help"
        ? createHelpDocument(
          options.runtimeDependencies,
          options.syntaxReferencePath,
        )
        : command === "version"
        ? createVersionDocument(options.version)
        : createDependenciesDocument(options.runtimeDependencies),
    },
  };

  return (argv) => run(argv, io, dependencies);
}
