import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function runIfEntrypoint(
  moduleUrl: string,
  main: () => Promise<number>,
): void {
  const processEntry = process.argv[1];
  if (processEntry === undefined) return;
  const entryUrl = pathToFileURL(realpathSync(resolve(processEntry))).href;
  const currentModuleUrl = pathToFileURL(
    realpathSync(fileURLToPath(moduleUrl)),
  ).href;
  if (currentModuleUrl !== entryUrl) return;

  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
