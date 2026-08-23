import {
  DEFAULT_ELLIPSIS,
  DEFAULT_DECIMAL_PRECISION,
  DEFAULT_MAX_LABEL_CLUSTERS,
  DEFAULT_PERCENTAGE_PRECISION,
  DEFAULT_SHOW_TRAILING_ZEROS,
} from "./types.ts";
import type { ProgressFormat, ResolvedDisplayOptions } from "./types.ts";

export function resolveDisplayOptions(
  cliMaxLabelClusters: number | undefined,
  noTruncate: boolean,
  progressFormat: ProgressFormat = "percentage",
  cliPrecision: number | undefined = undefined,
  cliShowTrailingZeros: boolean | undefined = undefined,
): ResolvedDisplayOptions {
  const defaultPrecision = progressFormat === "decimal"
    ? DEFAULT_DECIMAL_PRECISION
    : DEFAULT_PERCENTAGE_PRECISION;
  const precision = cliPrecision ?? defaultPrecision;
  const minimumPrecision = progressFormat === "decimal" ? 1 : 0;
  if (
    !Number.isSafeInteger(precision) ||
    precision < minimumPrecision ||
    precision > 100
  ) {
    throw new Error(
      `precision must be at least ${minimumPrecision} and at most 100 for ${progressFormat} format; received: ${precision}`,
    );
  }
  return {
    maxLabelClusters:
      cliMaxLabelClusters ?? DEFAULT_MAX_LABEL_CLUSTERS,
    ellipsis: DEFAULT_ELLIPSIS,
    truncate: !noTruncate,
    progressFormat,
    precision,
    showTrailingZeros:
      cliShowTrailingZeros ?? DEFAULT_SHOW_TRAILING_ZEROS,
  };
}
