export type ProgressFormat = "decimal" | "percentage";

export interface ResolvedDisplayOptions {
  maxLabelClusters: number;
  ellipsis: string;
  truncate: boolean;
  progressFormat: ProgressFormat;
  precision: number;
  showTrailingZeros: boolean;
}

export const DEFAULT_MAX_LABEL_CLUSTERS = 10;
export const DEFAULT_ELLIPSIS = "...";
export const DEFAULT_PERCENTAGE_PRECISION = 2;
export const DEFAULT_DECIMAL_PRECISION = 4;
export const DEFAULT_SHOW_TRAILING_ZEROS = false;
