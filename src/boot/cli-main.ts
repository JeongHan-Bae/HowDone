#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TypedAstParser } from "howdone";
import { run } from "howdone/application";
import { defaultRemarkLexer } from "../adapters/markdown/remark-lexer.ts";
import { defaultTomlValueParser } from "../adapters/frontmatter/toml-value-parser.ts";
import { defaultYamlValueParser } from "../adapters/frontmatter/yaml-value-parser.ts";
import { defaultFileReader } from "../adapters/filesystem/node-file-reader.ts";
import { defaultJsonRenderer } from "../adapters/output/json-renderer.ts";
import { defaultTerminalRenderer } from "../adapters/output/terminal-renderer.ts";
import { runtimeMetadataFor } from "../adapters/runtime/node-package-version.ts";
import { defaultWarningPort } from "../adapters/runtime/node-warning-sink.ts";
import type { CliDependencies, CliIO } from "howdone/application";

const io: CliIO = {
  stdout: process.stdout,
  stderr: process.stderr,
};

const metadata = runtimeMetadataFor(
  new URL("../../package.json", import.meta.url),
);

const dependencies: CliDependencies = {
  lexer: defaultRemarkLexer,
  parser: new TypedAstParser(),
  yamlValueParser: defaultYamlValueParser,
  tomlValueParser: defaultTomlValueParser,
  fileReader: defaultFileReader,
  terminalRenderer: defaultTerminalRenderer,
  jsonRenderer: defaultJsonRenderer,
  warning: defaultWarningPort,
  version: metadata.version,
  runtimeDependencies: metadata.runtimeDependencies,
};

export function main(): Promise<number> {
  return run(process.argv.slice(2), io, dependencies);
}

function isEntrypoint(): boolean {
  const processEntry = process.argv[1];
  if (processEntry === undefined) return false;
  const entryUrl = pathToFileURL(realpathSync(resolve(processEntry))).href;
  const moduleUrl = pathToFileURL(
    realpathSync(fileURLToPath(import.meta.url)),
  ).href;
  return moduleUrl === entryUrl;
}

if (isEntrypoint()) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
