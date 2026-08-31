import type { FrontmatterProgress, ProgressReport, ProgressResult } from "./types.ts";
import { calculateCombinedProgress } from "./analyzer.ts";

/**
 * @brief Controls how a progress report combines Markdown and frontmatter.
 *
 * @details
 * The application supplies this policy after validating command-line or
 * caller options. The report builder applies it without depending on a CLI
 * parser or an output adapter.
 */
export interface ProgressReportOptions {
  /** @brief Whether eligible source channels should be merged. */
  mergeFrontmatter: boolean;

  /** @brief Optional fraction of merged progress assigned to frontmatter. */
  frontmatterWeight?: number;
}

/**
 * @brief Returns a report together with ignored-option diagnostics.
 *
 * @details
 * A requested merge or weight can be semantically inapplicable when the
 * source has too few channels or one side has no checklist roots. The boolean
 * results let the application produce a warning without changing the report
 * contract.
 */
export interface ProgressReportBuild {
  /** @brief Progress report produced from the supplied source channels. */
  report: ProgressReport;

  /** @brief True when merge was requested but fewer than two components existed. */
  mergeIgnored: boolean;

  /** @brief True when a requested weight was inapplicable to the source roots. */
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
