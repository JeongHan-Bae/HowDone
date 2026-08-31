import {Chalk, type ChalkInstance} from "chalk";
import type {
  CheckboxNode,
  FrontmatterProgress,
  GraphemeSegmenter,
  JsonObject,
  JsonOutputOptions,
  JsonOutputPort,
  ProgressReport,
  ProgressResult,
  ResolvedDisplayOptions,
  TerminalFeatureMode,
} from "howdone";
import {defaultGraphemeSegmenter} from "../unicode/intl-grapheme-segmenter.ts";
import {
  inkPagerAvailable,
  inkPagerHeight,
  type InkPagerLine,
  type InkPagerSource,
  inkPagerVisualLineCount,
  inkPagerVisualLineRange,
  renderWithInkPager,
} from "./ink-pager.ts";
import {formatLabel} from "./label-formatter.ts";
import {shouldPage} from "./pager-state.ts";
import {terminalColumns} from "./terminal-width.ts";

type JsonSyntax = "punctuation" | "key" | "string" | "number" | "keyword";
type JsonColor = "cyan" | "gray" | "green" | "magenta" | "yellow";

interface JsonDisplayPart {
  readonly text: string;
  readonly syntax?: JsonSyntax;
}

interface JsonDisplayLine {
  readonly parts: readonly JsonDisplayPart[];
}

/**
 * @brief Target stream configuration for the JSON output adapter.
 *
 * @details
 * The adapter owns this target and inspects its TTY state when an optional
 * terminal delivery hook is used. The application does not provide a shared
 * TTY decision.
 */
export interface JsonRendererOptions {
  stdout?: NodeJS.WriteStream;
  stdin?: NodeJS.ReadStream;
}

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

function styleJsonPart(
  text: string,
  syntax: JsonSyntax,
  chalk: ChalkInstance,
): string {
  switch (syntax) {
    case "punctuation":
      return chalk.gray(text);
    case "key":
      return chalk.cyan(text);
    case "string":
      return chalk.green(text);
    case "number":
      return chalk.yellow(text);
    case "keyword":
      return chalk.magenta(text);
  }
}

function jsonColorForSyntax(syntax: JsonSyntax): JsonColor {
  switch (syntax) {
    case "punctuation":
      return "gray";
    case "key":
      return "cyan";
    case "string":
      return "green";
    case "number":
      return "yellow";
    case "keyword":
      return "magenta";
  }
}

function jsonScalarPart(
  value: string | number | boolean | null,
): JsonDisplayPart {
  if (typeof value === "string") {
    return { text: JSON.stringify(value), syntax: "string" };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { text: "null", syntax: "keyword" };
    }
    return { text: JSON.stringify(value), syntax: "number" };
  }
  return { text: JSON.stringify(value), syntax: "keyword" };
}

function jsonPart(text: string, syntax?: JsonSyntax): JsonDisplayPart {
  return syntax === undefined ? { text } : { text, syntax };
}

function appendJsonPart(parts: JsonDisplayPart[], part: JsonDisplayPart): void {
  if (part.text.length === 0) return;
  const previous = parts.at(-1);
  if (previous !== undefined && previous.syntax === part.syntax) {
    parts[parts.length - 1] = {
      ...previous,
      text: previous.text + part.text,
    };
    return;
  }
  parts.push(part);
}

function appendJsonSuffix(
  line: JsonDisplayLine,
  suffix: JsonDisplayPart,
): JsonDisplayLine {
  const parts = [...line.parts];
  appendJsonPart(parts, suffix);
  return { parts };
}

function jsonValueLines(value: unknown, indent: string): JsonDisplayLine[] {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [{ parts: [jsonScalarPart(value)] }];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return [{ parts: [jsonPart("[]", "punctuation")] }];
    const lines: JsonDisplayLine[] = [{
      parts: [jsonPart("[", "punctuation")],
    }];
    value.forEach((item, index) => {
      const child = jsonValueLines(item, `${indent}  `);
      const first = child[0] ?? { parts: [] };
      const childLines: JsonDisplayLine[] = [{
        parts: [jsonPart(`${indent}  `), ...first.parts],
      }, ...child.slice(1)];
      if (index < value.length - 1) {
        const lastIndex = childLines.length - 1;
        const last = childLines[lastIndex];
        if (last !== undefined) {
          childLines[lastIndex] = appendJsonSuffix(last, jsonPart(",", "punctuation"));
        }
      }
      lines.push(...childLines);
    });
    lines.push({
      parts: [jsonPart(indent), jsonPart("]", "punctuation")],
    });
    return lines;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return [{ parts: [jsonPart("{}", "punctuation")] }];
  const lines: JsonDisplayLine[] = [{
    parts: [jsonPart("{", "punctuation")],
  }];
  entries.forEach(([key, item], index) => {
    const child = jsonValueLines(item, `${indent}  `);
    const first = child[0] ?? { parts: [] };
    const childLines: JsonDisplayLine[] = [{
      parts: [
        jsonPart(`${indent}  `),
        jsonPart(JSON.stringify(key), "key"),
        jsonPart(": ", "punctuation"),
        ...first.parts,
      ],
    }, ...child.slice(1)];
    if (index < entries.length - 1) {
      const lastIndex = childLines.length - 1;
      const last = childLines[lastIndex];
      if (last !== undefined) {
        childLines[lastIndex] = appendJsonSuffix(last, jsonPart(",", "punctuation"));
      }
    }
    lines.push(...childLines);
  });
  lines.push({
    parts: [jsonPart(indent), jsonPart("}", "punctuation")],
  });
  return lines;
}

