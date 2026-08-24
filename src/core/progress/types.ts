import type { FrontmatterFormat } from "../ast/types.ts";
import type { FrontmatterChecklist } from "../frontmatter/types.ts";

export interface CheckboxNode {
  label: string;
  checked: boolean | null;
  implicit: boolean;
  children: CheckboxNode[];
  progress: number;
  depth: number;
}

export interface ProgressResult {
  rootCount: number;
  explicitCheckboxCount: number;
  implicitNodeCount: number;
  nodeCount: number;
  completedEquivalent: number;
  progress: number;
  percentage: number;
  roots: CheckboxNode[];
}

export interface FrontmatterProgress {
  format: FrontmatterFormat;
  checklists: FrontmatterChecklist[];
  progress: ProgressResult;
}

export type ProgressPresentation = "separate" | "merged";

export interface LayerStatistics {
  depth: number;
  nodeCount: number;
  leafCount: number;
  branchCount: number;
}

export interface ProgressReport {
  source: {
    path: string;
  };
  frontmatter?: FrontmatterProgress[];
  frontmatterPresent?: boolean;
  markdown?: ProgressResult;
  markdownPresent?: boolean;
  presentation?: ProgressPresentation;
  frontmatterWeight?: number;
  progress: ProgressResult;
}
