#!/usr/bin/env node
// @ts-check

import { readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

const generatedDirectories = [
  ".test-build",
  "build",
  "coverage",
  "dist",
  "out",
  "packages/cli/dist",
  "packages/core/dist",
  "test-results",
];

for (const directory of generatedDirectories) {
  rmSync(resolve(projectRoot, directory), { force: true, recursive: true });
}

for (const directory of [
  projectRoot,
  resolve(projectRoot, "packages", "cli"),
  resolve(projectRoot, "packages", "core"),
]) {
  for (const entry of readdirSync(directory)) {
    if (entry.endsWith(".tsbuildinfo")) {
      rmSync(resolve(directory, entry), { force: true });
    }
  }
}

console.log("Cleaned generated build, test, coverage, and TypeScript cache artifacts.");
