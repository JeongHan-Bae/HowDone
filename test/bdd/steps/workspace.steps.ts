import { Given, After } from "@cucumber/cucumber";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  createNativeVariantWorkspace,
  createWorkspace,
  frontmatterFixtures,
  frontmatterLayoutFixtures,
  nestedSourceFixture,
  removeWorkspace,
  type ScenarioState,
} from "./support.ts";

Given("a Markdown file containing:", function (this: ScenarioState, source: string) {
  createWorkspace(this, "tasks.md", source);
});

Given("the nested contract Markdown fixture", function (this: ScenarioState) {
  createWorkspace(this, "tasks.md", nestedSourceFixture.source);
});

Given(
  "the frontmatter fixture {string}",
  function (this: ScenarioState, id: string) {
    const fixture = frontmatterFixtures.cases.find(
      (candidate) => candidate.id === id,
    );
    if (fixture === undefined) {
      throw new Error("unknown frontmatter fixture: " + id);
    }
    createWorkspace(this, "tasks.md", fixture.source);
  },
);

Given(
  "the frontmatter layout fixture {string}",
  function (this: ScenarioState, id: string) {
    const fixture = frontmatterLayoutFixtures.cases.find(
      (candidate) => candidate.id === id,
    );
    if (fixture === undefined) {
      throw new Error("unknown frontmatter layout fixture: " + id);
    }
    createWorkspace(this, "tasks.md", fixture.source);
  },
);

Given(
  "a Markdown file named {string} containing:",
  function (this: ScenarioState, fileName: string, source: string) {
    createWorkspace(this, fileName, source);
  },
);

Given(
  "a file named {string} containing:",
  function (this: ScenarioState, fileName: string, source: string) {
    createWorkspace(this, fileName, source);
  },
);

Given(
  "a Markdown directory named {string}",
  function (this: ScenarioState, directoryName: string) {
    const directory = mkdtempSync(path.join(tmpdir(), "howdone-bdd-"));
    const filePath = path.resolve(directory, directoryName);
    mkdirSync(filePath, { recursive: true });
    this.directory = directory;
    this.filePath = filePath;
  },
);

Given("an empty howdone workspace", function (this: ScenarioState) {
  this.directory = mkdtempSync(path.join(tmpdir(), "howdone-bdd-"));
});

Given(
  "a Markdown fixture for native path variant {string} containing:",
  function (this: ScenarioState, kind: string, source: string) {
    createNativeVariantWorkspace(this, kind, source);
  },
);

After(function (this: ScenarioState) {
  removeWorkspace(this);
});