function jsonDisplayLines(value: JsonObject): JsonDisplayLine[] {
  return jsonValueLines(value, "");
}

function styledJsonPart(part: JsonDisplayPart, chalk: ChalkInstance): string {
  return part.syntax === undefined
    ? part.text
    : styleJsonPart(part.text, part.syntax, chalk);
}

function jsonTerminalText(value: JsonObject, chalk: ChalkInstance): string {
  return `${jsonDisplayLines(value)
    .map((line) => line.parts.map((part) => styledJsonPart(part, chalk)).join(""))
    .join("\n")}\n`;
}

function jsonPagerSource(
  content: JsonObject,
  colorEnabled: boolean,
): InkPagerSource {
  const linesForPager = (): InkPagerLine[] => jsonDisplayLines(content).map((line) => ({
    parts: line.parts.map((part) => {
      const color = colorEnabled && part.syntax !== undefined
        ? jsonColorForSyntax(part.syntax)
        : undefined;
      return {
        text: part.text,
        ...(color === undefined ? {} : { color }),
      };
    }),
  }));

  return {
    visualLineCount: (columns) => inkPagerVisualLineCount(linesForPager(), columns),
    visualLineRange: (columns, offset, height) =>
      inkPagerVisualLineRange(linesForPager(), columns, offset, height),
  };
}

function plainJsonText(value: JsonObject): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function modeEnables(
  mode: TerminalFeatureMode | undefined,
  isTty: boolean,
): boolean {
  return mode !== "never" && isTty;
}

/**
 * @brief Renders progress reports as JSON data and optionally colored JSON.
 *
 * @details
 * `render` returns the JSON object itself. The optional delivery hook receives
 * that same object and may color or page JSON for its own TTY.
 */
export class JsonRenderer implements JsonOutputPort {
  private readonly segmenter: GraphemeSegmenter;
  private readonly stdout: NodeJS.WriteStream;
  private readonly stdin: NodeJS.ReadStream;

  constructor(
    segmenter: GraphemeSegmenter = defaultGraphemeSegmenter,
    options: JsonRendererOptions = {},
  ) {
    this.segmenter = segmenter;
    this.stdout = options.stdout ?? process.stdout;
    this.stdin = options.stdin ?? process.stdin;
  }

  /**
   * @brief Converts a progress report into a JSON object.
   *
   * @details
   * The returned object contains raw numeric fields and complete labels unless
   * the caller supplies an explicit truncation option. It contains no terminal
   * control sequences; those belong only to the optional delivery method.
   *
   * @param report The progress report to serialize.
   * @param options Optional display options for JSON label truncation.
   * @returns The JSON data object for the report.
   */
  render(report: ProgressReport, options?: ResolvedDisplayOptions): JsonObject {
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

    return !hasDocumentSections || !nestedPresentation
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
                  : {frontmatterWeight: report.frontmatterWeight}),
              frontmatter: formatChecklists(frontmatter, options, this.segmenter),
              ...(markdownPresent
                  ? {markdown: formatProgress(markdown, options, this.segmenter)}
                  : {}),
            }
            : {
              source: report.source,
              progress,
              presentation: report.presentation ?? "separate",
              ...(report.frontmatterWeight === undefined
                  ? {}
                  : {frontmatterWeight: report.frontmatterWeight}),
              frontmatter,
              ...(markdownPresent ? {markdown} : {}),
            };
  }

  /**
   * @brief Writes the rendered JSON object with optional terminal features.
   *
   * @details
   * The adapter decides `auto` from its own target streams. `never` always
   * writes ordinary JSON. Pager is selected independently from color.
   *
   * @param content The exact JSON object returned by `render`.
   * @param options The requested JSON terminal feature modes.
   * @returns A promise that settles after direct or Ink delivery completes.
   */
  writeWithTerminalFeatures(
    content: JsonObject,
    options: JsonOutputOptions = {},
  ): void | Promise<void> {
    const colorEnabled = modeEnables(options.color ?? "auto", this.stdout.isTTY);
    const source = jsonPagerSource(content, colorEnabled);
    const pagerEnabled = inkPagerAvailable(this.stdout, this.stdin) && (
      options.pager !== "never" && shouldPage(
        source.visualLineCount(terminalColumns(this.stdout)),
        inkPagerHeight(this.stdout),
      )
    );

    if (!colorEnabled && !pagerEnabled) {
      this.stdout.write(plainJsonText(content));
      return;
    }
    if (!pagerEnabled) {
      this.stdout.write(jsonTerminalText(content, new Chalk({ level: 1 })));
      return;
    }

    return renderWithInkPager(
      source,
      colorEnabled,
      this.stdout,
      this.stdin,
    ).then((exitAction) => {
      if (exitAction === "quit") {
        this.stdout.write(colorEnabled
          ? jsonTerminalText(content, new Chalk({ level: 1 }))
          : plainJsonText(content));
      }
    });
  }
}

export const defaultJsonRenderer = new JsonRenderer();
