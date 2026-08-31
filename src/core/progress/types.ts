import type { FrontmatterFormat } from "../ast/types.ts";
import type { FrontmatterChecklist } from "../frontmatter/types.ts";

/**
 * @brief Represents one statistical task node in a progress tree.
 *
 * @details
 * A node is either an explicit Markdown or frontmatter checklist item or an
 * implicit branch retained because it contains statistical descendants. Its
 * progress is expressed as a decimal from 0 through 1.
 */
export interface CheckboxNode {
  /** @brief Human-readable task label without the checkbox marker. */
  label: string;

  /** @brief Explicit task state, or `null` for an implicit branch. */
  checked: boolean | null;

  /** @brief True when this node was created from descendants only. */
  implicit: boolean;

  /** @brief Statistical child nodes in source order. */
  children: CheckboxNode[];

  /** @brief Completion value as a decimal from 0 through 1. */
  progress: number;

  /** @brief Zero-based depth of this node within its progress tree. */
  depth: number;
}

/**
 * @brief Summarizes the completion metrics for one progress tree.
 *
 * @details
 * Counts and equivalent completion values describe the same stable report
 * shape consumed by terminal and JSON output adapters. `progress` is the
 * decimal value and `percentage` is that value multiplied by 100.
 */
export interface ProgressResult {
  /** @brief Number of statistical roots in the tree. */
  rootCount: number;

  /** @brief Number of explicit checked or unchecked task nodes. */
  explicitCheckboxCount: number;

  /** @brief Number of implicit statistical branch nodes. */
  implicitNodeCount: number;

  /** @brief Total number of explicit and implicit nodes. */
  nodeCount: number;

  /** @brief Sum of root progress values before root averaging. */
  completedEquivalent: number;

  /** @brief Overall completion as a decimal from 0 through 1. */
  progress: number;

  /** @brief Overall completion as a percentage from 0 through 100. */
  percentage: number;

  /** @brief Statistical roots in source order. */
  roots: CheckboxNode[];
}

/**
 * @brief Associates one frontmatter syntax section with its progress result.
 *
 * @details
 * Each YAML or TOML section remains a separate channel in a progress report.
 * Its checklist description is preserved alongside the calculated metrics so
 * output adapters can present both structure and progress.
 */
export interface FrontmatterProgress {
  /** @brief Syntax used by this frontmatter section. */
  format: FrontmatterFormat;

  /** @brief Semantic checklist structures recognized in the section. */
  checklists: FrontmatterChecklist[];

  /** @brief Completion metrics for the section's recognized checklists. */
  progress: ProgressResult;
}

/**
 * @brief Describes whether a report keeps source channels separate or merges them.
 */
export type ProgressPresentation = "separate" | "merged";

/**
 * @brief Counts leaves and branches at each depth of a progress tree.
 */
export interface LayerStatistics {
  /** @brief Zero-based depth represented by this row. */
  depth: number;

  /** @brief Total nodes at this depth. */
  nodeCount: number;

  /** @brief Nodes at this depth without statistical children. */
  leafCount: number;

  /** @brief Nodes at this depth with one or more statistical children. */
  branchCount: number;
}

/**
 * @brief Complete progress information for one analyzed source path.
 *
 * @details
 * The report preserves Markdown and frontmatter results independently when
 * available. The top-level `progress` value is the selected separate or
 * merged presentation result; source-channel results remain available for
 * detailed consumers and JSON output.
 */
export interface ProgressReport {
  /**
   * @brief Identifies the source associated with the report.
   */
  source: {
    /** @brief Caller-visible source path. */
    path: string;
  };

  /** @brief Progress for each YAML or TOML section in source order. */
  frontmatter?: FrontmatterProgress[];

  /** @brief True when the source contains at least one frontmatter section. */
  frontmatterPresent?: boolean;

  /** @brief Progress for the Markdown body when it is present. */
  markdown?: ProgressResult;

  /** @brief True when the source contains a Markdown body channel. */
  markdownPresent?: boolean;

  /** @brief Presentation used by the top-level progress result. */
  presentation?: ProgressPresentation;

  /** @brief Frontmatter share used by an explicit or root-count merge. */
  frontmatterWeight?: number;

  /** @brief Selected overall progress result for the report. */
  progress: ProgressResult;
}
