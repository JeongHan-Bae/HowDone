import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("published package ships the hexagonal API contract", () => {
  const api = readFileSync(
    new URL("../../../node_modules/howdone/docs/api.md", import.meta.url),
    "utf8",
  );

  assert.match(api, /^# Public API/u);
  assert.match(api, /howdone\/application/u);
  assert.match(api, /interface CliDependencies/u);
  assert.match(api, /## Hexagonal package contract/u);
  assert.match(api, /## Package dependency boundary/u);
  assert.match(api, /## CLI composition and dependencies/u);
  assert.match(api, /mdast-util-to-string/u);
});
