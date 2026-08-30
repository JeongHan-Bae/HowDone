import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  render as renderInk,
  useApp,
  useInput,
  useStdout,
} from "ink";
import type { Key, RenderOptions } from "ink";
import {
  movePager,
  normalizePagerViewport,
  pagerActionForInput,
  type PagerAction,
} from "./pager-state.ts";
import {
  terminalColumns,
  wrapVisualTextLine,
} from "./terminal-width.ts";

/**
 * @brief One presentation-aware text part for the shared Ink Pager.
 */
export interface InkPagerPart {
  readonly text: string;
  readonly color?: string;
  readonly dimColor?: boolean;
}

/**
 * @brief One line supplied to the shared Ink Pager.
 *
 * @details
 * The line is derived from the caller's original output value. The Pager does
 * not own or replace that value. An empty marker is rendered only when the
 * caller explicitly supplies one.
 */
export interface InkPagerLine {
  readonly parts: readonly InkPagerPart[];
  readonly emptyLineMarker?: string;
}

/**
 * @brief The lazy visual-row operations required by the shared Ink Pager.
 *
 * @details
 * Implementations keep their original content value as the source and derive
 * only the visible rows requested by the current width, offset, and height.
 */
export interface InkPagerSource {
  visualLineCount(columns: number): number;
  visualLineRange(
    columns: number,
    offset: number,
    height: number,
  ): readonly InkPagerLine[];
}

/**
 * @brief Wraps one Pager line using terminal visual cell width.
 *
 * @param line The line to wrap.
 * @param columns The available terminal columns.
 * @returns The visual rows with their presentation parts preserved.
 */
export function wrapInkPagerLine(
  line: InkPagerLine,
  columns: number,
): InkPagerLine[] {
  return wrapVisualTextLine(line, columns).map((row) => ({
    parts: row.parts,
    ...(row.emptyLineMarker === undefined
      ? {}
      : { emptyLineMarker: row.emptyLineMarker }),
  }));
}

/**
 * @brief Counts visual rows in a set of Pager lines.
 *
 * @param lines The source lines.
 * @param columns The available terminal columns.
 * @returns The number of rows after visual wrapping.
 */
export function inkPagerVisualLineCount(
  lines: readonly InkPagerLine[],
  columns: number,
): number {
  return lines.reduce(
    (count, line) => count + wrapInkPagerLine(line, columns).length,
    0,
  );
}

/**
 * @brief Selects only a requested visual row range from Pager lines.
 *
 * @param lines The source lines.
 * @param columns The available terminal columns.
 * @param offset The first visual row to return.
 * @param height The maximum number of rows to return.
 * @returns The selected visual rows.
 */
export function inkPagerVisualLineRange(
  lines: readonly InkPagerLine[],
  columns: number,
  offset: number,
  height: number,
): InkPagerLine[] {
  const start = Math.max(0, Math.floor(offset));
  const end = start + Math.max(0, Math.floor(height));
  if (end <= start) return [];

  const selected: InkPagerLine[] = [];
  let visualIndex = 0;
  for (const line of lines) {
    for (const visualLine of wrapInkPagerLine(line, columns)) {
      if (visualIndex >= start && visualIndex < end) selected.push(visualLine);
      visualIndex += 1;
      if (visualIndex >= end) return selected;
    }
  }
  return selected;
}

/**
 * @brief Returns the height reserved for an Ink Pager viewport.
 *
 * @param stdout The Pager's target stdout stream.
 * @returns The available viewport rows after reserving one terminal row.
 */
export function inkPagerHeight(stdout: NodeJS.WriteStream): number {
  const rows = Number.isFinite(stdout.rows) && stdout.rows > 0
    ? Math.floor(stdout.rows)
    : 24;
  return Math.max(1, rows - 1);
}

/**
 * @brief Checks whether a pair of streams can support the shared Ink Pager.
 *
 * @param stdout The Pager's target stdout stream.
 * @param stdin The Pager's input stream.
 * @returns `true` when both streams are TTY-aware and raw input is available.
 */
