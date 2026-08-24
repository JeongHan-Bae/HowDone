import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

interface PackageMetadata {
  name: string;
  version: string;
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

function isAllowedPackageFile(file: string): boolean {
  return (
    file === "LICENSE" ||
    file === "README.md" ||
    file === "package.json" ||
    file === "bin/howdone.cjs" ||
    file === "docs/syntax.md" ||
    file.startsWith("src/")
  );
}

function main(): void {
  const packageMetadata = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as PackageMetadata;
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "inherit"],
  });
  const report = readPackageReport(output);

  if (
    report.name !== packageMetadata.name ||
    report.version !== packageMetadata.version
  ) {
    throw new Error("npm pack metadata does not match package.json");
  }

  const requiredFiles = [
    "LICENSE",
    "README.md",
    "bin/howdone.cjs",
    "docs/syntax.md",
    "package.json",
  ];
  const files = report.files.map(({ path }) => path).sort();
  const unexpectedFiles = files.filter((file) => !isAllowedPackageFile(file));
  const missingFiles = requiredFiles.filter((file) => !files.includes(file));

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
    throw new Error(`npm package contents are invalid: ${details}`);
  }

  console.log(
    `Package contents OK: ${files.length} files, ${report.unpackedSize} unpacked bytes`,
  );
}

main();
