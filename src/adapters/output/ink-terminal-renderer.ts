import type {
  ErrorDocument,
  InfoDocument,
  ProgressReport,
  ResolvedDisplayOptions,
  TerminalTextDocument,
  TerminalOutputOptions,
  TerminalOutputPort,
  WarningDocument,
} from "howdone";
import {
  inkPagerAvailable,
  inkPagerHeight,
  renderWithInkPager,
  type InkPagerLine,
  type InkPagerPart,
  type InkPagerSource,
} from "./ink-pager.ts";
import { shouldPage } from "./pager-state.ts";
import { TerminalRenderer } from "./terminal-renderer.ts";
import {
  TerminalOutputDocument,
  type TerminalOutput,
} from "./terminal-output.ts";
import {
  terminalColorForSemantic,
  terminalColorEnabled,
  writeTerminalOutputWithColor,
} from "./terminal-colors.ts";
import { terminalEmptyLineMarker } from "./terminal-output.ts";
import {
  terminalColumns,
  terminalVisualLineCount,
  terminalVisualLineRange,
} from "./terminal-width.ts";

/**
 * @brief Target streams used by the Ink terminal adapter.
 *
 * @details
 * The adapter inspects these streams itself before enabling color or paging.
 * The application does not supply a shared TTY decision.
 */
export interface InkTerminalRendererOptions<
  TDocument extends InfoDocument = InfoDocument,
> {
  stdout?: NodeJS.WriteStream;
  stdin?: NodeJS.ReadStream;
  stderr?: NodeJS.WriteStream;
  documentRenderer?: (
    document: TDocument,
    options: {
      readonly columns?: number;
      readonly codeMarkers: boolean;
    },
  ) => TerminalTextDocument;
}

function terminalPagerSource(
  content: TerminalOutput,
  colorEnabled: boolean,
): InkPagerSource {
  const lineForPager = (line: TerminalOutput["lines"][number]): InkPagerLine => {
    const parts: InkPagerPart[] = line.parts.map((part) => {
      const color = colorEnabled
        ? terminalColorForSemantic(part.semantic)
        : undefined;
      return {
        text: part.text,
        ...(color === undefined ? {} : { color }),
        ...(colorEnabled && (
          part.semantic === "muted" || part.semantic === "silent"
        )
          ? { dimColor: true }
          : {}),
      };
    });
    return {
      parts,
      ...(line.emptyLineMarker === true
        ? { emptyLineMarker: terminalEmptyLineMarker }
        : {}),
    };
  };

  return {
    visualLineCount: (columns) => terminalVisualLineCount(content, columns, false),
    visualLineRange: (columns, offset, height) =>
      terminalVisualLineRange(content, columns, offset, height, false).map(lineForPager),
  };
}

/**
 * @brief The default terminal output implementation using Ink for Pager UI.
 *
 * @details
 * The renderer keeps the dependency-free `TerminalOutput` value as the one
 * source for direct output, color output, viewport rows, and the complete text
 * written after a normal `q` exit.
 */
