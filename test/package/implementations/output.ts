import type {
  ErrorDocument,
  GraphemeSegmenter,
  InfoDocument,
  JsonObject,
  JsonOutputOptions,
  JsonOutputPort,
  ProgressReport,
  ResolvedDisplayOptions,
  TerminalOutput,
  TerminalOutputPort,
  TerminalOutputOptions,
  TextWritable,
  WarningDocument,
} from "howdone";
import {
  consumerOutputCapabilityOutputForCode,
  type ConsumerOutputCapabilities,
  type ConsumerOutputCapabilityCase,
  type ConsumerTerminalContentFixture,
  jsonOutputForSignature,
  terminalOutputForSignature,
} from "./data.ts";

function replaceTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

class ConsumerTerminalOutput implements TerminalOutput {
  readonly lines: ConsumerTerminalContentFixture["lines"];
  private readonly text: string;

  constructor(
    content: ConsumerTerminalContentFixture,
    text: string,
  ) {
    this.lines = content.lines;
    this.text = text;
  }

  writeTo(destination: TextWritable): void {
    destination.write(this.text);
  }
}

function contentFromPlain(text: string): ConsumerTerminalContentFixture {
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  return {
    lines: body.length === 0
      ? []
      : body.split("\n").map((line) => ({ parts: [{ text: line }] })),
  };
}

function effectiveCapabilities(
  capabilities: ConsumerOutputCapabilities,
  options: TerminalOutputOptions | JsonOutputOptions | undefined,
): ConsumerOutputCapabilities {
  return {
    color: capabilities.color && options?.color !== "never",
    pager: capabilities.pager && options?.pager !== "never",
  };
}

export class ConsumerTerminalRenderer implements TerminalOutputPort {
  private readonly segmenter: GraphemeSegmenter;
  private readonly capability?: ConsumerOutputCapabilityCase;
  readonly label: string;
  readonly calls: string[] = [];
  readonly renderCalls: Array<{
    mode: "default" | "tree" | "details";
    options: ResolvedDisplayOptions;
  }> = [];
  readonly renderedReports: ProgressReport[] = [];
  readonly renderedOutputs: TerminalOutput[] = [];
  readonly infoDocuments: InfoDocument[] = [];
  readonly infoRenderCalls: Array<{
    document: InfoDocument;
    options: TerminalOutputOptions | undefined;
  }> = [];
  readonly featureCalls: Array<{
    content: TerminalOutput;
    options: TerminalOutputOptions | undefined;
    effective: ConsumerOutputCapabilities;
  }> = [];
  readonly diagnosticCalls: Array<{
    document: TerminalOutput;
    options: TerminalOutputOptions | undefined;
  }> = [];
  readonly print:
    | ((content: TerminalOutput, options?: TerminalOutputOptions) => void)
    | undefined;
  private readonly pendingDiagnostics = new Map<
    TerminalOutput,
    { document: TerminalOutput; options: TerminalOutputOptions | undefined }
  >();

  constructor(
    segmenter: GraphemeSegmenter,
    capability?: ConsumerOutputCapabilityCase,
    diagnostics = false,
  ) {
    this.segmenter = segmenter;
    this.capability = capability;
    this.label = capability?.terminal.label ?? "consumer-terminal-port";
    const supportsFeatures = capability !== undefined &&
      (capability.terminal.color || capability.terminal.pager);
    if (diagnostics || supportsFeatures) {
      this.print = (content, options) => {
        const diagnostic = this.pendingDiagnostics.get(content);
        if (diagnostic !== undefined) {
          diagnostic.options = options;
          return;
        }
        const effective = capability === undefined
          ? { color: false, pager: false }
          : effectiveCapabilities(capability.terminal, options);
        this.featureCalls.push({ content, options, effective });
      };
    }
  }

  render(
    mode: "default" | "tree" | "details",
    report: ProgressReport,
    options: ResolvedDisplayOptions,
  ): TerminalOutput {
    this.renderCalls.push({ mode, options });
    this.renderedReports.push(report);
    if (this.capability !== undefined) {
      const output = consumerOutputCapabilityOutputForCode(this.capability.code);
      const terminalOutput = new ConsumerTerminalOutput(
        output.terminal.content,
        output.terminal.fallbackStdout,
      );
      this.calls.push(this.label);
      this.renderedOutputs.push(terminalOutput);
      return terminalOutput;
    }
    const progress = report.progress;
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
    const plain = `${rendered}\n`;
    const terminalOutput = new ConsumerTerminalOutput(
      contentFromPlain(plain),
      plain,
    );
    this.renderedOutputs.push(terminalOutput);
    return terminalOutput;
  }

  renderDocument(
    document: InfoDocument,
    options?: TerminalOutputOptions,
  ): TerminalOutput {
    this.infoDocuments.push(document);
    this.infoRenderCalls.push({ document, options });
    const kind = typeof document === "object" && document !== null &&
      "kind" in document && typeof document.kind === "string"
      ? document.kind
      : "unknown";
    const text = `consumer info:${kind}\n`;
    const output = new ConsumerTerminalOutput(
      contentFromPlain(text),
      text,
    );
    this.renderedOutputs.push(output);
    return output;
  }

  renderWarning(document: WarningDocument): TerminalOutput {
    return this.renderDiagnostic(
      `Warning: ${document.message}`,
      "warning",
    );
  }

  renderError(document: ErrorDocument): TerminalOutput {
    return this.renderDiagnostic(
      `howdone: error: ${document.message}`,
      "error",
    );
  }

  private renderDiagnostic(
    text: string,
    semantic: "warning" | "error",
  ): TerminalOutput {
    const output = new ConsumerTerminalOutput({
      lines: [{ parts: [{ text, semantic }] }],
    }, `${text}\n`);
    const record: {
      document: TerminalOutput;
      options: TerminalOutputOptions | undefined;
    } = { document: output, options: undefined };
    this.diagnosticCalls.push(record);
    this.pendingDiagnostics.set(output, record);
    return output;
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
  private readonly capability?: ConsumerOutputCapabilityCase;
  readonly label: string;
  readonly calls: string[] = [];
  readonly renderCalls: Array<{
    report: ProgressReport;
    options: ResolvedDisplayOptions | undefined;
  }> = [];
  readonly renderedObjects: JsonObject[] = [];
  readonly featureCalls: Array<{
    content: JsonObject;
    options: JsonOutputOptions | undefined;
    effective: ConsumerOutputCapabilities;
  }> = [];
  readonly writeWithTerminalFeatures:
    | ((content: JsonObject, options?: JsonOutputOptions) => void)
    | undefined;

  constructor(
    capability?: ConsumerOutputCapabilityCase,
  ) {
    this.capability = capability;
    this.label = capability?.json.label ?? "consumer-json-port";
    if (capability !== undefined &&
      (capability.json.color || capability.json.pager)) {
      this.writeWithTerminalFeatures = (content, options) => {
        const effective = effectiveCapabilities(capability.json, options);
        this.featureCalls.push({ content, options, effective });
      };
    }
  }

  render(
    report: ProgressReport,
    options?: ResolvedDisplayOptions,
  ): JsonObject {
    this.renderCalls.push({ report, options });
    if (this.capability !== undefined) {
      const rendered = consumerOutputCapabilityOutputForCode(this.capability.code)
        .json.object;
      this.calls.push(JSON.stringify(rendered));
      this.renderedObjects.push(rendered);
      return rendered;
    }
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
    ) as JsonObject;
    const serialized = JSON.stringify(rendered);
    this.calls.push(serialized);
    this.renderedObjects.push(rendered);
    return rendered;
  }
}
