/**
 * @brief Identifies the supported frontmatter syntaxes.
 */
export type FrontmatterFormat = "yaml" | "toml";

/**
 * @brief Represents the Markdown body as an ordered block tree.
 *
 * @details
 * The root contains Markdown body blocks only. Leading YAML and TOML
 * frontmatter is kept separately on `DocumentAst`.
 */
export interface RootAst {
  /** @brief Identifies this node as the root of a Markdown block tree. */
  type: "root";

  /** @brief Top-level blocks in their source order. */
  children: BlockAst[];
}

/**
 * @brief Represents the normalized syntax tree for one source document.
 *
 * @details
 * Frontmatter sections and the Markdown body are separate channels so callers
 * can analyze them independently or combine their progress explicitly.
 */
export interface DocumentAst {
  /** @brief Identifies this value as a normalized document AST. */
  type: "document";

  /** @brief Leading YAML or TOML frontmatter sections in source order. */
  frontmatter: FrontmatterAst[];

  /** @brief The Markdown body, excluding the separate frontmatter sections. */
  body: RootAst;
}

/**
 * @brief Represents an ordinary Markdown paragraph.
 */
export interface ParagraphAst {
  /** @brief Identifies this block as a paragraph. */
  type: "paragraph";

  /** @brief Text content extracted from the paragraph's inline content. */
  text: string;
}

/**
 * @brief Represents a Markdown heading.
 */
export interface HeadingAst {
  /** @brief Identifies this block as a heading. */
  type: "heading";

  /** @brief Markdown heading level, where 1 is the highest level. */
  depth: number;

  /** @brief Text content extracted from the heading's inline content. */
  text: string;
}

/**
 * @brief Represents one item in a Markdown list.
 *
 * @details
 * A list item may contain nested blocks, including nested lists. The `checked`
 * field distinguishes a task-list item from an ordinary list item.
 */
export interface ListItemAst {
  /** @brief Identifies this block as a list item. */
  type: "list-item";

  /**
   * @brief Task-list state: checked, unchecked, or not a task-list item.
   */
  checked: boolean | null;

  /** @brief Blocks contained by this list item, in source order. */
  children: BlockAst[];
}

/**
 * @brief Represents an ordered or unordered Markdown list.
 *
 * @details
 * Items remain in source order. For an unordered list, `start` is `null`; for
 * an ordered list it records the first source number when one is available.
 */
export interface ListAst {
  /** @brief Identifies this block as a list. */
  type: "list";

  /** @brief True for an ordered list and false for an unordered list. */
  ordered: boolean;

  /** @brief First ordered-list number, or `null` for an unordered list. */
  start: number | null;

  /** @brief List items in their source order. */
  items: ListItemAst[];
}

/**
 * @brief Represents a Markdown block quote.
 */
export interface BlockquoteAst {
  /** @brief Identifies this block as a block quote. */
  type: "blockquote";

  /** @brief Blocks nested inside the quote, in source order. */
  children: BlockAst[];
}

/**
 * @brief Represents a Markdown code block.
 *
 * @details
 * Code blocks are preserved as syntax nodes so downstream progress logic can
 * ignore checkbox-looking text that is not a task-list item.
 */
export interface CodeBlockAst {
  /** @brief Identifies this block as a code block. */
  type: "code-block";

  /** @brief Declared code language, or `null` when none was provided. */
  language: string | null;

  /** @brief Code block contents without the Markdown fence. */
  value: string;
}

/**
 * @brief Represents a Markdown table that is not a task-list structure.
 */
export interface TableAst {
  /** @brief Identifies this block as a table. */
  type: "table";

  /** @brief Text extracted from the table for opaque preservation. */
  value: string;
}

/**
 * @brief Represents a raw HTML block in the Markdown body.
 */
export interface HtmlAst {
  /** @brief Identifies this block as raw HTML. */
  type: "html";

  /** @brief Raw HTML source retained by the normalized AST. */
  value: string;
}

/**
 * @brief Represents a Markdown thematic break.
 */
export interface ThematicBreakAst {
  /** @brief Identifies this block as a thematic break. */
  type: "thematic-break";
}

/**
 * @brief Represents a source block without a dedicated normalized AST shape.
 *
 * @details
 * The value is retained so the parser can preserve the block boundary while
 * progress analysis ignores syntax that does not represent a task list.
 */
export interface UnsupportedAst {
  /** @brief Identifies this block as an unsupported normalized block. */
  type: "unsupported";

  /** @brief Text retained for the unsupported block. */
  value: string;
}

/**
 * @brief Represents one leading YAML or TOML frontmatter section.
 */
export interface FrontmatterAst {
  /** @brief Identifies this value as a frontmatter section. */
  type: "frontmatter";

  /** @brief Syntax used to encode the section. */
  format: FrontmatterFormat;

  /** @brief Raw section contents without the surrounding delimiters. */
  value: string;
}

/**
 * @brief Union of all normalized Markdown body block shapes.
 *
 * @details
 * The `type` field on each member is the discriminant callers can use for
 * exhaustive narrowing.
 */
export type BlockAst =
  | ParagraphAst
  | HeadingAst
  | ListAst
  | BlockquoteAst
  | CodeBlockAst
  | TableAst
  | HtmlAst
  | ThematicBreakAst
  | UnsupportedAst;
