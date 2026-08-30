import { Chalk, type ChalkInstance } from "chalk";
import type {
  TerminalFeatureMode,
  TerminalTextSemantic,
  TextWritable,
} from "howdone";
import {
  isTerminalOutputLineEmpty,
  terminalOutputPartText,
  terminalOutputLineText,
  type TerminalOutput,
  type TerminalOutputPart,
} from "./terminal-output.ts";

/**
 * Colors selected by the CLI terminal adapter for semantic output parts.
 *
 * The core exposes semantic values, not this presentation vocabulary. The
 * adapter is free to change this mapping as terminal capabilities evolve.
 */
export type TerminalColor =
  | "cyan"
  | "gray"
  | "green"
  | "magenta"
  | "red"
  | "yellow";

const colorForSemantic: Partial<Record<TerminalTextSemantic, TerminalColor>> = {
  accent: "cyan",
  code: "magenta",
  muted: "gray",
  complete: "green",
  partial: "yellow",
  zero: "red",
  success: "green",
  warning: "yellow",
  error: "red",
  deprecated: "magenta",
  silent: "gray",
};

/**
 * @brief Returns the adapter-selected color for a semantic output part.
 *
 * @details
 * The mapping remains in the CLI adapter so the core exposes semantic values
 * without depending on a terminal color vocabulary.
 *
 * @param semantic The semantic value supplied by the core output contract.
 * @returns The adapter-selected color, or `undefined` for an unmarked part.
 */
export function terminalColorForSemantic(
  semantic: TerminalTextSemantic | undefined,
): TerminalColor | undefined {
  return semantic === undefined ? undefined : colorForSemantic[semantic];
}

/**
 * @brief Resolves whether the adapter should apply terminal color.
 *
 * @param mode The requested color policy.
 * @param isTTY Whether the adapter's target stream is a TTY.
 * @returns `true` when the requested policy enables color.
 */
export function terminalColorEnabled(
  mode: TerminalFeatureMode | undefined,
  isTTY: boolean,
): boolean {
  return mode !== "never" && isTTY;
}

function applyColor(
  chalk: ChalkInstance,
  color: TerminalColor,
  text: string,
): string {
  switch (color) {
    case "cyan":
      return chalk.cyan(text);
    case "gray":
      return chalk.gray(text);
    case "green":
      return chalk.green(text);
    case "magenta":
      return chalk.magenta(text);
    case "red":
      return chalk.red(text);
    case "yellow":
      return chalk.yellow(text);
  }
}

function styledPart(
  part: TerminalOutputPart,
  chalk: ChalkInstance,
  codeMarkers: boolean,
): string {
  const text = terminalOutputPartText(part, codeMarkers);
  const color = terminalColorForSemantic(part.semantic);
  if (color === undefined) return text;
  const colored = applyColor(chalk, color, text);
  return part.semantic === "muted" || part.semantic === "silent"
    ? chalk.dim(colored)
    : colored;
}

function styledLine(
  line: TerminalOutput["lines"][number],
  chalk: ChalkInstance,
  codeMarkers: boolean,
): string {
  if (isTerminalOutputLineEmpty(line, codeMarkers)) {
    return terminalOutputLineText(line, codeMarkers);
  }
  return line.parts.map((part) => styledPart(part, chalk, codeMarkers)).join("");
}

/**
 * Converts semantic terminal output to the text written by the color path.
 */
export function terminalOutputText(
  content: TerminalOutput,
  colorEnabled: boolean,
  codeMarkers = !colorEnabled,
): string {
  if (content.lines.length === 0) return "";
  const chalk = new Chalk({ level: colorEnabled ? 1 : 0 });
  return `${content.lines
    .map((line) => styledLine(line, chalk, codeMarkers))
    .join("\n")}\n`;
}

/**
 * Writes semantic terminal output through Chalk without embedding ANSI codes
 * in the renderer or the core output contract.
 */
export function writeTerminalOutputWithColor(
  content: TerminalOutput,
  destination: TextWritable,
  colorEnabled: boolean,
  codeMarkers = !colorEnabled,
): void {
  destination.write(terminalOutputText(content, colorEnabled, codeMarkers));
}