export function inkPagerAvailable(
  stdout: NodeJS.WriteStream,
  stdin: NodeJS.ReadStream,
): boolean {
  return stdout.isTTY && stdin.isTTY &&
    typeof stdin.setRawMode === "function";
}

function partElement(
  part: InkPagerPart,
  colorEnabled: boolean,
  key: string,
): React.ReactElement {
  return React.createElement(
    Text,
    {
      key,
      color: colorEnabled ? part.color : undefined,
      dimColor: colorEnabled && part.dimColor === true,
    },
    part.text,
  );
}

function lineElement(
  line: InkPagerLine,
  colorEnabled: boolean,
  key: string,
): React.ReactElement {
  const children = line.parts.length === 0
    ? line.emptyLineMarker ?? " "
    : line.parts.map((part, index) =>
      partElement(part, colorEnabled, `${key}-${index}`)
    );
  return React.createElement(Text, { key }, children);
}

interface PagerViewProps {
  source: InkPagerSource;
  colorEnabled: boolean;
  onExit: (action: Extract<PagerAction, "quit" | "interrupt">) => void;
}

function PagerView({
  source,
  colorEnabled,
  onExit,
}: PagerViewProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [height, setHeight] = useState(() => inkPagerHeight(stdout));
  const [columns, setColumns] = useState(() => terminalColumns(stdout));
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      setHeight(inkPagerHeight(stdout));
      setColumns(terminalColumns(stdout));
    };
    stdout.on("resize", updateSize);
    updateSize();
    return () => {
      stdout.off("resize", updateSize);
    };
  }, [stdout]);

  useInput((input: string, key: Key) => {
    const action = pagerActionForInput(input, key);
    if (action === "quit" || action === "interrupt") {
      onExit(action);
      exit();
      return;
    }
    if (action === undefined) return;
    const totalLines = source.visualLineCount(columns);
    setOffset((currentOffset) => movePager(
      normalizePagerViewport({
        offset: currentOffset,
        totalLines,
        height,
      }),
      action,
    ).offset);
  });

  const viewport = normalizePagerViewport({
    offset,
    totalLines: source.visualLineCount(columns),
    height,
  });
  const visibleLines = source.visualLineRange(
    columns,
    viewport.offset,
    viewport.height,
  );

  return React.createElement(
    Box,
    {
      flexDirection: "column",
      height: viewport.height,
      overflow: "hidden",
    },
    visibleLines.map((line, index) => lineElement(
      line,
      colorEnabled,
      `${viewport.offset + index}`,
    )),
  );
}

/**
 * @brief Runs the shared in-process Ink Pager for one output value.
 *
 * @details
 * Ink owns viewport drawing, input handling, cursor state, terminal cleanup,
 * and resize updates. The source callback remains responsible for deriving
 * rows from its original content value.
 *
 * @param source The lazy visual-row source for the output value.
 * @param colorEnabled Whether source presentation colors should be applied.
 * @param stdout The Pager's target stdout stream.
 * @param stdin The Pager's input stream.
 * @returns The exit action, if the user left the Pager through `q` or Ctrl+C.
 */
export async function renderWithInkPager(
  source: InkPagerSource,
  colorEnabled: boolean,
  stdout: NodeJS.WriteStream,
  stdin: NodeJS.ReadStream,
): Promise<Extract<PagerAction, "quit" | "interrupt"> | undefined> {
  let exitAction: Extract<PagerAction, "quit" | "interrupt"> | undefined;
  let clearBeforeExit = () => {};
  const renderOptions: RenderOptions = {
    stdout,
    stdin,
    exitOnCtrlC: false,
    patchConsole: false,
  };
  const instance = renderInk(
    React.createElement(PagerView, {
      source,
      colorEnabled,
      onExit: (action) => {
        exitAction = action;
        clearBeforeExit();
      },
    }),
    renderOptions,
  );
  clearBeforeExit = instance.clear;
  await instance.waitUntilExit();
  return exitAction;
}
