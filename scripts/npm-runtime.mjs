// @ts-check

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** @returns {string} */
function locateNpmCli() {
  const configuredPath = process.env.npm_execpath;
  if (configuredPath !== undefined && configuredPath.length > 0) {
    const resolvedConfiguredPath = resolve(configuredPath);
    if (existsSync(resolvedConfiguredPath)) return resolvedConfiguredPath;
  }

  let directory = dirname(process.execPath);
  while (true) {
    const candidates = [
      resolve(directory, "lib", "node_modules", "npm", "bin", "npm-cli.js"),
      resolve(directory, "node_modules", "npm", "bin", "npm-cli.js"),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }

    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  throw new Error(
    "Unable to locate npm's JavaScript CLI. Use a Node.js installation that includes npm.",
  );
}

/**
 * @param {readonly string[]} argumentsList
 * @returns {string[]}
 */
export function npmCliArguments(argumentsList) {
  return [locateNpmCli(), ...argumentsList];
}
