#!/usr/bin/env node

"use strict";

// @ts-check

const { spawnSync } = require("node:child_process");
const { dirname, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const packageRoot = resolve(dirname(__dirname));
const entryPoint = resolve(packageRoot, "src", "boot", "main.ts");
const entryPointUrl = pathToFileURL(entryPoint).href;

/** @returns {{ major: number, minor: number }} */
function parseNodeVersion() {
  const [majorText, minorText] = process.versions.node.split(".");
  return {
    major: Number(majorText),
    minor: Number(minorText),
  };
}

/** @returns {string} */
function getTsxEntryPoint() {
  return pathToFileURL(require.resolve("tsx")).href;
}

const nodeVersion = parseNodeVersion();
if (
  nodeVersion.major < 18 ||
  (nodeVersion.major === 18 && nodeVersion.minor < 18)
) {
  console.error("howdone: Node.js 18.18 or later is required.");
  process.exitCode = 1;
} else {
  const useNativeTypeScript = nodeVersion.major >= 23;
  const childArguments = useNativeTypeScript
    ? [
        "--eval",
        `import(${JSON.stringify(entryPointUrl)})`,
        entryPoint,
        ...process.argv.slice(2),
      ]
    : [
        "--import",
        getTsxEntryPoint(),
        "--eval",
        `import(${JSON.stringify(entryPointUrl)})`,
        entryPoint,
        ...process.argv.slice(2),
      ];

  const result = spawnSync(process.execPath, childArguments, {
    stdio: "inherit",
    windowsHide: false,
  });

  if (result.error) {
    console.error(`howdone: ${result.error.message}`);
    process.exitCode = 1;
  } else if (typeof result.status === "number") {
    process.exitCode = result.status;
  } else if (result.signal) {
    process.kill(process.pid, result.signal);
  }
}
