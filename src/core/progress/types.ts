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
  progress: ProgressResult;
}
