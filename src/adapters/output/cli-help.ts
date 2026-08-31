import type {
  InfoDocument as CoreInfoDocument,
  RuntimeDependency,
  TerminalOutputLine,
  TerminalTextDocument,
} from "howdone";
import {
  semanticTitleLine,
  terminalHelpLine,
} from "./cli-help-terminal.ts";

/** @brief Installed CLI document path used by the Help syntax reference. */
export const CLI_SYNTAX_REFERENCE = "docs/syntax.md";

/**
 * @brief A command name or a command name with one displayed alias.
 */
export type HelpCommand = string | readonly [string, string];

/**
 * @brief A literal code fragment embedded in a Help document.
 *
 * @details
 * The CLI declares code explicitly while defining Help content. Rendering
 * converts it to the terminal `code` semantic; the terminal adapter decides
 * whether a non-TTY representation includes backticks.
 */
export interface HelpCode {
  readonly type: "code";
  readonly text: string;
}

/**
 * @brief A CLI syntax part embedded in a Help document.
 *
 * @details
 * The CLI keeps command, option, and argument roles in the Help document.
 * The CLI terminal renderer maps these roles to terminal `code`.
 */
export interface HelpCliSyntaxPart {
  readonly type: "command" | "option" | "argument";
  readonly text: string;
}

/**
 * @brief A file or dependency reference embedded in a Help document.
 *
 * @details
 * The CLI terminal renderer maps file and dependency roles to its reference
 * presentation. They remain distinguishable from CLI syntax in the document.
 */
export interface HelpReference {
  readonly type: "file" | "dependency";
  readonly text: string;
}

/**
 * @brief An accent fragment embedded in a CLI information document.
 *
 * @details
 * The CLI uses this role for standalone values such as its version. The
 * terminal adapter maps it to the `accent` terminal semantic without adding
 * code markers.
 */
export interface CliAccentPart {
  readonly type: "accent";
  readonly text: string;
}

/**
 * @brief One inline part in the CLI-defined Help document.
 *
 * @details
 * Plain strings remain ordinary prose. Semantic parts are declared by the
 * CLI Help document and rendered by the CLI terminal implementation.
 */
export type HelpDocumentPart =
  | string
  | HelpCode
  | HelpCliSyntaxPart
  | CliAccentPart
  | HelpReference;

/**
 * @brief One source line in the CLI-defined Help document.
 *
 * @details
 * The line preserves the order of prose, code, and reference parts until the
 * CLI converts it into a terminal output line.
 */
export type HelpDocumentLine = readonly HelpDocumentPart[];

/**
 * @brief Structured Help lines before terminal output conversion.
 *
 * @details
 * Each nested line is kept separate so the CLI can perform the existing
 * two-column layout without searching or rewriting completed strings.
 */
export type HelpDocumentText = readonly HelpDocumentLine[];

/**
 * @brief One structured CLI option and its explicitly formatted explanation.
 *
 * @details
 * The command header and argument remain metadata for the two-column label;
 * the explanation carries its own explicit code and reference parts.
 */
export interface HelpOption {
  command: HelpCommand;
  argument: string;
  description: HelpDocumentText;
}

/**
 * @brief The complete CLI-defined Help document content.
 *
 * @details
 * The CLI owns the concrete wording and semantic inline parts. Terminal output
 * conversion happens only after the document has been laid out.
 */
export interface HelpSections {
  usage: string;
  commands: readonly HelpOption[];
  options: readonly HelpOption[];
  globalOptions: readonly HelpOption[];
  supportedPaths: HelpDocumentText;
  calculationRules: HelpDocumentText;
  frontmatterDisplay: HelpDocumentText;
  defaultOutput: HelpDocumentText;
  displayDefaults: HelpDocumentText;
  optionPolicy: HelpDocumentText;
  syntaxReference: HelpDocumentText;
  requirements: HelpRequirements;
}

/**
 * @brief Static and dynamic text surrounding Help runtime dependencies.
 *
 * @details
 * Header and footer lines are ordinary prose. Runtime dependency entries are
 * converted to explicit CLI references when the Help document is generated.
 */
