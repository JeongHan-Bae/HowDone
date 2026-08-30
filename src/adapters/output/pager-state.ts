export type PagerAction =
  | "line-up"
  | "line-down"
  | "page-up"
  | "page-down"
  | "quit"
  | "interrupt";

export interface PagerInputKey {
  upArrow?: boolean;
  downArrow?: boolean;
  pageUp?: boolean;
  pageDown?: boolean;
  ctrl?: boolean;
}

export interface PagerViewport {
  offset: number;
  totalLines: number;
  height: number;
}

function positiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function totalLineCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function maximumOffset(viewport: PagerViewport): number {
  return Math.max(0, viewport.totalLines - viewport.height);
}

export function normalizePagerViewport(
  viewport: PagerViewport,
): PagerViewport {
  const normalized = {
    totalLines: totalLineCount(viewport.totalLines),
    height: positiveInteger(viewport.height, 1),
    offset: Number.isFinite(viewport.offset) ? Math.floor(viewport.offset) : 0,
  };
  return {
    ...normalized,
    offset: Math.min(
      Math.max(0, normalized.offset),
      maximumOffset(normalized),
    ),
  };
}

export function shouldPage(totalLines: number, height: number): boolean {
  return totalLineCount(totalLines) > positiveInteger(height, 1);
}

export function movePager(
  viewport: PagerViewport,
  action: Exclude<PagerAction, "quit" | "interrupt">,
): PagerViewport {
  const current = normalizePagerViewport(viewport);
  const step = action.startsWith("page-") ? current.height : 1;
  const direction = action.endsWith("down") ? 1 : -1;
  return normalizePagerViewport({
    ...current,
    offset: current.offset + direction * step,
  });
}

export function resizePager(
  viewport: PagerViewport,
  height: number,
): PagerViewport {
  return normalizePagerViewport({ ...viewport, height });
}

export function pagerActionForInput(
  input: string,
  key: PagerInputKey,
): PagerAction | undefined {
  if (key.ctrl && (input === "c" || input === "\u0003")) return "interrupt";
  if (input === "q") return "quit";
  if (key.upArrow || input === "k") return "line-up";
  if (key.downArrow || input === "j") return "line-down";
  if (key.pageUp || input === "b") return "page-up";
  if (key.pageDown || input === " ") return "page-down";
  return undefined;
}
