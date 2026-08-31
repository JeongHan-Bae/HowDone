/**
 * @brief Selects the numeric representation used for human-readable progress.
 *
 * @details
 * `percentage` expresses progress on a zero-to-one-hundred scale. `decimal`
 * expresses the same value on a zero-to-one scale.
 */
export type ProgressFormat = "decimal" | "percentage";

/**
 * @brief Display settings resolved by Core before output rendering.
 *
 * @details
 * Core resolves defaults and validates the policy values. Output adapters use
 * this stable object to format progress and apply display-only label limits;
 * the options do not mutate the underlying progress report.
 */
export interface ResolvedDisplayOptions {
  /** @brief Maximum Unicode grapheme clusters retained in a displayed label. */
  maxLabelClusters: number;

  /** @brief Text appended when a displayed label is truncated. */
  ellipsis: string;

  /** @brief Whether labels should be truncated at the configured limit. */
  truncate: boolean;

  /** @brief Numeric representation requested for human-readable output. */
  progressFormat: ProgressFormat;

  /** @brief Number of fractional digits used by the selected format. */
  precision: number;

  /** @brief Whether trailing fractional zeroes remain visible. */
  showTrailingZeros: boolean;
}

/** @brief Default maximum label length in Unicode grapheme clusters. */
export const DEFAULT_MAX_LABEL_CLUSTERS = 10;

/** @brief Default marker appended to a truncated label. */
export const DEFAULT_ELLIPSIS = "...";

/** @brief Default fractional precision for percentage output. */
export const DEFAULT_PERCENTAGE_PRECISION = 2;

/** @brief Default fractional precision for decimal output. */
export const DEFAULT_DECIMAL_PRECISION = 4;

/** @brief Default policy for displaying trailing fractional zeroes. */
export const DEFAULT_SHOW_TRAILING_ZEROS = false;
