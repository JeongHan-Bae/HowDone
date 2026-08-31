#!/usr/bin/env node
// @ts-check

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { nodeTestArguments } from "./node-test-runtime.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url).href);
const testFiles = [
  "test/index.test.ts",
  "test/tdd/index.test.ts",
];

execFileSync(
  process.execPath,
  ["--conditions=source", ...nodeTestArguments(testFiles)],
  { cwd: projectRoot, stdio: "inherit" },
);
