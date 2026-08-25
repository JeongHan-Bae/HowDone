#!/usr/bin/env node
// @ts-check

import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

/** @typedef {"tdd" | "bdd" | "package" | "all"} CompiledTestMode */
/** @typedef {{ name: string, version: string, dependencies?: Record<string, string>, optionalDependencies?: Record<string, string> }} PackageMetadata */
const mode = /** @type {CompiledTestMode | undefined} */ (process.argv[2]);
if (mode !== "tdd" && mode !== "bdd" && mode !== "package" && mode !== "all") {
  throw new Error("run-compiled-tests: mode must be tdd, bdd, package, or all");
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url).href);
const coreRoot = resolve(projectRoot, "packages", "core");
const cliRoot = resolve(projectRoot, "packages", "cli");
const testBuildRoot = resolve(projectRoot, ".test-build");
const require = createRequire(import.meta.url);
const coreMetadata = /** @type {PackageMetadata} */ (JSON.parse(
  readFileSync(resolve(coreRoot, "package.json"), "utf8"),
));
const cliMetadata = /** @type {PackageMetadata} */ (JSON.parse(
  readFileSync(resolve(cliRoot, "package.json"), "utf8"),
));

/**
 * @param {string} script
 * @param {string[]} [args]
 * @param {NodeJS.ProcessEnv} [env]
 */
function runNodeScript(script, args = [], env = process.env) {
  execFileSync(
    process.execPath,
    [resolve(projectRoot, "scripts", script), ...args],
    { cwd: projectRoot, env, stdio: "inherit" },
  );
}

/** @param {string} runtimeRoot */
function writeRuntimePackage(runtimeRoot) {
  writeFileSync(
    resolve(runtimeRoot, "package.json"),
    `${JSON.stringify({
      name: "howdone-compiled-test",
      private: true,
      type: "module",
      version: "0.0.0",
    })}\n`,
    "utf8",
  );
}

/** @param {string} packageName */
function packageRootFor(packageName) {
  try {
    const metadataPath = require.resolve(`${packageName}/package.json`, {
      paths: [projectRoot],
    });
    return dirname(metadataPath);
  } catch {
    // Some packages do not expose package.json through exports.
  }
  const entryPoint = require.resolve(packageName, { paths: [projectRoot] });
  let current = dirname(entryPoint);
  while (current !== dirname(current)) {
    const metadataPath = resolve(current, "package.json");
    try {
      const metadata = /** @type {{ name?: unknown }} */ (JSON.parse(
        readFileSync(metadataPath, "utf8"),
      ));
      if (metadata.name === packageName) return current;
    } catch {
      // Continue toward the package root when the entry's parent is not a package.
    }
    current = dirname(current);
  }
  throw new Error(`cannot locate installed production dependency: ${packageName}`);
}

/**
 * @param {string} packageName
 * @param {string} runtimeRoot
 * @param {Set<string>} copied
 */
function stageProductionDependency(packageName, runtimeRoot, copied) {
  if (packageName === coreMetadata.name || packageName === cliMetadata.name) {
    return;
  }
  if (copied.has(packageName)) return;
  copied.add(packageName);
  const sourceRoot = packageRootFor(packageName);
  const targetRoot = resolve(runtimeRoot, "node_modules", packageName);
  mkdirSync(dirname(targetRoot), { recursive: true });
  cpSync(sourceRoot, targetRoot, { recursive: true, dereference: true });
  const metadata = /** @type {PackageMetadata} */ (JSON.parse(
    readFileSync(resolve(sourceRoot, "package.json"), "utf8"),
  ));
  for (const dependencyName of Object.keys({
    ...(metadata.dependencies ?? {}),
    ...(metadata.optionalDependencies ?? {}),
  })) {
    stageProductionDependency(dependencyName, runtimeRoot, copied);
  }
}

/** @param {string} runtimeRoot */
function stageCliPackage(runtimeRoot) {
  const packageRoot = resolve(runtimeRoot, "node_modules", cliMetadata.name);
  rmSync(packageRoot, { recursive: true, force: true });
  mkdirSync(packageRoot, { recursive: true });
  cpSync(resolve(cliRoot, "dist"), resolve(packageRoot, "dist"), {
    recursive: true,
  });
  cpSync(resolve(cliRoot, "docs"), resolve(packageRoot, "docs"), {
    recursive: true,
  });
  cpSync(resolve(cliRoot, "README.md"), resolve(packageRoot, "README.md"));
  cpSync(resolve(cliRoot, "LICENSE"), resolve(packageRoot, "LICENSE"));
  cpSync(
    resolve(cliRoot, "package.json"),
    resolve(packageRoot, "package.json"),
  );
}

/** @param {string} runtimeRoot */
function stageProductionPackages(runtimeRoot) {
  writeRuntimePackage(runtimeRoot);
  mkdirSync(resolve(runtimeRoot, "node_modules"), { recursive: true });
  stageCorePackageFiles(runtimeRoot);
  stageCliPackage(runtimeRoot);
  const copied = new Set();
  for (const dependencyName of Object.keys(cliMetadata.dependencies ?? {})) {
    stageProductionDependency(dependencyName, runtimeRoot, copied);
  }
}

