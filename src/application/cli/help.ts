import type { RuntimeDependency } from "howdone";

export type HelpCommand = string | readonly [string, string];

export interface HelpOption {
  command: HelpCommand;
  argument: string;
  description: readonly string[];
}

export interface HelpSections {
  usage: string;
  commands: readonly HelpOption[];
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
  commands: [
    {
      command: ["--help", "-h"] as const,
      argument: "",
      description: ["Print this help; standalone."],
    },
    {
      command: ["--version", "-v"] as const,
      argument: "",
      description: ["Print the CLI version; standalone."],
    },
    {
      command: "--dependencies",
      argument: "",
      description: [
        "Print direct runtime dependencies; standalone and does not read Markdown.",
      ],
    },
  ],
  options: [
    {
      command: "--format",
      argument: "decimal|percentage",
      description: [
        "Format the overall progress value. The default is percentage.",
      ],
    },
    {
      command: ["--format decimal", "--decimal"] as const,
      argument: "",
      description: ["Select decimal output."],
    },
    {
      command: ["--format percentage", "--percentage"] as const,
      argument: "",
      description: ["Select percentage output."],
    },
    {
      command: "--precision",
      argument: "N",
      description: [
        "N must be an integer: 0-100 for percentages, 1-100 for decimals.",
      ],
    },
    {
      command: ["--show-trailing-zeros", "--keep-trailing-zeros"] as const,
      argument: "",
      description: [
        "Keep zeroes to the selected precision (hidden by default).",
      ],
    },
    {
      command: ["--no-trailing-zeros", "--trim-trailing-zeros"] as const,
      argument: "",
      description: [
        "Hide trailing zeroes (the default).",
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
        "N must be a positive safe integer; keep at most N Unicode grapheme",
        "clusters per label. Conflicts with --no-truncate.",
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
      command: ["--silent", "-s"] as const,
      argument: "",
      description: [
        "Suppress process warnings; errors are still reported.",
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
    "Checkbox-looking text in ordinary text, code, quotes, tables, and",
    "frontmatter strings is ignored. Task-bearing ancestors become statistical",
    "branches; branches average their statistical children and ignore their own",
    "checkbox state.",
    "Markdown and each YAML/TOML frontmatter section are separate sources.",
    "Leaves are 100% when checked and 0% when unchecked; overall completion is",
    "the equally weighted average of recognized root nodes.",
  ),
  frontmatterDisplay: text(
    "Markdown and each frontmatter section are separate sources in expanded",
    "tree, details, and JSON output. --merge-frontmatter combines the sources",
    "for one result; --frontmatter-weight changes the frontmatter share only",
    "when both sides contain checklist roots. See docs/syntax.md for the full",
    "source-layout and weighting contract.",
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
    "Value options accept either --option N or --option=N.",
    "JSON ignores explicit format, precision, and trailing-zero options and",
    "emits a warning; --json --no-truncate is a silent no-op, while",
    "--json --max-label-clusters N requests JSON label truncation.",
    "Output-mode conflicts, truncation conflicts, trailing-zero conflicts, and",
    "invalid values are hard errors. Warnings use the process warning channel;",
    "--silent suppresses them and --strict turns them into errors.",
  ),
  syntaxReference: text(
    "The complete Markdown, YAML, TOML, layout, and output contract is in the",
    "installed package file docs/syntax.md.",
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

const optionLabelWidth = 36;

function renderOption(option: HelpOption): string[] {
  const command = Array.isArray(option.command)
    ? option.command.join(", ")
    : option.command;
  const label = [command, option.argument]
    .filter((part) => part.length > 0)
    .join(" ");
  const [firstDescription = "", ...continuation] = option.description;
  const continuationIndent = " ".repeat(optionLabelWidth + 2);
  const lines =
    label.length >= optionLabelWidth
      ? [`  ${label}`, `${continuationIndent}${firstDescription}`]
      : [
          `  ${label}${" ".repeat(optionLabelWidth - label.length)}${firstDescription}`,
        ];
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
  syntaxReferencePath?: string,
): string {
  const lines = [
    ...renderSection("Usage:", sections.usage),
    "",
    "Commands:",
    ...sections.commands.flatMap(renderOption),
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
    ...renderSection(
      "Syntax reference:",
      syntaxReferencePath ?? sections.syntaxReference,
    ),
    "",
    ...renderRequirements(sections.requirements, runtimeDependencies),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
