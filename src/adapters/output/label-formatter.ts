import {
  DEFAULT_ELLIPSIS,
  DEFAULT_MAX_LABEL_CLUSTERS,
} from "howdone";
import type {
  GraphemeSegmenter,
  ResolvedDisplayOptions,
} from "howdone";
import { defaultGraphemeSegmenter } from "../unicode/intl-grapheme-segmenter.ts";

export function truncateLabel(
  label: string,
  maxLabelClusters = DEFAULT_MAX_LABEL_CLUSTERS,
  ellipsis = DEFAULT_ELLIPSIS,
  segmenter: GraphemeSegmenter = defaultGraphemeSegmenter,
): string {
  if (label.length === 0) {
    return label;
  }
  const clusters = segmenter.segment(label);
  return clusters.length <= maxLabelClusters
    ? label
    : `${clusters.slice(0, maxLabelClusters).join("")}${ellipsis}`;
}

export function countGraphemeClusters(
  text: string,
  segmenter: GraphemeSegmenter = defaultGraphemeSegmenter,
): number {
  return segmenter.segment(text).length;
}

export function formatLabel(
  label: string,
  options: ResolvedDisplayOptions,
  segmenter: GraphemeSegmenter = defaultGraphemeSegmenter,
): string {
  return options.truncate
    ? truncateLabel(label, options.maxLabelClusters, options.ellipsis, segmenter)
    : label;
}
