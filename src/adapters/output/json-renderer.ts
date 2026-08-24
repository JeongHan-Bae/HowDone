import type {
  CheckboxNode,
  GraphemeSegmenter,
  FrontmatterProgress,
  JsonOutputPort,
  ProgressReport,
  ProgressResult,
  ResolvedDisplayOptions,
} from "../../core/index.ts";
import { defaultGraphemeSegmenter } from "../unicode/intl-grapheme-segmenter.ts";
import { formatLabel } from "./label-formatter.ts";

function formatNodes(
  nodes: readonly CheckboxNode[],
  options: ResolvedDisplayOptions,
  segmenter: GraphemeSegmenter,
): CheckboxNode[] {
  return nodes.map((node) => ({
    ...node,
    label: formatLabel(node.label, options, segmenter),
    children: formatNodes(node.children, options, segmenter),
  }));
}

function formatProgress(
  result: ProgressResult,
  options: ResolvedDisplayOptions,
  segmenter: GraphemeSegmenter,
): ProgressResult {
  return {
    ...result,
    roots: formatNodes(result.roots, options, segmenter),
  };
}

function formatChecklists(
  sections: ProgressReport["frontmatter"],
  options: ResolvedDisplayOptions,
  segmenter: GraphemeSegmenter,
): ProgressReport["frontmatter"] {
  const formatEntries = (
    entries: FrontmatterProgress["checklists"][number]["entries"],
  ): FrontmatterProgress["checklists"][number]["entries"] => entries.map((entry) => ({
    ...entry,
    label: formatLabel(entry.label, options, segmenter),
    ...(entry.children === undefined
      ? {}
      : { children: formatEntries(entry.children) }),
  }));
  return (sections ?? []).map((section) => ({
    ...section,
    checklists: section.checklists.map((checklist) => ({
      ...checklist,
      entries: formatEntries(checklist.entries),
    })),
    progress: formatProgress(section.progress, options, segmenter),
  }));
}

export class JsonRenderer implements JsonOutputPort {
  private readonly segmenter: GraphemeSegmenter;

  constructor(segmenter: GraphemeSegmenter = defaultGraphemeSegmenter) {
    this.segmenter = segmenter;
  }

  render(report: ProgressReport, options?: ResolvedDisplayOptions): string {
    const markdown = report.markdown ?? report.progress;
    const frontmatter = report.frontmatter ?? [];
    const hasDocumentSections =
      report.markdown !== undefined ||
      report.frontmatter !== undefined ||
      report.presentation !== undefined;
    const markdownPresent = report.markdownPresent ?? report.markdown !== undefined;
    const frontmatterPresent = report.frontmatterPresent ?? frontmatter.length > 0;
    const nestedPresentation =
      (markdownPresent && frontmatterPresent) || frontmatter.length > 1;
    const progress = options?.truncate
      ? formatProgress(report.progress, options, this.segmenter)
      : report.progress;

    const output = !hasDocumentSections || !nestedPresentation
      ? {
          source: report.source,
          progress,
        }
      : options?.truncate
      ? {
          source: report.source,
          progress,
          presentation: report.presentation ?? "separate",
          ...(report.frontmatterWeight === undefined
            ? {}
            : { frontmatterWeight: report.frontmatterWeight }),
          frontmatter: formatChecklists(frontmatter, options, this.segmenter),
          ...(markdownPresent
            ? { markdown: formatProgress(markdown, options, this.segmenter) }
            : {}),
        }
      : {
          source: report.source,
          progress,
          presentation: report.presentation ?? "separate",
          ...(report.frontmatterWeight === undefined
            ? {}
            : { frontmatterWeight: report.frontmatterWeight }),
          frontmatter,
          ...(markdownPresent ? { markdown } : {}),
        };
    return `${JSON.stringify(output, null, 2)}\n`;
  }
}

export const defaultJsonRenderer = new JsonRenderer();
