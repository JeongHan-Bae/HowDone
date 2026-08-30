import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

interface PackageMetadata {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  bin?: Record<string, string>;
}

interface PackageFile {
  path: string;
}

interface PackageReport {
  name: string;
  version: string;
  files: PackageFile[];
  unpackedSize: number;
}

interface PackageSpec {
  directory: string;
  expectedName: string;
  requiredFiles: readonly string[];
  allowedFiles: (file: string) => boolean;
}

function isPackageReport(value: unknown): value is PackageReport {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const report = value as Partial<PackageReport>;
  return (
    typeof report.name === "string" &&
    typeof report.version === "string" &&
    typeof report.unpackedSize === "number" &&
    Array.isArray(report.files) &&
    report.files.every(
      (file): file is PackageFile =>
        typeof file === "object" &&
        file !== null &&
        typeof (file as Partial<PackageFile>).path === "string",
    )
  );
}

function readPackageReport(output: string): PackageReport {
  const reports: unknown = JSON.parse(output);
  if (!Array.isArray(reports) || reports.length === 0) {
    throw new Error("npm pack did not return a package file report");
  }
  const report = reports[0];
  if (!isPackageReport(report)) {
    throw new Error("npm pack returned an invalid package file report");
  }
  return report;
}

function readPackageMetadata(directory: string): PackageMetadata {
  return JSON.parse(
    readFileSync(resolve(directory, "package.json"), "utf8"),
  ) as PackageMetadata;
}

function packReport(spec: PackageSpec, cacheDirectory: string): PackageReport {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: spec.directory,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: cacheDirectory,
    },
    shell: true,
    stdio: ["ignore", "pipe", "inherit"],
  });
  return readPackageReport(output);
}

function checkPackage(spec: PackageSpec, cacheDirectory: string): void {
  const metadata = readPackageMetadata(spec.directory);
  const report = packReport(spec, cacheDirectory);
  const files = report.files.map(({ path }) => path).sort();
  const unexpectedFiles = files.filter((file) => !spec.allowedFiles(file));
  const missingFiles = spec.requiredFiles.filter((file) => !files.includes(file));

  if (metadata.name !== spec.expectedName || report.name !== metadata.name) {
    throw new Error(
      `${spec.expectedName} npm pack name does not match package.json`,
    );
  }
  if (report.version !== metadata.version) {
    throw new Error(
      `${spec.expectedName} npm pack version does not match package.json`,
    );
  }
  if (unexpectedFiles.length > 0 || missingFiles.length > 0) {
    const details = [
      unexpectedFiles.length > 0
        ? `unexpected files: ${unexpectedFiles.join(", ")}`
        : undefined,
      missingFiles.length > 0
        ? `missing files: ${missingFiles.join(", ")}`
        : undefined,
    ]
      .filter((value): value is string => value !== undefined)
      .join("; ");
    throw new Error(`${spec.expectedName} package contents are invalid: ${details}`);
  }

  console.log(
    `${metadata.name}@${metadata.version} contents OK: ${files.length} files, ${report.unpackedSize} unpacked bytes`,
  );
}

function main(): void {
  const projectRoot = fileURLToPath(new URL("..", import.meta.url).href);
  const coreDirectory = resolve(projectRoot, "packages", "core");
  const cliDirectory = resolve(projectRoot, "packages", "cli");
  const core = readPackageMetadata(coreDirectory);
  const cli = readPackageMetadata(cliDirectory);

  if (Object.keys(core.dependencies ?? {}).length > 0 || core.bin !== undefined) {
    throw new Error("howdone core package must have no runtime dependencies or bin");
  }
  if (cli.dependencies?.howdone !== core.version) {
    throw new Error("howdone-cli must depend on the matching howdone version");
  }
  if (cli.bin?.howdone !== "./dist/boot/cli-main.js") {
    throw new Error("howdone-cli must expose the howdone bin");
  }

  const cacheDirectory = mkdtempSync(resolve(tmpdir(), "howdone-pack-cache-"));
  try {
    checkPackage(
      {
        directory: coreDirectory,
        expectedName: "howdone",
        requiredFiles: [
          "LICENSE",
          "README.md",
          "docs/api.md",
          "dist/application/index.d.ts",
          "dist/application/index.js",
          "dist/core/index.d.ts",
          "dist/core/index.js",
          "package.json",
        ],
        allowedFiles: (file) =>
          file === "LICENSE" ||
          file === "README.md" ||
          file === "package.json" ||
          file === "docs/api.md" ||
          file.startsWith("dist/core/") ||
          file.startsWith("dist/application/"),
      },
      cacheDirectory,
    );
    checkPackage(
      {
        directory: cliDirectory,
        expectedName: "howdone-cli",
        requiredFiles: [
          "LICENSE",
          "README.md",
          "docs/guide.md",
          "docs/syntax.md",
          "dist/boot/cli-main.js",
          "package.json",
        ],
        allowedFiles: (file) =>
          file === "LICENSE" ||
          file === "README.md" ||
          file === "package.json" ||
          file === "docs/guide.md" ||
          file === "docs/syntax.md" ||
          file.startsWith("dist/"),
      },
      cacheDirectory,
    );
  } finally {
    rmSync(cacheDirectory, { recursive: true, force: true });
  }
}

main();
