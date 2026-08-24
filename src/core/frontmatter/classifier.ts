import type {
  FrontmatterChecklist,
  FrontmatterChecklistEntry,
  FrontmatterDocument,
} from "./types.ts";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBooleanMapping(value: RecordValue): boolean {
  const entries = Object.values(value);
  return entries.length > 0 && entries.every((entry) => typeof entry === "boolean");
}

function booleanSequenceEntries(
  value: unknown,
  indexPath: readonly number[] = [],
): FrontmatterChecklistEntry[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const entries: FrontmatterChecklistEntry[] = [];
  for (const [index, child] of value.entries()) {
    const childPath = [...indexPath, index];
    if (typeof child === "boolean") {
      entries.push({
        label: childPath.join("."),
        checked: child,
      });
      continue;
    }
    if (!Array.isArray(child)) return undefined;
    const nestedEntries = booleanSequenceEntries(child, childPath);
    if (nestedEntries === undefined) return undefined;
    entries.push({
      label: childPath.join("."),
      checked: null,
      children: nestedEntries,
    });
  }
  return entries.length > 0 ? entries : undefined;
}

function namedEntry(value: unknown): FrontmatterChecklistEntry | undefined {
  if (!isRecord(value)) return undefined;
  return typeof value.name === "string" && typeof value.done === "boolean"
    ? { label: value.name, checked: value.done }
    : undefined;
}

function namedSequenceEntries(
  value: unknown,
): FrontmatterChecklistEntry[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const entries: FrontmatterChecklistEntry[] = [];
  for (const child of value) {
    const entry = namedEntry(child);
    if (entry === undefined) return undefined;
    entries.push(entry);
  }
  return entries;
}

function checklistEntries(
  value: unknown,
): FrontmatterChecklistEntry[] | undefined {
  if (isRecord(value)) {
    if (isBooleanMapping(value)) {
      return Object.entries(value).map(([label, checked]) => ({
        label,
        checked: checked as boolean,
      }));
    }
    const entry = namedEntry(value);
    return entry === undefined ? undefined : [entry];
  }
  return booleanSequenceEntries(value) ?? namedSequenceEntries(value);
}

function rootChecklistEntries(
  value: unknown,
): FrontmatterChecklistEntry[] | undefined {
  if (!isRecord(value)) return undefined;
  const entry = namedEntry(value);
  return entry === undefined ? undefined : [entry];
}

function collectChecklists(
  value: unknown,
  path: readonly string[],
  output: FrontmatterChecklist[],
): void {
  const entries = path.length === 0
    ? rootChecklistEntries(value)
    : checklistEntries(value);
  if (entries !== undefined) {
    output.push({
      type: "checklist",
      path: [...path],
      entries,
    });
    return;
  }

  if (Array.isArray(value)) return;
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    collectChecklists(child, [...path, key], output);
  }
}

/**
 * Applies HowDone's frontmatter recognition rules to a parsed YAML/TOML value.
 * Syntax decoding is deliberately kept in the format adapter.
 */
export function classifyFrontmatter(value: unknown): FrontmatterDocument {
  const checklists: FrontmatterChecklist[] = [];
  collectChecklists(value, [], checklists);
  return { checklists };
}
