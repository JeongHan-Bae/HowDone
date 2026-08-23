import type { TerminalOutputPort, GraphemeSegmenter } from "../../core/ports.ts";
import type {
  CheckboxNode,
  ProgressResult,
} from "../../core/progress/types.ts";
import { collectLayerStatistics } from "../../core/progress/analyzer.ts";
import type {
  ProgressFormat,
  ResolvedDisplayOptions,
} from "../../core/config/types.ts";
import { defaultGraphemeSegmenter } from "../unicode/intl-grapheme-segmenter.ts";
import {
  countGraphemeClusters,
  formatLabel,
  truncateLabel,
} from "./label-formatter.ts";

export { countGraphemeClusters, formatLabel, truncateLabel } from "./label-formatter.ts";

export function formatNumber(
  value: number,
  precision = 6,
  showTrailingZeros = false,
): string {
  const fixed = value.toFixed(precision);
  if (showTrailingZeros || !fixed.includes(".")) {
    return fixed;
  }
  const [integer = "", fraction = ""] = fixed.split(".");
  const trimmedFraction = fraction.replace(/0+$/u, "");
  return trimmedFraction.length === 0
    ? integer
    : `${integer}.${trimmedFraction}`;
}

export function formatPercentage(
  progress: number,
  precision = 6,
  showTrailingZeros = false,
): string {
  return `${formatNumber(progress * 100, precision, showTrailingZeros)}%`;
}

export function formatProgress(
  progress: number,
  format: ProgressFormat = "percentage",
  precision = format === "decimal" ? 4 : 2,
  showTrailingZeros = false,
): string {
  return format === "decimal"
    ? formatNumber(progress, precision, showTrailingZeros)
    : formatPercentage(progress, precision, showTrailingZeros);
}

function formatDisplayProgress(
  progress: number,
  options: ResolvedDisplayOptions,
): string {
  return formatProgress(
    progress,
    options.progressFormat,
    options.precision,
    options.showTrailingZeros,
  );
}

function renderDefault(
  result: ProgressResult,
  options: ResolvedDisplayOptions,
): string {
  return `${formatDisplayProgress(result.progress, options)}\n`;
}

function renderNode(
  node: CheckboxNode,
  prefix: string,
  isLast: boolean,
  options: ResolvedDisplayOptions,
  segmenter: GraphemeSegmenter,
): string[] {
  const connector = isLast ? "└─" : "├─";
  const lines = [
    `${prefix}${connector} [${formatDisplayProgress(node.progress, options)}] ${formatLabel(node.label, options, segmenter)}`,
  ];
  const childPrefix = `${prefix}${isLast ? "   " : "│  "}`;
  node.children.forEach((child, index) => {
    lines.push(
      ...renderNode(
        child,
        childPrefix,
        index === node.children.length - 1,
        options,
        segmenter,
      ),
    );
  });
  return lines;
}

function renderTree(
  result: ProgressResult,
  options: ResolvedDisplayOptions,
  segmenter: GraphemeSegmenter,
): string {
  const lines = [
    `Overall completion: ${formatDisplayProgress(result.progress, options)}`,
    "",
  ];
  result.roots.forEach((root, index) => {
    lines.push(
      ...renderNode(
        root,
        "",
        index === result.roots.length - 1,
        options,
        segmenter,
      ),
    );
  });
  if (result.roots.length === 0) {
    lines.push("No statistical nodes found.");
  }
  return `${lines.join("\n")}\n`;
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function renderDetails(
  result: ProgressResult,
  options: ResolvedDisplayOptions,
  segmenter: GraphemeSegmenter,
): string {
  const lines = [
    `Overall completion: ${formatDisplayProgress(result.progress, options)}`,
    "",
    "Overall statistics:",
    `- Root nodes: ${result.rootCount}`,
    `- Explicit checkboxes: ${result.explicitCheckboxCount}`,
    `- Implicit nodes: ${result.implicitNodeCount}`,
    `- Statistical nodes: ${result.nodeCount}`,
    `- Equivalent completed: ${formatNumber(result.completedEquivalent)} / ${result.rootCount}`,
    "",
    "Level statistics:",
  ];

  const layers = collectLayerStatistics(result);
  if (layers.length === 0) {
    lines.push("- No statistical nodes found.");
  } else {
    for (const level of layers) {
      lines.push(
        `- Level ${level.depth + 1}: ${pluralize(level.nodeCount, "node")}, ${pluralize(level.leafCount, "leaf node")}, ${pluralize(level.branchCount, "branch node")}`,
      );
    }
  }

  lines.push("", "Root statistics:");
  if (result.roots.length === 0) {
    lines.push("- No statistical nodes found.");
  } else {
    for (const root of result.roots) {
      lines.push(
        `- ${formatLabel(root.label, options, segmenter)}: ${formatDisplayProgress(root.progress, options)}, ${pluralize(root.children.length, "child node")}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

export class TerminalRenderer implements TerminalOutputPort {
  private readonly segmenter: GraphemeSegmenter;

  constructor(segmenter: GraphemeSegmenter = defaultGraphemeSegmenter) {
    this.segmenter = segmenter;
  }

  render(
    mode: "default" | "tree" | "details",
    result: ProgressResult,
    options: ResolvedDisplayOptions,
  ): string {
    if (mode === "tree") return renderTree(result, options, this.segmenter);
    if (mode === "details") return renderDetails(result, options, this.segmenter);
    return renderDefault(result, options);
  }
}

export const defaultTerminalRenderer = new TerminalRenderer();
