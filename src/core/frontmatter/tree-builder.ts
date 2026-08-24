import type { CheckboxNode } from "../progress/types.ts";
import type {
  FrontmatterChecklist,
  FrontmatterChecklistEntry,
  FrontmatterDocument,
} from "./types.ts";

function buildEntryNode(
  entry: FrontmatterChecklistEntry,
  depth: number,
): CheckboxNode {
  const children = entry.children?.map((child) => buildEntryNode(child, depth + 1)) ?? [];
  return {
    label: entry.label,
    checked: children.length > 0 ? null : entry.checked,
    implicit: children.length > 0,
    children,
    progress: 0,
    depth,
  };
}

function buildChecklistRoot(checklist: FrontmatterChecklist): CheckboxNode {
  return {
    label: checklist.path.join("."),
    checked: null,
    implicit: true,
    children: checklist.entries.map((entry) => buildEntryNode(entry, 1)),
    progress: 0,
    depth: 0,
  };
}

export function buildFrontmatterRoots(
  document: FrontmatterDocument,
): CheckboxNode[] {
  return document.checklists.flatMap((checklist) =>
    checklist.path.length === 0
      ? checklist.entries.map((entry) => buildEntryNode(entry, 0))
      : [buildChecklistRoot(checklist)]
  );
}
