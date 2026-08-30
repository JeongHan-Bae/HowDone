import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildProgressReport,
  summarizeProgress,
} from "howdone";
import type {
  CheckboxNode,
  FrontmatterChecklist,
  FrontmatterFormat,
  FrontmatterProgress,
  ProgressReport,
  ProgressResult,
} from "howdone";

interface ProgressInput {
  roots: CheckboxNode[];
}

interface FrontmatterInput {
  format: FrontmatterFormat;
  checklists: FrontmatterChecklist[];
  roots: CheckboxNode[];
}

interface ReportCase {
  id: string;
  sourcePath: string;
  markdown: ProgressInput;
  frontmatter: FrontmatterInput[];
  markdownPresent: boolean;
  options: {
    mergeFrontmatter: boolean;
    frontmatterWeight?: number;
  };
  expectedFlags: {
    mergeIgnored: boolean;
    weightIgnored: boolean;
  };
  expectedReport: Record<string, unknown>;
}

interface ReportFixtures {
  cases: ReportCase[];
}

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/report-contracts.json", import.meta.url), "utf8"),
) as ReportFixtures;

function progressFor(input: ProgressInput): ProgressResult {
  return summarizeProgress(input.roots);
}

function frontmatterFor(input: FrontmatterInput): FrontmatterProgress {
  return {
    format: input.format,
    checklists: input.checklists,
    progress: progressFor(input),
  };
}

function serializable(report: ProgressReport): unknown {
  return JSON.parse(JSON.stringify(report));
}

for (const fixture of fixtures.cases) {
  test(`TDD report contract ${fixture.id} preserves complete source layout`, () => {
    const markdown = progressFor(fixture.markdown);
    const frontmatter = fixture.frontmatter.map(frontmatterFor);
    const built = buildProgressReport(
      fixture.sourcePath,
      markdown,
      frontmatter,
      fixture.markdownPresent,
      fixture.options,
    );

    assert.deepEqual(
      {
        mergeIgnored: built.mergeIgnored,
        weightIgnored: built.weightIgnored,
      },
      fixture.expectedFlags,
    );
    assert.deepEqual(serializable(built.report), fixture.expectedReport);
    assert.equal(
      built.report.frontmatterWeight,
      typeof fixture.expectedReport.frontmatterWeight === "number"
        ? fixture.expectedReport.frontmatterWeight
        : undefined,
    );
  });
}
