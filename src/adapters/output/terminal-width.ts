import stringWidth from "string-width";
import { defaultGraphemeSegmenter } from "../unicode/intl-grapheme-segmenter.ts";
import type {
  TerminalOutput,
  TerminalOutputLine,
} from "./terminal-output.ts";
import { terminalOutputPartText } from "./terminal-output.ts";

/**
 * Measures the number of terminal cells needed to display text.
 *
 * The implementation is supplied by the CLI adapter so the Core/application
 * package does not need a Unicode-width runtime dependency.
 */
export function terminalVisualWidth(value: string): number {
  return stringWidth(value);
}

/**
 * Returns the terminal's usable column count, with Ink's standard fallback.
 */
export function terminalColumns(stdout: NodeJS.WriteStream): number {
  return Number.isFinite(stdout.columns) && (stdout.columns ?? 0) > 0
    ? Math.floor(stdout.columns as number)
    : 80;
}

/**
 * @brief A text part that can be split into terminal visual rows.
 */
export interface VisualTextPart {
  readonly text: string;
}

type WrappedVisualLine<TPart extends VisualTextPart> = {
  readonly parts: readonly TPart[];
  readonly emptyLineMarker?: string;
};

function appendVisualPart<TPart extends VisualTextPart>(
  parts: TPart[],
  part: TPart,
  text: string,
): void {
  if (text.length === 0) return;
  parts.push({ ...part, text } as TPart);
}

/**
 * @brief Splits one visual line into rows that fit the target width.
 *
 * The adapter uses the existing grapheme segmenter and `string-width`; it
 * does not measure terminal cells with JavaScript string length.
 *
 * @param line The visual line to split.
 * @param columns The target terminal width in cells.
 * @returns The wrapped visual rows, retaining each part's presentation data.
 */
export function wrapVisualTextLine<TPart extends VisualTextPart>(
  line: { readonly parts: readonly TPart[]; readonly emptyLineMarker?: string },
  columns: number,
): WrappedVisualLine<TPart>[] {
  if (line.parts.every((part) => part.text.length === 0)) {
    return [{
      parts: [],
      ...(line.emptyLineMarker === undefined
        ? {}
        : { emptyLineMarker: line.emptyLineMarker }),
    }];
  }
  const widthLimit = Number.isFinite(columns) && columns > 0
    ? Math.max(1, Math.floor(columns))
    : 80;
  const rows: WrappedVisualLine<TPart>[] = [];
  let parts: TPart[] = [];
  let width = 0;

  const flush = () => {
    rows.push({ parts });
    parts = [];
    width = 0;
  };

  for (const part of line.parts) {
    for (const grapheme of defaultGraphemeSegmenter.segment(part.text)) {
      const graphemeWidth = terminalVisualWidth(grapheme);
      if (graphemeWidth > 0 && width > 0 && width + graphemeWidth > widthLimit) {
        flush();
      }
      appendVisualPart(parts, part, grapheme);
      width += graphemeWidth;
    }
  }

  if (parts.length > 0 || rows.length === 0) flush();
  return rows;
}

/**
 * @brief Splits one semantic terminal line into rows that fit the target width.
 *
 * @param line The semantic terminal line to split.
 * @param columns The target terminal width in cells.
 * @param codeMarkers Whether non-TTY code markers should be included in width calculation.
 * @returns Wrapped terminal lines with their boolean tree marker preserved.
 */
export function wrapTerminalLine(
  line: TerminalOutputLine,
  columns: number,
  codeMarkers = true,
): TerminalOutputLine[] {
  const marker = line.emptyLineMarker === true ? "\\" : undefined;
  return wrapVisualTextLine(
    {
      parts: line.parts.map((part) => ({
        ...part,
        text: terminalOutputPartText(part, codeMarkers),
      })),
      ...(marker === undefined ? {} : { emptyLineMarker: marker }),
    },
    columns,
  ).map((row) => ({
    parts: row.parts,
    ...(row.emptyLineMarker === undefined ? {} : { emptyLineMarker: true }),
  }));
}

/**
 * Counts the visual rows of the supplied semantic output without retaining a
 * second, wrapped output document.
 */
export function terminalVisualLineCount(
  content: TerminalOutput,
  columns: number,
  codeMarkers = true,
): number {
  return content.lines.reduce(
    (count, line) => count + wrapTerminalLine(line, columns, codeMarkers).length,
    0,
  );
}

/**
 * Returns only the requested visual row range from the supplied semantic
 * output. The source lines remain the single output object shared by direct
 * output and the Pager.
 */
export function terminalVisualLineRange(
  content: TerminalOutput,
  columns: number,
  offset: number,
  height: number,
  codeMarkers = true,
): TerminalOutputLine[] {
  const start = Math.max(0, Math.floor(offset));
  const end = start + Math.max(0, Math.floor(height));
  if (end <= start) return [];

  const selected: TerminalOutputLine[] = [];
  let visualIndex = 0;
  for (const line of content.lines) {
    const wrapped = wrapTerminalLine(line, columns, codeMarkers);
    for (const visualLine of wrapped) {
      if (visualIndex >= start && visualIndex < end) {
        selected.push(visualLine);
      }
      visualIndex += 1;
      if (visualIndex >= end) return selected;
    }
  }
  return selected;
}
