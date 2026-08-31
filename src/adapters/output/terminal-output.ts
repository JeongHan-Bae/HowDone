import type {
  TerminalOutput as CoreTerminalOutput,
  TerminalOutputLine as CoreTerminalOutputLine,
  TerminalOutputPart as CoreTerminalOutputPart,
  TextWritable,
} from "howdone";

/**
 * @brief CLI-only presentation hint for terminal output parts.
 *
 * @details
 * This hint is an adapter detail and is not part of the Core port contract.
 * It lets the CLI keep a reference on the code color while suppressing the
 * non-TTY code markers that belong to literal code fragments.
 */
export interface CliTerminalOutputPart extends CoreTerminalOutputPart {
  readonly terminalPresentation?: "reference";
}

export type TerminalOutputPart = CliTerminalOutputPart;

/**
 * @brief The adapter's concrete view of one semantic terminal line.
 */
export interface TerminalOutputLine extends Omit<CoreTerminalOutputLine, "parts"> {
  readonly parts: readonly TerminalOutputPart[];
}

/**
 * @brief The adapter's concrete streamable terminal document.
 */
export type TerminalOutput = Omit<CoreTerminalOutput, "lines"> & {
  readonly lines: readonly TerminalOutputLine[];
};

/**
 * The visible representation used for a tree separator line.
 * Keeping it here makes direct output and Pager output use the same value.
 */
export const terminalEmptyLineMarker = "\\";

/**
 * @brief Converts one semantic part to the CLI's plain terminal text.
 *
 * @details
 * The Core supplies the raw part text and semantic value. This CLI adapter
 * chooses Markdown-like backticks for non-styled `code` parts; its local
 * reference presentation hint keeps references on the same color without
 * adding those markers. Other terminal providers may choose a different
 * representation.
 *
 * @param part The semantic terminal part.
 * @param codeMarkers Whether the non-styled representation includes backticks
 *                    around `code` parts.
 * @returns The adapter's plain representation of the part.
 */
export function terminalOutputPartText(
  part: TerminalOutputPart,
  codeMarkers = true,
): string {
  return part.semantic === "code" &&
      part.terminalPresentation !== "reference" && codeMarkers
    ? `\`${part.text}\``
    : part.text;
}

/**
 * @brief Tests whether a semantic line has no visible text parts.
 *
 * @param line The line to inspect.
 * @param codeMarkers Whether the non-styled representation includes code
 *                    markers.
 * @returns `true` when every part has an empty adapter representation.
 */
export function isTerminalOutputLineEmpty(
  line: TerminalOutputLine,
  codeMarkers = true,
): boolean {
  return line.parts.every((part) =>
    terminalOutputPartText(part, codeMarkers).length === 0
  );
}

/**
 * @brief Converts one adapter line to its plain-text representation.
 *
 * @param line The line to convert.
 * @param codeMarkers Whether the non-styled representation includes code
 *                    markers.
 * @returns The concatenated adapter text, or the tree-only empty-line marker
 *          when the line explicitly requests it.
 */
export function terminalOutputLineText(
  line: TerminalOutputLine,
  codeMarkers = true,
): string {
  return line.emptyLineMarker === true && isTerminalOutputLineEmpty(line, codeMarkers)
    ? terminalEmptyLineMarker
    : line.parts.map((part) => terminalOutputPartText(part, codeMarkers)).join("");
}

/**
 * A dependency-free terminal output value used by the default renderer.
 *
 * The semantic lines and parts stay available to a terminal-aware adapter.
 * Plain delivery intentionally joins those parts without emitting ANSI
 * control sequences. The CLI's non-styled `code` semantic is represented
 * with backticks. A TTY presentation can omit those markers and use color
 * instead. A tree separator line explicitly marked by the renderer is
 * represented by the shared visible `\` marker; ordinary empty lines stay
 * empty.
 */
export class TerminalOutputDocument implements TerminalOutput {
  readonly lines: readonly TerminalOutputLine[];

  constructor(lines: readonly TerminalOutputLine[]) {
    this.lines = lines;
  }

  /**
   * @brief Writes the complete plain-text document to a destination.
   *
   * @param destination The text sink that receives the document.
   */
  writeTo(destination: TextWritable): void {
    if (this.lines.length === 0) return;
    destination.write(`${this.lines.map((line) => terminalOutputLineText(line)).join("\n")}\n`);
  }

  /**
   * @brief Returns the complete plain-text document.
   *
   * @returns The document as ordinary text without ANSI control sequences.
   */
  toString(): string {
    let value = "";
    this.writeTo({ write: (chunk) => { value += chunk; } });
    return value;
  }
}