/** @param {string} runtimeRoot */
function copyCompiledTests(runtimeRoot) {
  cpSync(resolve(testBuildRoot, "src"), resolve(runtimeRoot, "src"), {
    recursive: true,
  });
  cpSync(resolve(testBuildRoot, "test"), resolve(runtimeRoot, "test"), {
    recursive: true,
  });
  mkdirSync(resolve(runtimeRoot, "packages", "cli"), { recursive: true });
  cpSync(
    resolve(cliRoot, "package.json"),
    resolve(runtimeRoot, "packages", "cli", "package.json"),
  );
}

/** @param {string} runtimeRoot */
function stageCorePackageFiles(runtimeRoot) {
  const packageRoot = resolve(runtimeRoot, "node_modules", coreMetadata.name);
  rmSync(packageRoot, { recursive: true, force: true });
  mkdirSync(resolve(packageRoot, "dist", "core"), { recursive: true });
  mkdirSync(resolve(packageRoot, "dist", "application"), { recursive: true });
  cpSync(
    resolve(coreRoot, "dist", "core"),
    resolve(packageRoot, "dist", "core"),
    { recursive: true },
  );
  cpSync(
    resolve(coreRoot, "dist", "application"),
    resolve(packageRoot, "dist", "application"),
    { recursive: true },
  );
  mkdirSync(resolve(packageRoot, "docs"), { recursive: true });
  cpSync(
    resolve(coreRoot, "docs", "api.md"),
    resolve(packageRoot, "docs", "api.md"),
  );
  writeFileSync(
    resolve(packageRoot, "package.json"),
    `${JSON.stringify({
      name: coreMetadata.name,
      version: coreMetadata.version,
      type: "module",
      main: "./dist/core/index.js",
      types: "./dist/core/index.d.ts",
      exports: {
        ".": {
          types: "./dist/core/index.d.ts",
          import: "./dist/core/index.js",
        },
        "./application": {
          types: "./dist/application/index.d.ts",
          import: "./dist/application/index.js",
        },
      },
    })}\n`,
    "utf8",
  );
}

/** @param {string} runtimeRoot */
function stageCorePackage(runtimeRoot) {
  writeRuntimePackage(runtimeRoot);
  cpSync(resolve(projectRoot, "node_modules"), resolve(runtimeRoot, "node_modules"), {
    recursive: true,
    dereference: true,
  });
  stageCorePackageFiles(runtimeRoot);
  mkdirSync(resolve(runtimeRoot, "packages", "cli"), { recursive: true });
  cpSync(
    resolve(cliRoot, "package.json"),
    resolve(runtimeRoot, "packages", "cli", "package.json"),
  );
}

/** @param {string} runtimeRoot */
function copyPublishedPackageTests(runtimeRoot) {
  cpSync(
    resolve(projectRoot, "test", "package"),
    resolve(runtimeRoot, "test", "package"),
    { recursive: true },
  );
}

/** @param {string[]} testFiles */
function sourceNodeTestArguments(testFiles) {
  const majorVersion = Number(process.versions.node.split(".")[0]);
  if (majorVersion >= 23) return ["--test", ...testFiles];
  return [
    "--import",
    pathToFileURL(require.resolve("tsx")).href,
    "--test",
    ...testFiles,
  ];
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
function runPublishedPackageTests(runtimeRoot) {
  execFileSync(
    process.execPath,
    sourceNodeTestArguments([
      resolve(runtimeRoot, "test", "package", "tdd", "pipeline.test.ts"),
      resolve(runtimeRoot, "test", "package", "tdd", "application.test.ts"),
      resolve(runtimeRoot, "test", "package", "tdd", "api.test.ts"),
      resolve(runtimeRoot, "test", "package", "tdd", "package-metadata.test.ts"),
    ]),
    { cwd: runtimeRoot, stdio: "inherit" },
  );
}

/** @param {string} runtimeRoot */
function runPublishedPackageBdd(runtimeRoot) {
  const entryPoint = resolve(
    runtimeRoot,
    "node_modules",
    coreMetadata.name,
    "dist",
    "application",
    "index.js",
  );
  runNodeScript("run-cucumber.mjs", ["package"], {
    ...process.env,
    HOWDONE_PACKAGE_APPLICATION_ENTRY: pathToFileURL(entryPoint).href,
  });
}

/** @param {string} runtimeRoot */
function runCompiledBdd(runtimeRoot) {
  const entryPoint = resolve(
    runtimeRoot,
    "node_modules",
    cliMetadata.name,
    "dist",
    "boot",
    "cli-main.js",
  );
  runNodeScript("run-cucumber.mjs", ["compiled"], {
    ...process.env,
    HOWDONE_BDD_ENTRY_POINT: entryPoint,
  });
}

function main() {
  runNodeScript("build-test-artifacts.mjs");

  if (mode === "tdd" || mode === "bdd" || mode === "all") {
    const runtimeRoot = mkdtempSync(resolve(tmpdir(), "howdone-compiled-"));
    try {
      stageProductionPackages(runtimeRoot);
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

  if (mode === "package" || mode === "all") {
    const runtimeRoot = mkdtempSync(resolve(tmpdir(), "howdone-package-"));
    try {
      stageCorePackage(runtimeRoot);
      copyPublishedPackageTests(runtimeRoot);
      runPublishedPackageTests(runtimeRoot);
      runPublishedPackageBdd(runtimeRoot);
    } finally {
      rmSync(runtimeRoot, { recursive: true, force: true });
    }
  }
}

main();
