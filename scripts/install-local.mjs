#!/usr/bin/env node
// @ts-check

import { chmodSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { npmCliArguments } from "./npm-runtime.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const corePackagePath = resolve(projectRoot, "packages", "core");
const cliPackagePath = resolve(projectRoot, "packages", "cli");

/** @returns {void} */
function printUsage() {
  console.error("Usage: npm run install:local");
}

/** @returns {boolean} */
function parseOptions() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.length !== 0) {
    printUsage();
    return false;
  }
  return true;
}

/**
 * @param {string[]} argumentsList
 * @param {string} workingDirectory
 * @returns {boolean}
 */
function runNpm(argumentsList, workingDirectory) {
  const result = spawnSync(process.execPath, npmCliArguments(argumentsList), {
    cwd: workingDirectory,
    stdio: "inherit",
    windowsHide: false,
  });

  if (result.error) {
    console.error(`Unable to run npm: ${result.error.message}`);
    return false;
  }

  return result.status === 0;
}

function main() {
  if (!parseOptions()) {
    process.exitCode = 1;
    return;
  }

  if (!runNpm(["run", "build:cli"], projectRoot)) {
    process.exitCode = 1;
    return;
  }

  const requiredArtifacts = [
    resolve(corePackagePath, "dist", "core", "index.js"),
    resolve(cliPackagePath, "dist", "boot", "cli-main.js"),
  ];
  if (requiredArtifacts.some((artifactPath) => !existsSync(artifactPath))) {
    console.error("The local build did not produce the required package artifacts.");
    process.exitCode = 1;
    return;
  }

  chmodSync(resolve(cliPackagePath, "dist", "boot", "cli-main.js"), 0o755);

  const installArguments = [
    "install",
    "--global",
    "--no-audit",
    "--no-fund",
    corePackagePath,
    cliPackagePath,
  ];

  if (!runNpm(installArguments, projectRoot)) {
    process.exitCode = 1;
    return;
  }

  console.log("Installed the local HowDone Core and CLI globally.");
}

main();
