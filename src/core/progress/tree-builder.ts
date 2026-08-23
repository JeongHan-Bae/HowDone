import type {
  BlockAst,
  ListAst,
  ListItemAst,
  RootAst,
} from "../ast/types.ts";
import type { CheckboxNode } from "./types.ts";

function collectNestedLists(blocks: readonly BlockAst[]): ListAst[] {
  const lists: ListAst[] = [];
  for (const block of blocks) {
    if (block.type === "list") {
      lists.push(block);
    } else if (block.type === "blockquote") {
      lists.push(...collectNestedLists(block.children));
    }
  }
  return lists;
}

function extractLabel(item: ListItemAst): string {
  return item.children
    .filter((block) => block.type === "paragraph" || block.type === "heading")
    .map((block) => block.text.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .join(" ");
}

function buildNode(item: ListItemAst, depth: number): CheckboxNode | undefined {
  const children = collectNestedLists(item.children).flatMap((list) =>
    buildList(list, depth + 1),
  );
  const explicit = item.checked === true || item.checked === false;

  if (!explicit && children.length === 0) {
    return undefined;
  }

  return {
    label: extractLabel(item),
    checked: explicit ? item.checked : null,
    implicit: !explicit,
    children,
    progress: 0,
    depth,
  };
}

function buildList(list: ListAst, depth: number): CheckboxNode[] {
  return list.items
    .map((item) => buildNode(item, depth))
    .filter((node): node is CheckboxNode => node !== undefined);
}

export function buildProgressRoots(ast: RootAst): CheckboxNode[] {
  // Only lists directly owned by the document are roots. Lists nested inside
  // list items are discovered by buildNode; headings and blockquotes do not
  // change the statistical root level.
  return ast.children
    .filter((block): block is ListAst => block.type === "list")
    .flatMap((list) => buildList(list, 0));
}
