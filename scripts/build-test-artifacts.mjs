#!/usr/bin/env node
// @ts-check

import { cpSync, copyFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL("..", import.meta.url).href);
const compiledRoot = resolve(projectRoot, "packages", "core", "dist");
const compiledCliRoot = resolve(projectRoot, "packages", "cli", "dist");
const outputRoot = resolve(projectRoot, ".test-build");
const tscPath = require.resolve("typescript/bin/tsc");

rmSync(compiledRoot, { recursive: true, force: true });
rmSync(compiledCliRoot, { recursive: true, force: true });
rmSync(outputRoot, { recursive: true, force: true });

for (const project of [
  "tsconfig.build.json",
  "tsconfig.cli-build.json",
  "tsconfig.test-build.json",
]) {
  execFileSync(
    process.execPath,
    [tscPath, "--project", project],
    { cwd: projectRoot, stdio: "inherit" },
  );
}

rmSync(resolve(outputRoot, "src"), { recursive: true, force: true });
cpSync(compiledRoot, resolve(outputRoot, "src"), { recursive: true });

cpSync(
  resolve(projectRoot, "test", "tdd", "fixtures"),
  resolve(outputRoot, "test", "tdd", "fixtures"),
  { recursive: true },
);
copyFileSync(
  resolve(projectRoot, "package.json"),
  resolve(outputRoot, "package.json"),
);
