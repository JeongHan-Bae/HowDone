import type { FrontmatterProgress, ProgressReport, ProgressResult } from "./types.ts";
import { calculateCombinedProgress } from "./analyzer.ts";

export interface ProgressReportOptions {
  mergeFrontmatter: boolean;
  frontmatterWeight?: number;
}

export interface ProgressReportBuild {
  report: ProgressReport;
  mergeIgnored: boolean;
  weightIgnored: boolean;
}

function frontmatterRootCount(
  sections: readonly FrontmatterProgress[],
): number {
  return sections.reduce(
    (total, section) => total + section.progress.rootCount,
    0,
  );
}

function resolvedFrontmatterWeight(
  markdown: ProgressResult,
  frontmatter: readonly FrontmatterProgress[],
  requestedWeight: number | undefined,
): number | undefined {
  const frontmatterRoots = frontmatterRootCount(frontmatter);
  const totalRoots = markdown.rootCount + frontmatterRoots;
  if (markdown.rootCount === 0 || frontmatterRoots === 0) return undefined;
  return requestedWeight ?? frontmatterRoots / totalRoots;
}

export function buildProgressReport(
  sourcePath: string,
  markdown: ProgressResult,
  frontmatter: readonly FrontmatterProgress[],
  markdownPresent: boolean,
  options: ProgressReportOptions,
): ProgressReportBuild {
  const frontmatterPresent = frontmatter.length > 0;
  const componentCount = frontmatter.length + (markdownPresent ? 1 : 0);
  const mergeIgnored = options.mergeFrontmatter && componentCount < 2;
  let mergeFrontmatter = options.mergeFrontmatter && !mergeIgnored;
  let requestedWeight = options.frontmatterWeight;
  const weightIgnored = mergeFrontmatter && requestedWeight !== undefined &&
    (markdown.rootCount === 0 || frontmatterRootCount(frontmatter) === 0);

  if (mergeIgnored || weightIgnored) {
    requestedWeight = undefined;
  }
  if (mergeIgnored) {
    mergeFrontmatter = false;
  }

  const separateProgress = frontmatterPresent
    ? calculateCombinedProgress(markdown, frontmatter)
    : markdown;
  const progress = mergeFrontmatter
    ? calculateCombinedProgress(markdown, frontmatter, requestedWeight)
    : separateProgress;

  return {
    mergeIgnored,
    weightIgnored,
    report: {
      source: { path: sourcePath },
      frontmatter: [...frontmatter],
      frontmatterPresent,
      markdown,
      markdownPresent,
      presentation: mergeFrontmatter ? "merged" : "separate",
      frontmatterWeight: mergeFrontmatter
        ? resolvedFrontmatterWeight(markdown, frontmatter, requestedWeight)
        : undefined,
      progress,
    },
  };
}
