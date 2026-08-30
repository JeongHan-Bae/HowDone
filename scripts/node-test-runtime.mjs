// @ts-check

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

/**
 * @param {readonly string[]} testFiles
 * @returns {string[]}
 */
export function nodeTestArguments(testFiles) {
  const majorVersion = Number(process.versions.node.split(".")[0]);
  if (majorVersion >= 23) {
    return ["--test", ...testFiles];
  }
  return [
    "--import",
    pathToFileURL(require.resolve("tsx")).href,
    "--test",
    ...testFiles,
  ];
}
