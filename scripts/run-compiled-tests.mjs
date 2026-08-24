#!/usr/bin/env node
// @ts-check

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

/** @typedef {"tdd" | "bdd" | "all"} CompiledTestMode */

/** @typedef {{ name: string, version: string }} PackageMetadata */

/** @typedef {{ filename: string }} PackReport */

const mode = /** @type {CompiledTestMode | undefined} */ (process.argv[2]);
if (mode !== "tdd" && mode !== "bdd" && mode !== "all") {
  throw new Error("run-compiled-tests: mode must be tdd, bdd, or all");
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const testBuildRoot = resolve(projectRoot, ".test-build");
const packageMetadata = /** @type {PackageMetadata} */ (JSON.parse(
  readFileSync(resolve(projectRoot, "package.json"), "utf8"),
));

/** @param {string} output */
function readPackReport(output) {
  /** @type {unknown} */
  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("npm pack did not return a package file report");
  }
  const report = parsed[0];
  if (
    typeof report !== "object" ||
    report === null ||
    typeof report.filename !== "string"
  ) {
    throw new Error("npm pack returned an invalid package file report");
  }
  return /** @type {PackReport} */ (report);
}

/**
 * @param {string} script
 * @param {string[]} [args]
 * @param {NodeJS.ProcessEnv} [env]
 */
function runNodeScript(script, args = [], env = process.env) {
  execFileSync(process.execPath, [resolve(projectRoot, "scripts", script), ...args], {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });
}

/** @param {string} runtimeRoot */
function installProductionPackage(runtimeRoot) {
  const packOutput = execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", runtimeRoot],
    {
      cwd: projectRoot,
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  const report = readPackReport(packOutput);
  const tarballPath = resolve(runtimeRoot, report.filename);

  writeFileSync(
    resolve(runtimeRoot, "package.json"),
    `${JSON.stringify({
      name: `${packageMetadata.name}-compiled-test`,
      private: true,
      type: "module",
      version: packageMetadata.version,
    })}\n`,
    "utf8",
  );
  execFileSync(
    "npm",
    [
      "install",
      "--omit=dev",
      "--ignore-scripts",
      "--no-package-lock",
      "--no-audit",
      "--no-fund",
      tarballPath,
    ],
    {
      cwd: runtimeRoot,
      shell: true,
      stdio: "inherit",
    },
  );
}

/** @param {string} runtimeRoot */
function copyCompiledTests(runtimeRoot) {
  cpSync(resolve(testBuildRoot, "src"), resolve(runtimeRoot, "src"), {
    recursive: true,
  });
  cpSync(resolve(testBuildRoot, "test"), resolve(runtimeRoot, "test"), {
    recursive: true,
  });
}

/** @param {string} runtimeRoot */
function runCompiledTdd(runtimeRoot) {
  execFileSync(
    process.execPath,
    [
      "--test",
      resolve(runtimeRoot, "test", "index.test.js"),
      resolve(runtimeRoot, "test", "tdd", "index.test.js"),
    ],
    { cwd: runtimeRoot, stdio: "inherit" },
  );
}

/** @param {string} runtimeRoot */
function runCompiledBdd(runtimeRoot) {
  const entryPoint = resolve(
    runtimeRoot,
    "node_modules",
    packageMetadata.name,
    "dist",
    "boot",
    "main.js",
  );
  runNodeScript("run-cucumber.mjs", ["compiled"], {
    ...process.env,
    HOWDONE_BDD_ENTRY_POINT: entryPoint,
  });
}

function main() {
  runNodeScript("build-test-artifacts.mjs");
  const runtimeRoot = mkdtempSync(resolve(tmpdir(), "howdone-compiled-"));
  try {
    installProductionPackage(runtimeRoot);
    copyCompiledTests(runtimeRoot);

    if (mode === "tdd" || mode === "all") {
      runCompiledTdd(runtimeRoot);
    }
    if (mode === "bdd" || mode === "all") {
      runCompiledBdd(runtimeRoot);
    }
  } finally {
    rmSync(runtimeRoot, { recursive: true, force: true });
  }
}

main();