export interface HelpRequirements {
  header: readonly string[];
  footer: readonly string[];
}

/**
 * @brief A CLI-owned information document passed to the terminal renderer.
 *
 * @details
 * A Help document carries the CLI's structured sections, runtime dependency
 * entries, and optional installed file path. Version and dependency commands
 * carry their own compact information lines.
 *
 * The document is intentionally owned by the CLI. Core does not define or
 * inspect its fields; it forwards the object to the terminal port.
 */
export interface CliInfoDocument extends CoreInfoDocument {
  readonly kind: "help" | "version" | "dependencies";
  readonly sections?: HelpSections;
  readonly runtimeDependencies?: readonly RuntimeDependency[];
  readonly syntaxReferencePath?: string;
  readonly lines?: HelpDocumentText;
}

function text(...lines: string[]): string {
  return lines.join("\n");
}

function helpCode(value: string): HelpCode {
  return { type: "code", text: value };
}

function helpCliSyntax(
  type: HelpCliSyntaxPart["type"],
  value: string,
): HelpCliSyntaxPart {
  return { type, text: value };
}

function helpReference(
  type: HelpReference["type"],
  value: string,
): HelpReference {
  return { type, text: value };
}

function helpLine(...parts: HelpDocumentPart[]): HelpDocumentLine {
  return parts;
}

function helpText(
  ...lines: Array<HelpDocumentLine | string>
): HelpDocumentText {
  return lines.map((line) => typeof line === "string" ? helpLine(line) : line);
}

function plainHelpLines(...lines: string[]): HelpDocumentText {
  return lines.map((line) => helpLine(line));
}

const command = (value: string): HelpCliSyntaxPart =>
  helpCliSyntax("command", value);
const option = (value: string): HelpCliSyntaxPart =>
  helpCliSyntax("option", value);
const argument = (value: string): HelpCliSyntaxPart =>
  helpCliSyntax("argument", value);
const file = (value: string): HelpReference => helpReference("file", value);
const dependency = (value: string): HelpReference =>
  helpReference("dependency", value);

/**
 * @brief Creates the complete CLI Help document.
 *
 * @param runtimeDependencies Runtime dependencies listed by Help.
 * @param syntaxReferencePath Optional installed syntax-reference path.
 * @returns The CLI-owned Help information document.
 */
export function createHelpDocument(
  runtimeDependencies: readonly RuntimeDependency[] = [],
  syntaxReferencePath?: string,
): CliInfoDocument {
  return {
    kind: "help",
    sections: HELP_SECTIONS,
    runtimeDependencies,
    ...(syntaxReferencePath === undefined ? {} : { syntaxReferencePath }),
  };
}

/**
 * @brief Creates the CLI version information document.
 *
 * @param version The CLI version to present.
 * @returns The CLI-owned version information document.
 */
export function createVersionDocument(version: string): CliInfoDocument {
  return {
    kind: "version",
    lines: [helpLine({ type: "accent", text: version })],
  };
}

/**
 * @brief Creates the CLI runtime-dependency information document.
 *
 * @param runtimeDependencies Runtime dependencies to present.
 * @returns The CLI-owned dependency information document.
 */
