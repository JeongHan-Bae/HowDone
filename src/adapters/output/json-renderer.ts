import type { JsonOutputPort } from "../../core/ports.ts";
import type { CheckboxNode, ProgressReport } from "../../core/progress/types.ts";
import type { ResolvedDisplayOptions } from "../../core/config/types.ts";
import { defaultGraphemeSegmenter } from "../unicode/intl-grapheme-segmenter.ts";
import { formatLabel } from "./label-formatter.ts";

function formatNodes(
  nodes: readonly CheckboxNode[],
  options: ResolvedDisplayOptions,
): CheckboxNode[] {
  return nodes.map((node) => ({
    ...node,
    label: formatLabel(node.label, options, defaultGraphemeSegmenter),
    children: formatNodes(node.children, options),
  }));
}

export class JsonRenderer implements JsonOutputPort {
  render(report: ProgressReport, options?: ResolvedDisplayOptions): string {
    const output = options?.truncate
      ? {
          ...report,
          progress: {
            ...report.progress,
            roots: formatNodes(report.progress.roots, options),
          },
        }
      : report;
    return `${JSON.stringify(output, null, 2)}\n`;
  }
}

export const defaultJsonRenderer = new JsonRenderer();
