import { existsSync, readFileSync } from "node:fs";
import type { RuntimeDependency } from "howdone";

interface PackageMetadata {
  version: string;
  dependencies: Record<string, string>;
}

function readPackageMetadata(packageUrl: URL): PackageMetadata {
  return JSON.parse(readFileSync(packageUrl, "utf8")) as PackageMetadata;
}

function defaultPackageMetadataUrl(): URL {
  const sourceCliPackageUrl = new URL(
    "../../../packages/cli/package.json",
    import.meta.url,
  );
  return existsSync(sourceCliPackageUrl)
    ? sourceCliPackageUrl
    : new URL("../../../package.json", import.meta.url);
}

export function runtimeMetadataFor(packageUrl: URL): {
  version: string;
  runtimeDependencies: readonly RuntimeDependency[];
} {
  const packageMetadata = readPackageMetadata(packageUrl);
  return {
    version: packageMetadata.version,
    runtimeDependencies: Object.entries(packageMetadata.dependencies).map(
      ([name, version]) => ({ name, version }),
    ),
  };
}

const runtimeMetadata = runtimeMetadataFor(defaultPackageMetadataUrl());

export const packageVersion = runtimeMetadata.version;
export const packageRuntimeDependencies = runtimeMetadata.runtimeDependencies;
