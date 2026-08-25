import type { RuntimeDependency } from "../../core/index.ts";

export interface HelpOption {
  command: string;
  argument: string;
  description: readonly string[];
}

export interface HelpSections {
  usage: string;
  options: readonly HelpOption[];
  supportedPaths: string;
  calculationRules: string;
  frontmatterDisplay: string;
  defaultOutput: string;
  displayDefaults: string;
  optionPolicy: string;
  syntaxReference: string;
  requirements: HelpRequirements;
}

export interface HelpRequirements {
  header: readonly string[];
  footer: readonly string[];
}

function text(...lines: string[]): string {
  return lines.join("\n");
}

export const HELP_SECTIONS: HelpSections = {
  usage: text(
    "howdone <markdown-path> [options]",
    "howdone --help",
    "howdone --version",
    "howdone --dependencies",
  ),
  options: [
    {
      command: "--format",
      argument: "decimal|percentage",
      description: [
        "Format the overall progress value. The default is an explicit",
        "percentage; --decimal and --percentage are aliases for the two formats.",
      ],
    },
    {
      command: "--percentage",
      argument: "",
      description: ["Explicit percentage format (alias for --format percentage)."],
    },
    {
      command: "--precision",
      argument: "N",
      description: [
        "Decimal places: 0-100 for percentages, 1-100 for decimals.",
      ],
    },
    {
      command: "--show-trailing-zeros",
      argument: "",
      description: [
        "Keep zeroes to the selected precision (hidden by default).",
        "--keep-trailing-zeros is an alias.",
      ],
    },
    {
      command: "--no-trailing-zeros",
      argument: "",
      description: [
        "Hide trailing zeroes (the default). --trim-trailing-zeros is",
        "an alias.",
      ],
    },
    {
      command: "--tree",
      argument: "",
      description: ["Show the statistical tree."],
    },
    {
      command: "--details",
      argument: "",
      description: ["Show detailed statistics."],
    },
    {
      command: "--json",
      argument: "",
      description: ["Print one JSON object document for command-line pipelines."],
    },
    {
      command: "--max-label-clusters",
      argument: "N",
      description: [
        "Keep at most N Unicode grapheme clusters per label.",
        "Conflicts with --no-truncate.",
      ],
    },
    {
      command: "--no-truncate",
      argument: "",
      description: [
        "Disable label truncation. Conflicts with",
        "--max-label-clusters.",
      ],
    },
    {
      command: "--silent",
      argument: "",
      description: [
        "Suppress process warnings; errors are still reported.",
        "-s is the npm-compatible shorthand.",
      ],
    },
    {
      command: "--merge-frontmatter",
      argument: "",
      description: [
        "Merge the aggregated frontmatter result with Markdown",
        "for the selected display result.",
      ],
    },
    {
      command: "--frontmatter-weight",
      argument: "N",
      description: [
        "With --merge-frontmatter, at least two components, and checklist",
        "roots on both sides, assign N (0 < N < 1) of combined progress",
        "to all frontmatter.",
      ],
    },
    {
      command: "--strict",
      argument: "",
      description: ["Turn warnings into errors."],
    },
    {
      command: "--",
      argument: "",
      description: ["End option parsing; treat the next value as the path."],
    },
  ],
  supportedPaths: text(
    "Relative and absolute paths use the current platform's native path rules,",
    "including Unicode names and spaces. Only .md and .markdown files are read.",
  ),
  calculationRules: text(
    "Markdown checkboxes are recognized only from valid GFM task-list items.",
    "Checkbox-looking text in code blocks, quotes, tables, ordinary text, and",
    "frontmatter strings is not a Markdown checkbox.",
    "Ordered and unordered list items with task descendants belong to the same",
    "Markdown task tree. A branch ignores its own checkbox state and averages",
    "its statistical children; a plain subtree with no checkbox descendants is",
    "discarded.",
    "The body and frontmatter are independent optional channels. Frontmatter",
    "sections are recognized only as a top-level document prefix and may be",
    "YAML or TOML in any source order. A delimiter-shaped block after Markdown",
    "body content remains ordinary Markdown, even when its contents resemble",
    "YAML or TOML.",
    "Repeated YAML or TOML sections are parsed independently; matching keys or",
    "table names do not merge. Recognized roots from every section are included",
    "in the report-level calculation while section order remains visible in",
    "tree, details, and JSON.",
    "A checkbox is one recognized leaf item with a boolean state. A checklist",
    "container is a mapping, table, sequence, or array of tables. A recognized",
    "mapping/table requires boolean direct values; mixed parent objects are",
    "ordinary at that level and nested candidates are evaluated independently.",
    "A mapping/table below a named property is a checklist container when it",
    "is non-empty and every direct value is boolean. A mapping/table with a",
    "string name and boolean done is one named leaf, even with extra fields;",
    "those fields are ignored. Root boolean maps are ignored.",
    "A sequence below a named property is either an unnamed boolean sequence",
    "(boolean leaves and unnamed nested sequences) or a named-record sequence",
    "(every item has string name and boolean done). YAML may mix boolean leaves",
    "with unnamed nested sequences; TOML arrays must keep one direct element",
    "kind. Named records cannot be inserted into an unnamed sequence.",
    "A root YAML sequence is ignored, and TOML has no bare root array.",
    "Unnamed sequence entries use numeric dotted labels below their containing",
    "property or table name; named-record entries use their name values as",
    "labels.",
    "A named property/table may contain an unnamed sequence. Once an unnamed sequence",
    "is entered, every descendant must remain boolean or an unnamed sequence; a",
    "named record cannot appear inside it.",
    "One non-boolean value or an empty nested sequence invalidates that candidate.",
    "A sequence of records is also valid when every record has a string name and",
    "boolean done; each matching record is always one leaf checkbox. Other",
    "record fields, including nested mappings/tables, are ignored. Container",
    "names such as checklist and tasks have no",
    "special meaning.",
    "YAML collections may mix value types. TOML arrays follow TOML's homogeneous",
    "array grammar, so a mixed scalar array is a parser error.",
    "The source format remains authoritative; invalid TOML syntax is a parser",
    "error before semantic checklist classification.",
    "A leaf is 100% when checked and 0% when unchecked. A Markdown branch averages",
    "its statistical children and ignores its own checkbox marker.",
    "Overall completion is the equally weighted average of root nodes.",
  ),
  frontmatterDisplay: text(
    "A body-only document or a frontmatter-only document with one section keeps",
    "the original single-source display shape. A body plus frontmatter, or multiple",
    "frontmatter sections, is grouped",
    "by source in tree, details, and JSON.",
    "--merge-frontmatter requires at least two source components; every YAML or",
    "TOML section counts as one component, and the Markdown body counts as one.",
    "It aggregates all frontmatter sections before combining them with Markdown.",
    "With no --frontmatter-weight, all frontmatter roots share one frontmatter",
    "side, and the side's weight is frontmatter root count divided by all",
    "frontmatter roots plus Markdown roots. Roots within frontmatter are still",
    "equally weighted by their own root count.",
    "A numeric weight in (0, 1) without --merge-frontmatter is invalid. A value",
    "of 0, 1, below 0, above 1, or a non-decimal value is illegal. Both cases",
    "emit a process warning and are ignored by default; --strict turns them into",
    "errors. --silent suppresses those warnings.",
    "A frontmatter-only merge may combine multiple headers, but a frontmatter",
    "weight is invalid unless both frontmatter and Markdown have checklist roots.",
  ),
  defaultOutput: text(
    "With only a Markdown path, howdone prints the overall percentage.",
    "The same concise percentage is used for a body-only or one-section",
    "frontmatter-only document. Expanded source sections appear when multiple",
    "channels exist or when an explicit merge is requested.",
  ),
  displayDefaults: text(
    "Percentage output defaults to 2 decimal places and decimal output defaults",
    "to 4; trailing zeroes are hidden by default. Tree and details truncate",
    "labels to 10 Unicode grapheme clusters by default; JSON labels are complete.",
  ),
  optionPolicy: text(
    "JSON ignores explicit format, precision, and trailing-zero options and",
    "emits a warning; --json --no-truncate is a silent no-op, while",
    "--json --max-label-clusters N requests JSON label truncation.",
    "Output-mode conflicts, truncation conflicts, trailing-zero conflicts, and",
    "invalid values are hard errors. Warnings use the process warning channel;",
    "--silent suppresses them and --strict turns them into errors.",
  ),
  syntaxReference: text(
    "The complete Markdown, YAML, TOML, layout, and output contract is in",
    "docs/syntax.md in the published package.",
  ),
  requirements: {
    header: [
      "Node.js 18.18 or newer is required.",
      "Runtime dependencies:",
    ],
    footer: [
      "These dependencies are installed with the published package.",
    ],
  },
};

