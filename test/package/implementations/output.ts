import type {
  GraphemeSegmenter,
  JsonOutputPort,
  ProgressReport,
  ProgressResult,
  ResolvedDisplayOptions,
  TerminalOutputPort,
} from "howdone";
import {
  jsonOutputForSignature,
  terminalOutputForSignature,
} from "./data.ts";

function progressOf(report: ProgressReport | ProgressResult): ProgressResult {
  return "source" in report ? report.progress : report;
}

function replaceTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

export class ConsumerTerminalRenderer implements TerminalOutputPort {
  private readonly segmenter: GraphemeSegmenter;
  readonly calls: string[] = [];

  constructor(segmenter: GraphemeSegmenter) {
    this.segmenter = segmenter;
  }

  render(
    mode: "default" | "tree" | "details",
    report: ProgressReport | ProgressResult,
    options: ResolvedDisplayOptions,
  ): string {
    void options;
    const progress = progressOf(report);
    const label = progress.roots[0] === undefined
      ? "empty"
      : this.segmenter.segment(progress.roots[0].label).join("");
    const output = terminalOutputForSignature(
      `${mode}|${progress.percentage}|${label}`,
    );
    const rendered = replaceTemplate(output.template, {
      mode,
      percentage: String(progress.percentage),
      label,
    });
    this.calls.push(rendered);
    return `${rendered}\n`;
  }
}

function valueAtPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (segment === "length" && Array.isArray(current)) return current.length;
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

export class ConsumerJsonRenderer implements JsonOutputPort {
  readonly calls: string[] = [];

  render(report: ProgressReport): string {
    const frontmatterSections = report.frontmatter?.length ?? 0;
    const signature = [
      frontmatterSections,
      report.progress.rootCount,
      report.progress.percentage,
    ].join("|");
    const output = jsonOutputForSignature(signature);
    const rendered = Object.fromEntries(
      Object.entries(output.fields).map(([name, path]) => [
        name,
        valueAtPath(report, path),
      ]),
    );
    const serialized = JSON.stringify(rendered);
    this.calls.push(serialized);
    return serialized;
  }
}