export function createDependenciesDocument(
  runtimeDependencies: readonly RuntimeDependency[],
): CliInfoDocument {
  return {
    kind: "dependencies",
    lines: runtimeDependencies.map(({ name, version }) =>
      helpLine(helpReference("dependency", `${name}@${version}`))
    ),
  };
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
      description: helpText(helpLine("Print this help; standalone.")),
    },
    {
      command: ["--version", "-v"] as const,
      argument: "",
      description: helpText(helpLine("Print the CLI version; standalone.")),
    },
    {
      command: "--dependencies",
      argument: "",
      description: helpText(helpLine(
        "Print direct runtime dependencies; standalone and does not read Markdown.",
      )),
    },
  ],
  options: [
    {
      command: "--format",
      argument: "decimal|percentage",
      description: helpText(helpLine(
        "Format the overall progress value. The default is ",
        argument("percentage"),
        ".",
      )),
    },
    {
      command: ["--format decimal", "--decimal"] as const,
      argument: "",
      description: helpText(helpLine("Select ", argument("decimal"), " output.")),
    },
    {
      command: ["--format percentage", "--percentage"] as const,
      argument: "",
      description: helpText(helpLine("Select ", argument("percentage"), " output.")),
    },
    {
      command: "--precision",
      argument: "N",
      description: helpText(helpLine(
        argument("N"),
        " must be an integer: 0-100 for ",
        argument("percentage"),
        " format, 1-100 for ",
        argument("decimal"),
        " format.",
      )),
    },
    {
      command: ["--show-trailing-zeros", "--keep-trailing-zeros"] as const,
      argument: "",
      description: helpText(helpLine(
        "Keep zeroes to the selected precision (hidden by default).",
      )),
    },
    {
      command: ["--no-trailing-zeros", "--trim-trailing-zeros"] as const,
      argument: "",
      description: helpText(helpLine("Hide trailing zeroes (the default).")),
    },
    {
      command: "--tree",
      argument: "",
      description: helpText(helpLine("Show the statistical tree.")),
    },
    {
      command: "--details",
      argument: "",
      description: helpText(helpLine("Show detailed statistics.")),
    },
    {
      command: "--json",
      argument: "",
      description: helpText(helpLine(
        "Print one JSON object document for command-line pipelines.",
      )),
    },
    {
      command: "--max-label-clusters",
      argument: "N",
      description: helpText(helpLine(
        argument("N"),
        " must be a positive safe integer; keep at most ",
        argument("N"),
        " Unicode grapheme clusters per label. Conflicts with ",
        option("--no-truncate"),
        ".",
      )),
    },
    {
      command: "--no-truncate",
      argument: "",
      description: helpText(helpLine(
        "Disable label truncation. Conflicts with ",
        option("--max-label-clusters"),
        ".",
      )),
    },
    {
      command: "--merge-frontmatter",
      argument: "",
      description: helpText(helpLine(
        "Merge the aggregated frontmatter result with Markdown for the selected display result.",
      )),
    },
    {
      command: "--frontmatter-weight",
      argument: "N",
      description: helpText(helpLine(
        "With ",
        option("--merge-frontmatter"),
        ", at least two components, and checklist roots on both sides, assign ",
        argument("N"),
        " (0 < ",
        argument("N"),
        " < 1) of combined progress to all frontmatter.",
      )),
    },
    {
      command: "--",
      argument: "",
      description: helpText(helpLine(
        "End option parsing; treat the next value as the path.",
      )),
    },
  ],
  globalOptions: [
    {
      command: ["--silent", "-s"] as const,
      argument: "",
      description: helpText(helpLine(
        "Suppress warning diagnostics; errors are still reported.",
      )),
    },
    {
      command: "--strict",
      argument: "",
      description: helpText(helpLine("Turn warnings into errors.")),
    },
    {
      command: "--no-color",
      argument: "",
      description: helpText(helpLine("Disable terminal colors.")),
    },
    {
      command: "--no-pager",
      argument: "",
      description: helpText(helpLine("Disable the in-process terminal pager.")),
    },
  ],
  supportedPaths: plainHelpLines(
    "Relative and absolute paths use the current platform's native path rules, including Unicode names and spaces. Only .md and .markdown files are read.",
  ),
  calculationRules: plainHelpLines(
    "Markdown checkboxes are recognized only from valid GFM task-list items. Checkbox-looking text in ordinary text, code, quotes, tables, and frontmatter strings is ignored. Task-bearing ancestors become statistical branches; branches average their statistical children and ignore their own checkbox state. Markdown and each YAML/TOML frontmatter section are separate sources. Leaves are 100% when checked and 0% when unchecked; overall completion is the equally weighted average of recognized root nodes.",
  ),
  frontmatterDisplay: helpText(
    helpLine(
      "Markdown and each frontmatter section are separate sources in expanded tree, details, and JSON output. ",
      option("--merge-frontmatter"),
      " combines the sources for one result; ",
      option("--frontmatter-weight"),
      " changes the frontmatter share only when both sides contain checklist roots. See ",
      file("docs/syntax.md"),
      " for the full source-layout and weighting contract.",
    ),
  ),
  defaultOutput: helpText(
    helpLine(
      "With only a Markdown path, ",
      command("howdone"),
      " prints the overall percentage. The same concise percentage is used for a body-only or one-section frontmatter-only document. Expanded source sections appear when multiple source components exist; an explicit merge requests one combined result.",
    ),
  ),
  displayDefaults: helpText(
    "Percentage output defaults to 2 decimal places and decimal output defaults to 4; trailing zeroes are hidden by default. Tree and details truncate labels to 10 Unicode grapheme clusters by default; JSON labels are complete.",
  ),
  optionPolicy: helpText(
    helpLine(
      "Value options accept either ",
      helpCode("--option"),
      " ",
      helpCode("N"),
      " or ",
      helpCode("--option=N"),
      ". JSON ignores explicit format, precision, and trailing-zero options and emits a warning; ",
      option("--json"),
      " ",
      option("--no-truncate"),
      " is a silent no-op, while ",
      option("--json"),
      " ",
      option("--max-label-clusters"),
      " ",
      argument("N"),
      " requests JSON label truncation. Output-mode conflicts, truncation conflicts, trailing-zero conflicts, and invalid values are hard errors. Diagnostics use stderr; warning and error colors are selected by the terminal adapter when stderr is a TTY; ",
      option("--silent"),
      " suppresses them and ",
      option("--strict"),
      " turns them into errors.",
    ),
  ),
  syntaxReference: helpText(
    helpLine(
      "The complete Markdown, YAML, TOML, layout, and output contract is in the installed package file ",
      file("docs/syntax.md"),
      ".",
    ),
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

/**
 * @brief Visual layout inputs for Commands and Options help tables.
 *
 * @details
 * The renderer uses terminal cell width for the two-column layout and falls
 * back to a stacked layout when the available terminal width is too narrow.
 *
 * @param columns The available terminal columns.
 * @param leftColumnWidth The maximum left-column width in terminal cells.
 * @param columnGap The gap between the two columns in terminal cells.
 * @param codeMarkers Whether non-TTY code markers count toward the width.
 * @param visualWidth A terminal-cell measurement function.
 */
export interface HelpLayoutOptions {
  columns?: number;
  leftColumnWidth?: number;
  columnGap?: number;
  codeMarkers?: boolean;
  visualWidth?: (value: string) => number;
}

/**
 * @brief Stable default parameters for the help two-column layout.
 */
export const HELP_LAYOUT = {
  columns: 80,
  leftColumnWidth: 32,
  columnGap: 2,
  optionIndent: 2,
  stackedDescriptionIndent: 4,
  stackedThreshold: 48,
} as const;

function defaultVisualWidth(value: string): number {
  // The CLI composition root supplies string-width. This fallback keeps the
  // application renderer usable by consumers that do not provide a terminal
  // measurement function; it is not used by the default CLI adapter.
  return value.length;
}

function normalizedColumns(columns: number | undefined): number | undefined {
  if (columns === undefined) return undefined;
  return Number.isFinite(columns) && columns > 0
    ? Math.floor(columns)
    : HELP_LAYOUT.columns;
}

interface NormalizedHelpLayout {
  columns: number | undefined;
  leftColumnWidth: number;
  columnGap: number;
  optionIndent: number;
  codeMarkers: boolean;
  visualWidth: (value: string) => number;
}

function helpPartText(part: HelpDocumentPart): string {
  return typeof part === "string" ? part : part.text;
}

function helpPartWithText(
  part: HelpDocumentPart,
  value: string,
): HelpDocumentPart {
  return typeof part === "string" ? value : { ...part, text: value };
}

function helpPartUsesCodeMarkers(part: HelpDocumentPart): boolean {
  return typeof part !== "string" && (
    part.type === "code" ||
    part.type === "command" ||
    part.type === "option" ||
    part.type === "argument"
  );
}

interface HelpWord {
  part: HelpDocumentPart;
  spaceBefore: boolean;
}

function helpWords(line: HelpDocumentLine): HelpWord[] {
  const words: HelpWord[] = [];
  let pendingSpace = false;
  for (const part of line) {
    for (const chunk of helpPartText(part).split(/(\s+)/u)) {
      if (chunk.length === 0) continue;
      if (/^\s+$/u.test(chunk)) {
        if (words.length > 0) pendingSpace = true;
        continue;
      }
      words.push({
        part: helpPartWithText(part, chunk),
        spaceBefore: pendingSpace && words.length > 0,
      });
      pendingSpace = false;
    }
  }
  return words;
}

function helpLineVisualWidth(
  line: HelpDocumentLine,
  measure: (value: string) => number,
  codeMarkers = true,
): number {
  return line.reduce((width, part) => width + measure(helpPartText(part)) +
    (codeMarkers && helpPartUsesCodeMarkers(part) ? 2 : 0), 0);
}

function wrapDescription(
  description: HelpDocumentText,
  width: number,
  measure: (value: string) => number,
  codeMarkers: boolean,
): HelpDocumentLine[] {
  const wrapped: HelpDocumentLine[] = [];
  for (const sourceLine of description) {
    const words = helpWords(sourceLine);
    if (words.length === 0) {
      wrapped.push([]);
      continue;
    }
    let current: HelpDocumentPart[] = [];
    for (const word of words) {
      const candidate = current.length === 0
        ? [word.part]
        : [
          ...current,
          ...(word.spaceBefore ? [" "] : []),
          word.part,
        ];
      if (
        current.length > 0 &&
        helpLineVisualWidth(candidate, measure, codeMarkers) > width
      ) {
        wrapped.push(current);
        current = [word.part];
      } else {
        current = candidate;
      }
    }
    wrapped.push(current);
  }
  return wrapped;
}

function optionLabelPartsFor(
  commandValue: HelpCommand,
  argumentValue: string,
): HelpDocumentLine {
  const commands = Array.isArray(commandValue)
    ? commandValue
    : [commandValue];
  const parts: HelpDocumentPart[] = [];
  commands.forEach((commandValue, index) => {
    if (index > 0) parts.push(", ");
    for (const chunk of commandValue.split(/(\s+)/u)) {
      if (chunk.length === 0) continue;
      parts.push(/^\s+$/u.test(chunk)
        ? chunk
        : helpCliSyntax("option", chunk));
    }
  });
  if (argumentValue.length > 0) {
    parts.push(" ", helpCliSyntax("argument", argumentValue));
  }
  return parts;
}

function optionLabelParts(option: HelpOption): HelpDocumentLine {
  return optionLabelPartsFor(option.command, option.argument);
}

function renderOption(
  option: HelpOption,
  layout: NormalizedHelpLayout,
): HelpDocumentLine[] {
  const labelParts = optionLabelParts(option);
  const descriptionWidth = layout.columns === undefined
    ? undefined
    : layout.columns - layout.optionIndent - layout.leftColumnWidth - layout.columnGap;
  const stacked = layout.columns !== undefined && (
    layout.columns < HELP_LAYOUT.stackedThreshold ||
    (descriptionWidth as number) < 12
  );
  const descriptionLines = layout.columns === undefined
    ? [...option.description]
    : wrapDescription(
      option.description,
      Math.max(
        1,
        stacked
          ? layout.columns - HELP_LAYOUT.stackedDescriptionIndent
          : (descriptionWidth as number),
      ),
      layout.visualWidth,
      layout.codeMarkers,
    );
  if (stacked) {
    return [
      helpLine("  ", ...labelParts),
      ...descriptionLines.map((line) => helpLine(
        " ".repeat(HELP_LAYOUT.stackedDescriptionIndent),
        ...line,
      )),
    ];
  }

  const labelWidth = helpLineVisualWidth(
    labelParts,
    layout.visualWidth,
    layout.codeMarkers,
  );
  if (labelWidth > layout.leftColumnWidth) {
    const aliases = Array.isArray(option.command)
      ? option.command.map((commandValue) =>
        optionLabelPartsFor(commandValue, option.argument)
      )
      : [labelParts];
    const splitLabels = aliases.map((alias, index) => helpLine(
      "  ",
      ...alias,
      ...(index === aliases.length - 1 ? [] : [","]),
    ));
    const descriptionIndent = " ".repeat(
      layout.optionIndent + layout.leftColumnWidth + layout.columnGap,
    );
    const lastAlias = aliases.at(-1) ?? labelParts;
    const lastAliasWidth = helpLineVisualWidth(
      lastAlias,
      layout.visualWidth,
      layout.codeMarkers,
    );
    if (lastAliasWidth <= layout.leftColumnWidth) {
      const lastIndex = splitLabels.length - 1;
      splitLabels[lastIndex] = helpLine(
        ...(splitLabels[lastIndex] ?? []),
        " ".repeat(layout.leftColumnWidth - lastAliasWidth + layout.columnGap),
        ...(descriptionLines[0] ?? []),
      );
      return [
        ...splitLabels,
        ...descriptionLines.slice(1).map((line) => helpLine(
          descriptionIndent,
          ...line,
        )),
      ];
    }
    return [
      ...splitLabels,
      ...descriptionLines.map((line) => helpLine(descriptionIndent, ...line)),
    ];
  }

  const prefix = " ".repeat(
    Math.max(layout.columnGap, layout.leftColumnWidth - labelWidth + layout.columnGap),
  );
  return [
    helpLine("  ", ...labelParts, prefix, ...(descriptionLines[0] ?? [])),
    ...descriptionLines.slice(1).map((line) => helpLine(
      " ".repeat(layout.optionIndent + layout.leftColumnWidth + layout.columnGap),
      ...line,
    )),
  ];
}

function normalizedHelpLayout(
  requested: HelpLayoutOptions,
): NormalizedHelpLayout {
  return {
    columns: normalizedColumns(requested.columns),
    leftColumnWidth: Math.max(1, Math.floor(requested.leftColumnWidth ?? HELP_LAYOUT.leftColumnWidth)),
    columnGap: Math.max(1, Math.floor(requested.columnGap ?? HELP_LAYOUT.columnGap)),
    optionIndent: HELP_LAYOUT.optionIndent,
    codeMarkers: requested.codeMarkers ?? true,
    visualWidth: requested.visualWidth ?? defaultVisualWidth,
  };
}

function semanticOptions(
  options: readonly HelpOption[],
  requested: HelpLayoutOptions,
): TerminalOutputLine[] {
  const layout = normalizedHelpLayout(requested);
  return options.flatMap((option) =>
    renderOption(option, layout).map(terminalHelpLine)
  );
}

function semanticSectionLines(
  title: string,
  content: HelpDocumentText,
): TerminalOutputLine[] {
  return [
    semanticTitleLine(title),
    ...content.map((line) => terminalHelpLine(helpLine("  ", ...line))),
  ];
}

function renderRequirements(
  requirements: HelpRequirements,
  runtimeDependencies: readonly RuntimeDependency[],
): HelpDocumentText {
  return [
    ...requirements.header.map((line) => helpLine(line)),
    ...runtimeDependencies.map(({ name, version }) =>
      helpLine("  - ", dependency(`${name}@${version}`))
    ),
    ...requirements.footer.map((line) => helpLine(line)),
  ];
}

/**
 * @brief Renders the structured CLI help document as semantic terminal lines.
 *
 * @details
 * The application owns section content and the existing two-column layout.
 * The CLI terminal renderer maps code, command, option, and argument parts to
 * terminal `code`; file and dependency parts become references with the same
 * code color but no non-TTY markers. The terminal adapter decides how those
 * values appear as plain text or TTY style.
 *
 * The returned document contains no ANSI escape sequences and can be passed
 * to a terminal output Port for target-stream delivery.
 *
 * @param sections Structured help content.
 * @param runtimeDependencies Runtime dependencies listed in Requirements.
 * @param syntaxReferencePath Optional installed syntax-reference path.
 * @param layout Optional terminal layout inputs.
 * @returns The semantic help document.
 */
export function renderHelpOutput(
  sections: HelpSections = HELP_SECTIONS,
  runtimeDependencies: readonly RuntimeDependency[] = [],
  syntaxReferencePath?: string,
  layout: HelpLayoutOptions = {},
): TerminalTextDocument {
  const usageLines = sections.usage.split("\n").map((line) =>
    line.length === 0
      ? terminalHelpLine([])
      : terminalHelpLine(helpLine("  ", helpCode(line)))
  );
  const lines = [
    semanticTitleLine("Usage:"),
    ...usageLines,
    terminalHelpLine([]),
    semanticTitleLine("Commands:"),
    ...semanticOptions(sections.commands, layout),
    terminalHelpLine([]),
    semanticTitleLine("Options:"),
    ...semanticOptions(sections.options, layout),
    terminalHelpLine([]),
    semanticTitleLine("Global options:"),
    ...semanticOptions(sections.globalOptions, layout),
    terminalHelpLine([]),
    ...semanticSectionLines("Supported paths:", sections.supportedPaths),
    terminalHelpLine([]),
    ...semanticSectionLines("Calculation rules:", sections.calculationRules),
    terminalHelpLine([]),
    ...semanticSectionLines("Frontmatter display:", sections.frontmatterDisplay),
    terminalHelpLine([]),
    ...semanticSectionLines("Default output:", sections.defaultOutput),
    terminalHelpLine([]),
    ...semanticSectionLines("Display defaults:", sections.displayDefaults),
    terminalHelpLine([]),
    ...semanticSectionLines("Option policy:", sections.optionPolicy),
    terminalHelpLine([]),
    ...semanticSectionLines(
      "Syntax reference:",
      syntaxReferencePath === undefined
        ? sections.syntaxReference
        : helpText(helpLine(file(syntaxReferencePath))),
    ),
    terminalHelpLine([]),
    ...semanticSectionLines(
      "Requirements:",
      renderRequirements(sections.requirements, runtimeDependencies),
    ),
    terminalHelpLine([]),
  ];
  return { lines };
}

/**
 * @brief Renders one CLI-owned output document for the terminal port.
 *
 * @param document The CLI output document.
 * @param layout Optional terminal layout inputs.
 * @returns The semantic terminal document returned by the CLI renderer.
 */
export function renderCliDocument(
  document: CliInfoDocument,
  layout: HelpLayoutOptions = {},
): TerminalTextDocument {
  if (document.kind !== "help") {
    return {
      lines: (document.lines ?? []).map(terminalHelpLine),
    };
  }
  if (document.sections === undefined) {
    throw new Error("A full CLI document must provide sections.");
  }
  return renderHelpOutput(
    document.sections,
    document.runtimeDependencies ?? [],
    document.syntaxReferencePath,
    layout,
  );
}

function plainHelpText(document: TerminalTextDocument): string {
  if (document.lines.length === 0) return "";
  return `${document.lines
    .map((line) => line.parts.map((part) => part.text).join(""))
    .join("\n")}\n`;
}

/**
 * @brief Renders the structured CLI help document.
 *
 * @details
 * Commands and Options use a pre-laid-out two-column table. The remaining
 * sections remain ordinary prose. The caller supplies terminal dimensions and
 * visual-width measurement when available.
 *
 * @param sections Structured help content.
 * @param runtimeDependencies Runtime dependencies listed in Requirements.
 * @param syntaxReferencePath Optional installed syntax-reference path.
 * @param layout Optional terminal layout inputs.
 * @returns The complete help document as plain text.
 */
export function renderHelpText(
  sections: HelpSections = HELP_SECTIONS,
  runtimeDependencies: readonly RuntimeDependency[] = [],
  syntaxReferencePath?: string,
  layout: HelpLayoutOptions = {},
): string {
  return plainHelpText(renderHelpOutput(
    sections,
    runtimeDependencies,
    syntaxReferencePath,
    layout,
  ));
}
