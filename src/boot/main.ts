#!/usr/bin/env node

import {
  packageRuntimeDependencies,
  packageVersion,
} from "../adapters/runtime/node-package-version.ts";
import { CLI_SYNTAX_REFERENCE } from "../adapters/output/cli-help.ts";
import { fileURLToPath } from "node:url";
import { createCliRuntime } from "./cli-runtime.ts";
import { runIfEntrypoint } from "./entrypoint.ts";

const syntaxReferencePath = fileURLToPath(
  new URL(`../../${CLI_SYNTAX_REFERENCE}`, import.meta.url),
);

const runCli = createCliRuntime({
  version: packageVersion,
  runtimeDependencies: packageRuntimeDependencies,
  syntaxReferencePath,
});

export function main(): Promise<number> {
  return runCli(process.argv.slice(2));
}

runIfEntrypoint(import.meta.url, main);
