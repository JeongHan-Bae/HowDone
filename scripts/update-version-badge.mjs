#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
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
const BADGE_LABEL_COLOR = "#555555";
const BADGE_NAMED_LOGO = "github";
const BADGE_COLOR = "#00a8c6";
const BADGE_STYLE = "flat";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = resolve(projectRoot, "package.json");
const badgePath = resolve(projectRoot, "version_badge.json");
const packageText = await readFile(packagePath, { encoding: "utf8" });
/** @type {PackageJson} */
const packageJson = JSON.parse(packageText);

if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
  throw new Error("package.json must contain a non-empty version string");
}

const projectVersion = packageJson.version;

/** @type {VersionBadge} */
const badge = {
  schemaVersion: BADGE_SCHEMA_VERSION,
  label: BADGE_LABEL,
  message: projectVersion,
  labelColor: BADGE_LABEL_COLOR,
  namedLogo: BADGE_NAMED_LOGO,
  color: BADGE_COLOR,
  style: BADGE_STYLE,
};

await writeFile(badgePath, `${JSON.stringify(badge, null, 2)}\n`, {
  encoding: "utf8",
});
console.log(`Updated version_badge.json to ${projectVersion}`);
