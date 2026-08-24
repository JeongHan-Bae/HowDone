import type { RootAst } from "../ast/types.ts";
import type { FrontmatterFormat } from "../ast/types.ts";
import { buildFrontmatterRoots } from "../frontmatter/tree-builder.ts";
import type { FrontmatterDocument } from "../frontmatter/types.ts";
import { buildProgressRoots } from "./tree-builder.ts";
import { combineProgressResults, summarizeProgress } from "./metrics.ts";
import type {
  CheckboxNode,
  FrontmatterProgress,
  LayerStatistics,
  ProgressResult,
} from "./types.ts";

export function calculateProgress(ast: RootAst): ProgressResult {
  return summarizeProgress(buildProgressRoots(ast));
}

export function calculateFrontmatterProgress(
  format: FrontmatterFormat,
  document: FrontmatterDocument,
): FrontmatterProgress {
  return {
    format,
    checklists: document.checklists,
    progress: summarizeProgress(buildFrontmatterRoots(document)),
  };
}

export function calculateCombinedProgress(
  markdown: ProgressResult,
  frontmatter: readonly FrontmatterProgress[],
  requestedFrontmatterWeight?: number,
): ProgressResult {
  const frontmatterResult = combineProgressResults(
    frontmatter.map((section) => section.progress),
  );
  const totalRoots = markdown.rootCount + frontmatterResult.rootCount;
  if (frontmatterResult.rootCount === 0) return markdown;
  if (markdown.rootCount === 0) return frontmatterResult;

  const combined = combineProgressResults([frontmatterResult, markdown]);
  const frontmatterWeight = requestedFrontmatterWeight ??
    frontmatterResult.rootCount / totalRoots;
  const progress = requestedFrontmatterWeight === undefined
    ? combined.progress
    : frontmatterResult.progress * frontmatterWeight +
      markdown.progress * (1 - frontmatterWeight);
  return {
    ...combined,
    completedEquivalent: progress * totalRoots,
    progress,
    percentage: progress * 100,
  };
}

export function collectLayerStatistics(
  result: ProgressResult,
): LayerStatistics[] {
  const byDepth = new Map<number, LayerStatistics>();

  for (const node of result.roots.flatMap((root) => [
    root,
    ...flattenNodeChildren(root),
  ])) {
    const current = byDepth.get(node.depth) ?? {
      depth: node.depth,
      nodeCount: 0,
      leafCount: 0,
      branchCount: 0,
    };
    current.nodeCount += 1;
    if (node.children.length === 0) {
      current.leafCount += 1;
    } else {
      current.branchCount += 1;
    }
    byDepth.set(node.depth, current);
  }

  return [...byDepth.values()].sort((left, right) => left.depth - right.depth);
}

function flattenNodeChildren(node: CheckboxNode): CheckboxNode[] {
  return node.children.flatMap((child) => [
    child,
    ...flattenNodeChildren(child),
  ]);
}

export function flattenProgressNodes(
  input: ProgressResult | readonly CheckboxNode[],
): CheckboxNode[] {
  if (Array.isArray(input)) {
    return input.flatMap((node) => [node, ...flattenNodeChildren(node)]);
  }
  const result = input as ProgressResult;
  return result.roots.flatMap((node) => [node, ...flattenNodeChildren(node)]);
}
