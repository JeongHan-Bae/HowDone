import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HELP_SECTIONS,
  HELP_TEXT,
  renderHelpText,
} from "../../src/application/cli/help.ts";

test("TDD help content keeps usage, options, and sections structured", () => {
  assert.equal(typeof HELP_SECTIONS.usage, "string");
  assert.equal(Array.isArray(HELP_SECTIONS.options), true);
  assert.ok(HELP_SECTIONS.options.length > 0);

  const format = HELP_SECTIONS.options.find(
    (option) => option.command === "--format",
  );
  const percentage = HELP_SECTIONS.options.find(
    (option) => option.command === "--percentage",
  );
  assert.deepEqual(format?.argument, "decimal|percentage");
  assert.deepEqual(percentage?.argument, "");
  assert.ok(HELP_SECTIONS.options.every((option) =>
    option.description.every((line) => typeof line === "string")
  ));

  assert.match(HELP_TEXT, /^Usage:\n/u);
  assert.match(HELP_TEXT, /Syntax reference:/u);
  assert.equal(HELP_TEXT, renderHelpText(HELP_SECTIONS));
});