export class InkTerminalRenderer<TDocument extends InfoDocument = InfoDocument>
  implements TerminalOutputPort<TerminalOutput, TDocument> {
  private readonly renderer: TerminalRenderer;
  private readonly stdout: NodeJS.WriteStream;
  private readonly stdin: NodeJS.ReadStream;
  private readonly stderr: NodeJS.WriteStream;
  private readonly documentRenderer?: InkTerminalRendererOptions<TDocument>["documentRenderer"];

  constructor(
    options: InkTerminalRendererOptions<TDocument> = {},
    renderer = new TerminalRenderer(),
  ) {
    this.renderer = renderer;
    this.stdout = options.stdout ?? process.stdout;
    this.stdin = options.stdin ?? process.stdin;
    this.stderr = options.stderr ?? process.stderr;
    this.documentRenderer = options.documentRenderer;
  }

  /**
   * @brief Converts a progress report into semantic terminal output.
   *
   * @param mode The requested human-readable output mode.
   * @param report The progress report to render.
   * @param options The resolved display options.
   * @returns The one semantic terminal output value used by all delivery paths.
   */
  render(
    mode: "default" | "tree" | "details",
    report: ProgressReport,
    options: ResolvedDisplayOptions,
  ): TerminalOutput {
    return this.renderer.render(mode, report, options);
  }

  /**
   * @brief Converts an information document into semantic terminal output.
   *
   * @param document The CLI-owned output document.
   * @param options Requested target and terminal feature modes.
   * @returns The rendered document output.
   */
  renderDocument(
    document: TDocument,
    options: TerminalOutputOptions = {},
  ): TerminalOutput {
    if (this.documentRenderer === undefined) {
      throw new Error("This terminal renderer has no output document renderer.");
    }
    const target = options.target === "stderr" ? this.stderr : this.stdout;
    const targetIsTTY = target.isTTY;
    const colorEnabled = terminalColorEnabled(
      options.color ?? "auto",
      targetIsTTY,
    );
    const rendered = this.documentRenderer(document, {
      ...(targetIsTTY
        ? { columns: terminalColumns(target) }
        : {}),
      codeMarkers: !colorEnabled,
    });
    return new TerminalOutputDocument(rendered.lines);
  }

  /**
   * @brief Converts a warning document into semantic terminal output.
   *
   * @param document The warning document.
   * @returns The rendered warning output.
   */
  renderWarning(document: WarningDocument): TerminalOutput {
    return new TerminalOutputDocument([{
      parts: [{ text: `Warning: ${document.message}`, semantic: "warning" }],
    }]);
  }

  /**
   * @brief Converts an error document into semantic terminal output.
   *
   * @param document The error document.
   * @returns The rendered error output.
   */
  renderError(document: ErrorDocument): TerminalOutput {
    return new TerminalOutputDocument([{
      parts: [{ text: `howdone: error: ${document.message}`, semantic: "error" }],
    }]);
  }

  /**
   * @brief Prints one rendered value with the requested optional features.
   *
   * @details
   * Color and Pager are independently selected from the target streams' TTY
   * state. A non-TTY target receives ordinary plain output.
   *
   * @param content The exact streamable value returned by `render`.
   * @param options The requested color and pager modes.
   * @returns A promise that settles after direct or Ink delivery completes.
   */
  async print(
    content: TerminalOutput,
    options: TerminalOutputOptions = {},
  ): Promise<void> {
    const target = options.target === "stderr" ? this.stderr : this.stdout;
    const targetIsTTY = target.isTTY;
    const colorEnabled = terminalColorEnabled(
      options.color ?? "auto",
      targetIsTTY,
    );
    if (target === this.stderr) {
      writeTerminalOutputWithColor(content, target, colorEnabled, !targetIsTTY);
      return;
    }

    const stdoutIsTty = this.stdout.isTTY;
    const stdoutColorEnabled = terminalColorEnabled(options.color ?? "auto", stdoutIsTty);
    const visualLineCount = terminalVisualLineCount(
      content,
      terminalColumns(this.stdout),
      !stdoutIsTty,
    );
    const pagerEnabled = inkPagerAvailable(this.stdout, this.stdin) &&
      options.pager !== "never" && shouldPage(
        visualLineCount,
        inkPagerHeight(this.stdout),
      );

    if (!stdoutColorEnabled && !pagerEnabled) {
      writeTerminalOutputWithColor(content, this.stdout, false, !stdoutIsTty);
      return;
    }
    if (!pagerEnabled) {
      writeTerminalOutputWithColor(content, this.stdout, stdoutColorEnabled, !stdoutIsTty);
      return;
    }

    const exitAction = await renderWithInkPager(
      terminalPagerSource(content, stdoutColorEnabled),
      stdoutColorEnabled,
      this.stdout,
      this.stdin,
    );
    if (exitAction === "quit") {
      writeTerminalOutputWithColor(content, this.stdout, stdoutColorEnabled, !stdoutIsTty);
    }
  }
}
