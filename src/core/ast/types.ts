export type FrontmatterFormat = "yaml" | "toml";

export interface RootAst {
  type: "root";
  children: BlockAst[];
}

export interface DocumentAst {
  type: "document";
  frontmatter: FrontmatterAst[];
  body: RootAst;
}

export interface ParagraphAst {
  type: "paragraph";
  text: string;
}

export interface HeadingAst {
  type: "heading";
  depth: number;
  text: string;
}

export interface ListItemAst {
  type: "list-item";
  checked: boolean | null;
  children: BlockAst[];
}

export interface ListAst {
  type: "list";
  ordered: boolean;
  start: number | null;
  items: ListItemAst[];
}

export interface BlockquoteAst {
  type: "blockquote";
  children: BlockAst[];
}

export interface CodeBlockAst {
  type: "code-block";
  language: string | null;
  value: string;
}

export interface TableAst {
  type: "table";
  value: string;
}

export interface HtmlAst {
  type: "html";
  value: string;
}

export interface ThematicBreakAst {
  type: "thematic-break";
}

export interface UnsupportedAst {
  type: "unsupported";
  value: string;
}

export interface FrontmatterAst {
  type: "frontmatter";
  format: FrontmatterFormat;
  value: string;
}

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
