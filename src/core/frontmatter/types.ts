export interface FrontmatterChecklistEntry {
  label: string;
  checked: boolean | null;
  children?: FrontmatterChecklistEntry[];
}

export interface FrontmatterChecklist {
  type: "checklist";
  path: string[];
  entries: FrontmatterChecklistEntry[];
}

export interface FrontmatterDocument {
  checklists: FrontmatterChecklist[];
}
