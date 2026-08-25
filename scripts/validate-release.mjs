#!/usr/bin/env node
// @ts-check

import { appendFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {"both" | "cli" | "core"} ReleaseKind */

/** @typedef {{ version: string, kind: ReleaseKind }} ReleaseSpec */

const projectRoot = fileURLToPath(new URL("..", import.meta.url).href);
const releaseTag = process.argv[2] ?? process.env.RELEASE_TAG;

/** @param {unknown} value */
function isRecord(value) {
  return typeof value === "object" && value !== null;
}

/** @param {string} filePath */
function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

/** @param {string} version */
function isStableVersion(version) {
  return /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u.test(version);
}

/** @param {string} version */
function majorMinor(version) {
  const match = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\./u.exec(version);
  if (match === null) throw new Error(`invalid stable version: ${version}`);
  return `${match[1]}.${match[2]}`;
}

/** @param {string} tag */
function parseReleaseTag(tag) {
  const match = /^v((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))(?:-(cli|core))?$/u.exec(tag);
  if (match === null) {
    throw new Error(
      `invalid release tag ${tag}; expected vX.Y.Z, vX.Y.Z-cli, or vX.Y.Z-core`,
    );
  }
  return {
    version: match[1],
    kind: /** @type {ReleaseKind} */ (match[2] ?? "both"),
  };
}

/**
 * @param {string} name
 * @param {string} version
 */
function packageVersionExists(name, version) {
  try {
    const output = execFileSync(
      "npm",
      ["view", `${name}@${version}`, "version", "--json"],
      {
        cwd: projectRoot,
        encoding: "utf8",
        env: { ...process.env, npm_config_loglevel: "error" },
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();
    return JSON.parse(output) === version;
  } catch (error) {
    const record = /** @type {{ stderr?: string | Buffer, message?: string }} */ (error);
    const detail = String(record.stderr ?? record.message ?? "");
    if (/E404|404 Not Found|not in this registry/iu.test(detail)) return false;
    throw new Error(`could not inspect ${name}@${version} on npm: ${detail}`);
  }
}

/** @param {string} message */
function fail(message) {
  console.error(`::error::${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

/**
 * @param {ReleaseSpec} release
 * @param {string} coreVersion
 */
function writeOutputs(release, coreVersion) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile === undefined) return;
  appendFileSync(
    outputFile,
    `version=${release.version}\nkind=${release.kind}\ncore_version=${coreVersion}\n` +
      `publish_core=${release.kind === "both" || release.kind === "core"}\n` +
      `publish_cli=${release.kind === "both" || release.kind === "cli"}\n`,
    "utf8",
  );
}

function main() {
  if (typeof releaseTag !== "string") fail("release tag is missing");
  const release = parseReleaseTag(releaseTag);
  const core = readJson(resolve(projectRoot, "packages", "core", "package.json"));
  const cli = readJson(resolve(projectRoot, "packages", "cli", "package.json"));
  const lock = readJson(resolve(projectRoot, "package-lock.json"));
  const coreDependency = cli.dependencies?.howdone;

  for (const [name, metadata] of [["core", core], ["cli", cli]]) {
    if (!isRecord(metadata) || typeof metadata.version !== "string") {
      fail(`${name} package version is missing`);
    }
    if (!isStableVersion(metadata.version)) {
      fail(`${name} package version must be X.Y.Z: ${metadata.version}`);
    }
  }
  if (typeof coreDependency !== "string" || !isStableVersion(coreDependency)) {
    fail(`CLI dependency howdone must be an exact X.Y.Z version: ${coreDependency}`);
  }

  if (majorMinor(core.version) !== majorMinor(cli.version)) {
    fail(`core and CLI major/minor versions must match: ${core.version} vs ${cli.version}`);
  }
  if (majorMinor(core.version) !== majorMinor(coreDependency)) {
    fail(`CLI dependency major/minor must match core: ${coreDependency} vs ${core.version}`);
  }
  if (coreDependency !== core.version) {
    fail(`CLI dependency must equal the current core version: ${coreDependency} vs ${core.version}`);
  }

  const lockPackages = lock.packages ?? {};
  for (const [path, metadata] of [["packages/core", core], ["packages/cli", cli]]) {
    if (lockPackages[path]?.version !== metadata.version) {
      fail(`package-lock.json entry ${path} is not synchronized with ${metadata.version}`);
    }
  }
  if (lockPackages["packages/cli"]?.dependencies?.howdone !== core.version) {
    fail("package-lock.json CLI core dependency is not synchronized");
  }

  if (release.kind === "both") {
    if (core.version !== release.version || cli.version !== release.version) {
      fail(`both packages must be ${release.version} for tag ${releaseTag}`);
    }
  } else if (release.kind === "cli") {
    if (cli.version !== release.version) {
      fail(`CLI package must be ${release.version} for tag ${releaseTag}`);
    }
    if (!packageVersionExists("howdone", core.version)) {
      fail(`CLI-only release requires published howdone@${core.version}`);
    }
  } else if (core.version !== release.version) {
    fail(`core package must be ${release.version} for tag ${releaseTag}`);
  }

  const targets = release.kind === "both"
    ? [["howdone", core.version], ["howdone-cli", cli.version]]
    : release.kind === "core"
      ? [["howdone", core.version]]
      : [["howdone-cli", cli.version]];
  for (const [name, version] of targets) {
    if (packageVersionExists(name, version)) {
      fail(`${name}@${version} is already published; refusing ${releaseTag} before publishing either target`);
    }
  }

  writeOutputs(release, core.version);
  console.log(
    `Release ${releaseTag} validated: ${release.kind}; ` +
      `core=${core.version}; cli=${cli.version}; dependency=${coreDependency}`,
  );
}

try {
  main();
} catch (error) {
  if (process.exitCode !== 1) {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
}
