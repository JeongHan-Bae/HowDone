import type {
  CheckboxNode,
  GraphemeSegmenter,
  ProgressReport,
  ProgressResult,
  ProgressFormat,
  ResolvedDisplayOptions,
  TerminalOutputPort,
} from "../../core/index.ts";
import { collectLayerStatistics } from "../../core/index.ts";
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
    input: ProgressReport | ProgressResult,
    options: ResolvedDisplayOptions,
  ): string {
    const report: ProgressReport = "source" in input
      ? input
      : {
          source: { path: "" },
          markdown: input,
          frontmatter: [],
          presentation: "separate",
          progress: input,
        };
    const markdown = report.markdown ?? report.progress;
    const frontmatter = report.frontmatter ?? [];
    const presentation = report.presentation ?? "separate";
    const markdownPresent = report.markdownPresent ?? report.markdown !== undefined;
    const frontmatterPresent = report.frontmatterPresent ?? frontmatter.length > 0;
    const nestedPresentation =
      (markdownPresent && frontmatterPresent) || frontmatter.length > 1;
    if (
      mode === "default" ||
      presentation === "merged" ||
      !nestedPresentation
    ) {
      if (mode === "tree") return renderTree(report.progress, options, this.segmenter);
      if (mode === "details") return renderDetails(report.progress, options, this.segmenter);
      return renderDefault(report.progress, options);
    }

    const sections = frontmatter.map((section) => ({
      title: `Frontmatter (${section.format.toUpperCase()})`,
      result: section.progress,
    }));
    if (markdownPresent) {
      sections.push({ title: "Markdown", result: markdown });
    }

    const rendered = sections.map(({ title, result }) => {
      const body = mode === "tree"
        ? renderTree(result, options, this.segmenter)
        : renderDetails(result, options, this.segmenter);
      return `${title}:\n\n${body.trimEnd()}`;
    });
    return `${rendered.join("\n\n")}\n`;
  }
}

export const defaultTerminalRenderer = new TerminalRenderer();
