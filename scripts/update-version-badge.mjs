#!/usr/bin/env node

import { appendFile, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// @ts-check

/** @typedef {{ version?: unknown }} PackageJson */
/**
 * @typedef {Object} VersionBadge
 * @property {number} schemaVersion
 * @property {string} label
 * @property {string} message
 * @property {string} labelColor
 * @property {string} namedLogo
 * @property {string} color
 * @property {string} style
 */

const BADGE_SCHEMA_VERSION = 1;
const BADGE_LABEL = "HowDone";
const BADGE_CLI_LABEL = "HowDone-CLI";
const BADGE_LABEL_COLOR = "#555555";
const BADGE_NAMED_LOGO = "github";
const BADGE_COLOR = "#00a8c6";
const BADGE_CLI_COLOR = "#CD5C5C";
const BADGE_STYLE = "flat";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corePackagePath = resolve(projectRoot, "packages", "core", "package.json");
const cliPackagePath = resolve(projectRoot, "packages", "cli", "package.json");
const coreBadgePath = resolve(projectRoot, "version_badge.json");
const cliBadgePath = resolve(projectRoot, "version_badge_cli.json");

/**
 * @param {string} packagePath
 * @param {string} packageLabel
 * @returns {Promise<string>}
 */
async function readPackageVersion(packagePath, packageLabel) {
  const packageText = await readFile(packagePath, { encoding: "utf8" });
  /** @type {PackageJson} */
  const packageJson = JSON.parse(packageText);

  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error(`${packageLabel} must contain a non-empty version string`);
  }

  return packageJson.version;
}

/**
 * @param {string} label
 * @param {string} version
 * @param {string} color
 * @returns {VersionBadge}
 */
function createBadge(label, version, color) {
  return {
    schemaVersion: BADGE_SCHEMA_VERSION,
    label,
    message: version,
    labelColor: BADGE_LABEL_COLOR,
    namedLogo: BADGE_NAMED_LOGO,
    color,
    style: BADGE_STYLE,
  };
}

const [coreVersion, cliVersion] = await Promise.all([
  readPackageVersion(corePackagePath, "packages/core/package.json"),
  readPackageVersion(cliPackagePath, "packages/cli/package.json"),
]);

const badges = [
  {
    path: coreBadgePath,
    badge: createBadge(BADGE_LABEL, coreVersion, BADGE_COLOR),
    label: "version_badge.json",
  },
  {
    path: cliBadgePath,
    badge: createBadge(BADGE_CLI_LABEL, cliVersion, BADGE_CLI_COLOR),
    label: "version_badge_cli.json",
  },
];

for (const { path, badge, label } of badges) {
  await writeFile(path, `${JSON.stringify(badge, null, 2)}\n`, {
    encoding: "utf8",
  });
  console.log(`Updated ${label} to ${badge.message}`);
}

const githubOutputPath = process.env.GITHUB_OUTPUT;
if (githubOutputPath !== undefined) {
  await appendFile(
    githubOutputPath,
    `core_version=${coreVersion}\ncli_version=${cliVersion}\n`,
    { encoding: "utf8" },
  );
}
