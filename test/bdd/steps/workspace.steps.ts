import { Given, After } from "@cucumber/cucumber";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  createNativeVariantWorkspace,
  createWorkspace,
  displayFixtures,
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
  createWorkspace(
    this,
    "tasks.md",
    nestedSourceFixture.source,
    "nested:nested-contract",
  );
});

Given(
  "the ASCII-escaped display fixture {string}",
  function (this: ScenarioState, id: string) {
    const fixture = displayFixtures.cases.find(
      (candidate) => candidate.id === id,
    );
    if (fixture === undefined) {
      throw new Error("unknown display fixture: " + id);
    }
    createWorkspace(this, fixture.fileName, fixture.source, `display:${id}`);
  },
);

Given(
  "the frontmatter fixture {string}",
  function (this: ScenarioState, id: string) {
    const fixture = frontmatterFixtures.cases.find(
      (candidate) => candidate.id === id,
    );
    if (fixture === undefined) {
      throw new Error("unknown frontmatter fixture: " + id);
    }
    createWorkspace(this, "tasks.md", fixture.source, `frontmatter:${id}`);
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
    createWorkspace(this, "tasks.md", fixture.source, `layout:${id}`);
  },
);

Given(
  "a Markdown file named {string} containing:",
  function (this: ScenarioState, fileName: string, source: string) {
    createWorkspace(this, fileName, source);
  },
);

Given(
  "another Markdown file named {string} containing:",
  function (this: ScenarioState, fileName: string, source: string) {
    if (this.directory === undefined) {
      throw new Error("the BDD workspace has not been created");
    }
    const filePath = path.resolve(this.directory, fileName);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, source, "utf8");
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
