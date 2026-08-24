import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

export interface ScenarioState {
  directory?: string;
  filePath?: string;
  result?: ReturnType<typeof spawnSync>;
}

interface PackageMetadata {
  version: string;
}

interface PathVariant {
  kind: string;
  segments: readonly string[];
  absolute: boolean;
}

interface PathFixtures {
  pathVariants: readonly PathVariant[];
}

interface NestedSourceFixture {
  source: string;
}

interface FrontmatterCase {
  id: string;
  source: string;
}

interface FrontmatterFixtures {
  cases: readonly FrontmatterCase[];
}

export const pathFixtures = JSON.parse(
  readFileSync(new URL("../fixtures/path-variants.json", import.meta.url), "utf8"),
) as PathFixtures;

export const packageVersion = (JSON.parse(
  readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
) as PackageMetadata).version;

export const nestedSourceFixture = JSON.parse(
  readFileSync(new URL("../fixtures/nested-sources.json", import.meta.url), "utf8"),
) as NestedSourceFixture;

export const frontmatterFixtures = JSON.parse(
  readFileSync(new URL("../fixtures/frontmatter-sources.json", import.meta.url), "utf8"),
) as FrontmatterFixtures;

export const frontmatterLayoutFixtures = JSON.parse(
  readFileSync(new URL("../fixtures/frontmatter-layout-sources.json", import.meta.url), "utf8"),
) as FrontmatterFixtures;

export function createWorkspace(
  world: ScenarioState,
  fileName: string,
  source: string,
): void {
  const directory = mkdtempSync(path.join(tmpdir(), "howdone-bdd-"));
  const filePath = path.resolve(directory, fileName);
  mkdirSync(path.dirname(filePath), { recursive: true });
  world.directory = directory;
  world.filePath = filePath;
  writeFileSync(filePath, source, "utf8");
}

export function createNativeVariantWorkspace(
  world: ScenarioState,
  kind: string,
  source: string,
): void {
  const directory = mkdtempSync(path.join(tmpdir(), "howdone-bdd-"));
  const variant = pathFixtures.pathVariants.find(
    (candidate) => candidate.kind === kind,
  );
  if (variant === undefined) {
    throw new Error("unsupported native path kind: " + kind);
  }
  const filePath = path.resolve(directory, ...variant.segments);
  mkdirSync(path.dirname(filePath), { recursive: true });
  world.directory = directory;
  world.filePath = filePath;
  writeFileSync(filePath, source, "utf8");
}

export function splitArguments(value: string): string[] {
  const matches = value.match(/(?:[^\s"]+|"[^"]*")+/gu) ?? [];
  return matches.map((argument) =>
    argument.startsWith('"') && argument.endsWith('"')
      ? argument.slice(1, -1)
      : argument,
  );
}

export function runHowdone(
  world: ScenarioState,
  argumentsValue: readonly string[],
): void {
  if (world.directory === undefined) {
    throw new Error("the BDD workspace has not been created");
  }
  const entryPoint = path.resolve(process.cwd(), "bin", "howdone.cjs");
  world.result = spawnSync(process.execPath, [entryPoint, ...argumentsValue], {
    cwd: world.directory,
    encoding: "utf8",
  });
}

export function nativePathArgument(world: ScenarioState, kind: string): string {
  if (world.directory === undefined || world.filePath === undefined) {
    throw new Error("the BDD file workspace has not been created");
  }
  const relativePath = path.relative(world.directory, world.filePath);
  if (kind === "absolute") {
    return world.filePath;
  }
  if (kind === "relative" || kind === "relative-space") {
    return relativePath;
  }
  if (kind === "absolute-space") {
    return world.filePath;
  }
  if (kind === "relative-dot") {
    return path.format({ dir: ".", base: relativePath });
  }
  throw new Error("unsupported native path kind: " + kind);
}

export function stdoutText(world: ScenarioState): string {
  const stdout = world.result?.stdout;
  return typeof stdout === "string"
    ? stdout
    : stdout?.toString("utf8") ?? "";
}

export function stderrText(world: ScenarioState): string {
  const stderr = world.result?.stderr;
  return typeof stderr === "string"
    ? stderr
    : stderr?.toString("utf8") ?? "";
}

export function removeWorkspace(world: ScenarioState): void {
  if (world.directory !== undefined) {
    rmSync(world.directory, { recursive: true, force: true });
  }
}
