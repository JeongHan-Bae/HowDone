import type { RootAst } from "../ast/types.ts";
import { buildProgressRoots } from "./tree-builder.ts";
import { summarizeProgress } from "./metrics.ts";
import type { CheckboxNode, LayerStatistics, ProgressResult } from "./types.ts";

export function calculateProgress(ast: RootAst): ProgressResult {
  return summarizeProgress(buildProgressRoots(ast));
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
