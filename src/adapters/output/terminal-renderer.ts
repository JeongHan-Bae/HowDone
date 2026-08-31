import type {
  CheckboxNode,
  GraphemeSegmenter,
  ProgressReport,
  ProgressResult,
  ProgressFormat,
  ResolvedDisplayOptions,
  TerminalTextSemantic,
  InfoDocument,
  ErrorDocument,
  TerminalOutputOptions,
  TerminalOutputPort,
  TerminalTextDocument,
  WarningDocument,
} from "howdone";
import { collectLayerStatistics } from "howdone";
import { defaultGraphemeSegmenter } from "../unicode/intl-grapheme-segmenter.ts";
import { formatLabel } from "./label-formatter.ts";
import {
  TerminalOutputDocument,
  type TerminalOutput,
  type TerminalOutputLine,
  type TerminalOutputPart,
} from "./terminal-output.ts";

export { countGraphemeClusters, formatLabel, truncateLabel } from "./label-formatter.ts";

type TerminalDocumentRenderer<TDocument extends InfoDocument> = (
  document: TDocument,
  options?: TerminalOutputOptions,
) => TerminalTextDocument;

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

function outputPart(
  text: string,
  attributes: Pick<TerminalOutputPart, "semantic"> = {},
): TerminalOutputPart {
  return { text, ...attributes };
}

function outputLine(...parts: TerminalOutputPart[]): TerminalOutputLine {
  return { parts };
}

function treeSeparatorLine(): TerminalOutputLine {
  return { parts: [], emptyLineMarker: true };
}

function progressAttributes(progress: number): { semantic: TerminalTextSemantic } {
  if (progress >= 1) {
    return { semantic: "complete" };
  }
  if (progress <= 0) {
    return { semantic: "zero" };
  }
  return { semantic: "partial" };
}

function statisticAttributes(value: number): { semantic: TerminalTextSemantic } {
  return { semantic: value === 0 ? "muted" : "accent" };
}

function statisticPart(value: number, text = String(value)): TerminalOutputPart {
  return outputPart(text, statisticAttributes(value));
}

function completionAttributes(
  value: number,
  total: number,
): { semantic: TerminalTextSemantic } {
  if (value <= 0) {
    return { semantic: "zero" };
  }
  if (total > 0 && value >= total) {
    return { semantic: "complete" };
  }
  return { semantic: "partial" };
}

function completionPart(
  value: number,
  total: number,
  text: string,
): TerminalOutputPart {
  return outputPart(text, completionAttributes(value, total));
}

function statisticCountParts(
  value: number,
  singular: string,
  plural = `${singular}s`,
): TerminalOutputPart[] {
  return [
    statisticPart(value),
    outputPart(` ${value === 1 ? singular : plural}`),
  ];
}

function statisticLine(label: string, value: number): TerminalOutputLine {
  return outputLine(outputPart(label), statisticPart(value));
}

function renderDefault(
  result: ProgressResult,
  options: ResolvedDisplayOptions,
): TerminalOutputLine[] {
  return [
    outputLine(
      outputPart(
        formatDisplayProgress(result.progress, options),
        progressAttributes(result.progress),
      ),
    ),
  ];
}

function renderNode(
  node: CheckboxNode,
  prefix: string,
  isLast: boolean,
  options: ResolvedDisplayOptions,
  segmenter: GraphemeSegmenter,
): TerminalOutputLine[] {
  const connector = isLast ? "\u2514\u2500" : "\u251c\u2500";
  const lines = [
    outputLine(
      outputPart(prefix),
      outputPart(connector),
      outputPart(" ["),
      outputPart(
        formatDisplayProgress(node.progress, options),
        progressAttributes(node.progress),
      ),
      outputPart("] "),
      outputPart(formatLabel(node.label, options, segmenter)),
    ),
  ];
  const childPrefix = `${prefix}${isLast ? "   " : "\u2502  "}`;
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
): TerminalOutputLine[] {
  const lines = [
    outputLine(
      outputPart("Overall completion: ", { semantic: "accent" }),
      outputPart(
        formatDisplayProgress(result.progress, options),
        progressAttributes(result.progress),
      ),
    ),
    treeSeparatorLine(),
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
    lines.push(outputLine(outputPart("No statistical nodes found.", { semantic: "silent" })));
  }
  return lines;
}

