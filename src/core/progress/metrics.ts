import type { CheckboxNode, ProgressResult } from "./types.ts";

export function calculateNodeProgress(node: CheckboxNode): number {
  if (node.children.length > 0) {
    node.progress =
      node.children.reduce(
        (sum, child) => sum + calculateNodeProgress(child),
        0,
      ) / node.children.length;
  } else {
    node.progress = node.checked === true ? 1 : 0;
  }
  return node.progress;
}

export function flattenProgressNodes(
  nodes: readonly CheckboxNode[],
): CheckboxNode[] {
  return nodes.flatMap((node) => [node, ...flattenProgressNodes(node.children)]);
}

export function summarizeProgress(roots: CheckboxNode[]): ProgressResult {
  roots.forEach(calculateNodeProgress);
  const nodes = flattenProgressNodes(roots);
  const rootCount = roots.length;
  const completedEquivalent = roots.reduce(
    (sum, root) => sum + root.progress,
    0,
  );
  const progress = rootCount === 0 ? 0 : completedEquivalent / rootCount;

  return {
    rootCount,
    explicitCheckboxCount: nodes.filter((node) => !node.implicit).length,
    implicitNodeCount: nodes.filter((node) => node.implicit).length,
    nodeCount: nodes.length,
    completedEquivalent,
    progress,
    percentage: progress * 100,
    roots,
  };
}

function cloneNode(node: CheckboxNode): CheckboxNode {
  return {
    ...node,
    children: node.children.map(cloneNode),
  };
}

export function combineProgressResults(
  results: readonly ProgressResult[],
): ProgressResult {
  return summarizeProgress(
    results.flatMap((result) => result.roots.map(cloneNode)),
  );
}
