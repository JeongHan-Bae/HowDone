// @ts-check

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

/** @typedef {"source" | "compiled" | "package"} BddRuntime */

const runtime = /** @type {BddRuntime | undefined} */ (process.argv[2]);
if (runtime !== "source" && runtime !== "compiled" && runtime !== "package") {
  console.error("run-cucumber: runtime must be source, compiled, or package");
  process.exitCode = 1;
} else {
  const require = createRequire(import.meta.url);
  const cucumberPackageDirectory = dirname(
    require.resolve("@cucumber/cucumber"),
  );
  const cucumberEntryPoint = resolve(
    cucumberPackageDirectory,
    "..",
    "bin",
    "cucumber.js",
  );
  const config = runtime === "package"
    ? "test/package/bdd/cucumber.cjs"
    : "test/bdd/cucumber.cjs";
  const nodeArguments = runtime === "source"
    ? ["--conditions=source", cucumberEntryPoint, "--config", config]
    : [cucumberEntryPoint, "--config", config];
  const result = spawnSync(
    process.execPath,
    nodeArguments,
    {
      env: {
        ...process.env,
        HOWDONE_BDD_RUNTIME: runtime,
      },
      stdio: "inherit",
      windowsHide: false,
    },
  );

  if (result.error) {
    console.error(`run-cucumber: ${result.error.message}`);
    process.exitCode = 1;
  } else if (typeof result.status === "number") {
    process.exitCode = result.status;
  } else if (result.signal) {
    process.kill(process.pid, result.signal);
  }
}