const optionLabelWidth = 28;

function renderOption(option: HelpOption): string[] {
  const label = [option.command, option.argument]
    .filter((part) => part.length > 0)
    .join(" ");
  const [firstDescription = "", ...continuation] = option.description;
  const lines = [`  ${label.padEnd(optionLabelWidth)}${firstDescription}`];
  const continuationIndent = " ".repeat(optionLabelWidth + 2);
  lines.push(
    ...continuation.map((line) => `${continuationIndent}${line}`),
  );
  return lines;
}

function renderSection(title: string, value: string): string[] {
  return [title, ...value.split("\n").map((line) => `  ${line}`)];
}

function renderRequirements(
  requirements: HelpRequirements,
  runtimeDependencies: readonly RuntimeDependency[],
): string[] {
  const lines = [
    ...requirements.header,
    ...runtimeDependencies.map(({ name, version }) => `  - ${name}@${version}`),
    ...requirements.footer,
  ];
  return renderSection("Requirements:", lines.join("\n"));
}

export function renderDependenciesText(
  runtimeDependencies: readonly RuntimeDependency[],
): string {
  const lines = runtimeDependencies.map(
    ({ name, version }) => `${name}@${version}`,
  );
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

export function renderHelpText(
  sections: HelpSections = HELP_SECTIONS,
  runtimeDependencies: readonly RuntimeDependency[] = [],
): string {
  const lines = [
    ...renderSection("Usage:", sections.usage),
    "",
    "Options:",
    ...sections.options.flatMap(renderOption),
    "",
    ...renderSection("Supported paths:", sections.supportedPaths),
    "",
    ...renderSection("Calculation rules:", sections.calculationRules),
    "",
    ...renderSection("Frontmatter display:", sections.frontmatterDisplay),
    "",
    ...renderSection("Default output:", sections.defaultOutput),
    "",
    ...renderSection("Display defaults:", sections.displayDefaults),
    "",
    ...renderSection("Option policy:", sections.optionPolicy),
    "",
    ...renderSection("Syntax reference:", sections.syntaxReference),
    "",
    ...renderRequirements(sections.requirements, runtimeDependencies),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