function renderDetails(
  result: ProgressResult,
  options: ResolvedDisplayOptions,
  segmenter: GraphemeSegmenter,
): TerminalOutputLine[] {
  const lines = [
    outputLine(
      outputPart("Overall completion: ", { semantic: "accent" }),
      outputPart(
        formatDisplayProgress(result.progress, options),
        progressAttributes(result.progress),
      ),
    ),
    outputLine(),
    outputLine(outputPart("Overall statistics:", { semantic: "accent" })),
    statisticLine("- Root nodes: ", result.rootCount),
    statisticLine("- Explicit checkboxes: ", result.explicitCheckboxCount),
    statisticLine("- Implicit nodes: ", result.implicitNodeCount),
    statisticLine("- Statistical nodes: ", result.nodeCount),
    outputLine(
      outputPart("- Equivalent completed: "),
      completionPart(
        result.completedEquivalent,
        result.rootCount,
        formatNumber(result.completedEquivalent),
      ),
      outputPart(" / "),
      statisticPart(result.rootCount),
    ),
    outputLine(),
    outputLine(outputPart("Level statistics:", { semantic: "accent" })),
  ];

  const layers = collectLayerStatistics(result);
  if (layers.length === 0) {
    lines.push(outputLine(outputPart("- No statistical nodes found.", { semantic: "silent" })));
  } else {
    for (const level of layers) {
      lines.push(
        outputLine(
          outputPart("- Level "),
          statisticPart(level.depth + 1),
          outputPart(": "),
          ...statisticCountParts(level.nodeCount, "node"),
          outputPart(", "),
          ...statisticCountParts(level.leafCount, "leaf node"),
          outputPart(", "),
          ...statisticCountParts(level.branchCount, "branch node"),
        ),
      );
    }
  }

  lines.push(
    outputLine(),
    outputLine(outputPart("Root statistics:", { semantic: "accent" })),
  );
  if (result.roots.length === 0) {
    lines.push(outputLine(outputPart("- No statistical nodes found.", { semantic: "silent" })));
  } else {
    for (const root of result.roots) {
      lines.push(
        outputLine(
          outputPart(`- ${formatLabel(root.label, options, segmenter)}: `),
          outputPart(
            formatDisplayProgress(root.progress, options),
            progressAttributes(root.progress),
          ),
          outputPart(", "),
          ...statisticCountParts(root.children.length, "child node"),
        ),
      );
    }
  }
  return lines;
}

export class TerminalRenderer<
  TDocument extends InfoDocument = InfoDocument,
> implements TerminalOutputPort<TerminalOutput, TDocument> {
  private readonly segmenter: GraphemeSegmenter;
  private readonly documentRenderer?: TerminalDocumentRenderer<TDocument>;

  constructor(
    segmenter: GraphemeSegmenter = defaultGraphemeSegmenter,
    documentRenderer?: TerminalDocumentRenderer<TDocument>,
  ) {
    this.segmenter = segmenter;
    this.documentRenderer = documentRenderer;
  }

  render(
    mode: "default" | "tree" | "details",
    report: ProgressReport,
    options: ResolvedDisplayOptions,
  ): TerminalOutput {
    const markdown = report.markdown ?? report.progress;
    const frontmatter = report.frontmatter ?? [];
    const presentation = report.presentation ?? "separate";
    const markdownPresent = report.markdownPresent ?? report.markdown !== undefined;
    const frontmatterPresent = report.frontmatterPresent ?? frontmatter.length > 0;
    const nestedPresentation =
      (markdownPresent && frontmatterPresent) || frontmatter.length > 1;
    if (presentation === "merged" || !nestedPresentation) {
      const lines = mode === "tree"
        ? renderTree(report.progress, options, this.segmenter)
        : mode === "details"
        ? renderDetails(report.progress, options, this.segmenter)
        : renderDefault(report.progress, options);
      return new TerminalOutputDocument(lines);
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
        : mode === "details"
        ? renderDetails(result, options, this.segmenter)
        : renderDefault(result, options);
      return [
        outputLine(outputPart(`${title}:`, { semantic: "accent" })),
        mode === "tree" ? treeSeparatorLine() : outputLine(),
        ...body,
      ];
    });
    const lines: TerminalOutputLine[] = [];
    rendered.forEach((section, index) => {
      if (index > 0) lines.push(outputLine());
      lines.push(...section);
    });
    return new TerminalOutputDocument(lines);
  }

  renderDocument(
    document: TDocument,
    options?: TerminalOutputOptions,
  ): TerminalOutput {
    if (this.documentRenderer !== undefined) {
      return new TerminalOutputDocument(this.documentRenderer(document, options).lines);
    }
    if (
      typeof document === "object" &&
      document !== null &&
      "lines" in document &&
      Array.isArray(document.lines)
    ) {
      return new TerminalOutputDocument(
        document.lines as TerminalOutput["lines"],
      );
    }
    throw new Error("This terminal renderer cannot render the supplied output document.");
  }

  renderWarning(document: WarningDocument): TerminalOutput {
    return new TerminalOutputDocument([{
      parts: [{ text: `Warning: ${document.message}`, semantic: "warning" }],
    }]);
  }

  renderError(document: ErrorDocument): TerminalOutput {
    return new TerminalOutputDocument([{
      parts: [{ text: `howdone: error: ${document.message}`, semantic: "error" }],
    }]);
  }
}
