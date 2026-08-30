/**
 * @brief Represents one named or positional checklist entry in frontmatter.
 *
 * @details
 * A nullable `checked` state represents a nested statistical branch. The
 * classifier preserves nested entries so the frontmatter tree builder can
 * apply the same completion rules as the Markdown body.
 */
export interface FrontmatterChecklistEntry {
  /** @brief Entry label, name, or positional identifier. */
  label: string;

  /** @brief Explicit completion state, or `null` for a branch. */
  checked: boolean | null;

  /** @brief Nested entries when this entry has statistical descendants. */
  children?: FrontmatterChecklistEntry[];
}

/**
 * @brief Describes one recognized checklist within a frontmatter document.
 *
 * @details
 * The path identifies where the checklist was found in the decoded YAML or
 * TOML value. Entries retain their source structure for progress analysis and
 * output rendering.
 */
export interface FrontmatterChecklist {
  /** @brief Fixed discriminator for a recognized checklist. */
  type: "checklist";

  /** @brief Property or sequence path leading to this checklist. */
  path: string[];

  /** @brief Checklist entries in their source order. */
  entries: FrontmatterChecklistEntry[];
}

/**
 * @brief Semantic checklist view of one decoded frontmatter section.
 *
 * @details
 * The Core classifier returns only recognized checklist structures. Unknown
 * YAML or TOML values remain outside this document and do not become progress
 * nodes.
 */
export interface FrontmatterDocument {
  /** @brief All recognized checklists in source order. */
  checklists: FrontmatterChecklist[];
}
