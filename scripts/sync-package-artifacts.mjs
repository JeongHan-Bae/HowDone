#!/usr/bin/env node
// @ts-check

import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url).href);

/**
 * @param {string} packageName
 * @param {string} sourceName
 * @param {string} targetName
 */
function copyIntoPackage(packageName, sourceName, targetName) {
  const targetDirectory = resolve(projectRoot, "packages", packageName, "docs");
  mkdirSync(targetDirectory, { recursive: true });
  copyFileSync(
    resolve(projectRoot, sourceName),
    resolve(targetDirectory, targetName),
  );
  copyFileSync(
    resolve(projectRoot, "LICENSE"),
    resolve(projectRoot, "packages", packageName, "LICENSE"),
  );
}

copyIntoPackage("core", "docs/api.md", "api.md");
copyIntoPackage("cli", "docs/syntax.md", "syntax.md");
