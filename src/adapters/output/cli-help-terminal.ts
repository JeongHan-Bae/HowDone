import type { TerminalOutputLine, TerminalOutputPart } from "howdone";
import type { HelpDocumentLine, HelpDocumentPart } from "./cli-help.ts";

/**
 * @brief CLI-only presentation hint for a Help reference.
 *
 * @details
 * The Help document owns the file and dependency roles. The terminal renderer
 * maps those roles to the reference presentation without adding a Core
 * semantic value.
 */
export type HelpTerminalPresentation = "reference";

type HelpTerminalPart = TerminalOutputPart & {
  readonly terminalPresentation?: HelpTerminalPresentation;
};

function terminalHelpPart(part: HelpDocumentPart): HelpTerminalPart {
  if (typeof part === "string") return { text: part };
  if (part.type === "accent") {
    return { text: part.text, semantic: "accent" };
  }
  if (part.type === "file" || part.type === "dependency") {
    return {
      text: part.text,
      semantic: "code",
      terminalPresentation: "reference",
    };
  }
  return { text: part.text, semantic: "code" };
}

/**
 * @brief Renders one CLI Help line as a semantic terminal line.
 *
 * @param line The CLI-defined Help line.
 * @returns The Core-compatible terminal line with CLI presentation mapped.
 */
export function terminalHelpLine(line: HelpDocumentLine): TerminalOutputLine {
  return { parts: line.map(terminalHelpPart) };
}

/**
 * @brief Renders a CLI Help title as an accent terminal line.
 *
 * @param value The title text.
 * @returns The semantic terminal title line.
 */
export function semanticTitleLine(value: string): TerminalOutputLine {
  return { parts: [{ text: value, semantic: "accent" }] };
}
