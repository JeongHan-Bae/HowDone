import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { npmCliArguments } from "./npm-runtime.mjs";

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
  filename: string;
  name: string;
  version: string;
  files: PackageFile[];
  unpackedSize: number;
}

interface PackArtifact {
  report: PackageReport;
  archivePath: string;
}

interface DocumentComparison {
  source: string;
  packaged: string;
}

interface PackageSpec {
  directory: string;
  expectedName: string;
  requiredFiles: readonly string[];
  allowedFiles: (file: string) => boolean;
  documentComparisons: readonly DocumentComparison[];
}

function isPackageReport(value: unknown): value is PackageReport {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const report = value as Partial<PackageReport>;
  return (
    typeof report.filename === "string" &&
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

function packPackage(spec: PackageSpec, cacheDirectory: string): PackArtifact {
  const output = execFileSync(
    process.execPath,
    npmCliArguments([
      "pack",
      "--json",
      "--pack-destination",
      cacheDirectory,
    ]),
    {
      cwd: spec.directory,
      encoding: "utf8",
      env: {
        ...process.env,
        npm_config_cache: cacheDirectory,
      },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  const report = readPackageReport(output);
  return {
    report,
    archivePath: resolve(cacheDirectory, report.filename),
  };
}

function tarField(header: Buffer, start: number, length: number): string {
  const value = header.subarray(start, start + length).toString("utf8");
  const terminator = value.indexOf("\0");
  return (terminator === -1 ? value : value.slice(0, terminator)).trim();
}

function tarEntryPath(header: Buffer): string {
  const name = tarField(header, 0, 100);
  const prefix = tarField(header, 345, 155);
  return prefix === "" ? name : `${prefix}/${name}`;
}

function tarEntrySize(header: Buffer): number {
  const value = tarField(header, 124, 12);
  if (value === "") {
    return 0;
  }
  const size = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new Error("npm pack returned an invalid tar entry size");
  }
  return size;
}

function readPackagedFile(archivePath: string, packagedPath: string): Buffer {
  const archive = gunzipSync(readFileSync(archivePath));
  const targetPath = `package/${packagedPath}`;
  const blockSize = 512;
  let offset = 0;

  while (offset + blockSize <= archive.length) {
    const header = archive.subarray(offset, offset + blockSize);
    if (header.every((byte) => byte === 0)) {
      break;
    }

    const size = tarEntrySize(header);
    const dataStart = offset + blockSize;
    const dataEnd = dataStart + size;
    if (dataEnd > archive.length) {
      throw new Error("npm pack returned a truncated tar archive");
    }

    if (tarEntryPath(header) === targetPath) {
      const type = header[156];
      if (type !== 0 && type !== 48) {
        throw new Error(`npm pack entry ${packagedPath} is not a regular file`);
      }
      return archive.subarray(dataStart, dataEnd);
    }

    offset = dataStart + Math.ceil(size / blockSize) * blockSize;
  }

  throw new Error(`npm pack did not include ${packagedPath}`);
}

function comparePackagedDocuments(
  spec: PackageSpec,
  projectRoot: string,
  artifact: PackArtifact,
): void {
  for (const document of spec.documentComparisons) {
    const source = readFileSync(resolve(projectRoot, document.source));
    const packaged = readPackagedFile(artifact.archivePath, document.packaged);
    if (!source.equals(packaged)) {
      throw new Error(
        `${spec.expectedName} packaged ${document.packaged} does not match ${document.source}`,
      );
    }
  }
}

function checkPackage(
  spec: PackageSpec,
  projectRoot: string,
  cacheDirectory: string,
): void {
  const metadata = readPackageMetadata(spec.directory);
  const artifact = packPackage(spec, cacheDirectory);
  const report = artifact.report;
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
  comparePackagedDocuments(spec, projectRoot, artifact);

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
        documentComparisons: [
          { source: "packages/core/README.md", packaged: "README.md" },
          { source: "docs/api.md", packaged: "docs/api.md" },
          { source: "LICENSE", packaged: "LICENSE" },
        ],
        allowedFiles: (file) =>
          file === "LICENSE" ||
          file === "README.md" ||
          file === "package.json" ||
          file === "docs/api.md" ||
          file.startsWith("dist/core/") ||
          file.startsWith("dist/application/"),
      },
      projectRoot,
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
        documentComparisons: [
          { source: "packages/cli/README.md", packaged: "README.md" },
          { source: "docs/guide.md", packaged: "docs/guide.md" },
          { source: "docs/syntax.md", packaged: "docs/syntax.md" },
          { source: "LICENSE", packaged: "LICENSE" },
        ],
        allowedFiles: (file) =>
          file === "LICENSE" ||
          file === "README.md" ||
          file === "package.json" ||
          file === "docs/guide.md" ||
          file === "docs/syntax.md" ||
          file.startsWith("dist/"),
      },
      projectRoot,
      cacheDirectory,
    );
  } finally {
    rmSync(cacheDirectory, { recursive: true, force: true });
  }
}

main();
