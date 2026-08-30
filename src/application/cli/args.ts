import type { ProgressFormat } from "howdone";

export type CliCommandHeader = string | readonly [string, string];

export interface CliOptionHeader {
  command: CliCommandHeader;
  argument: string;
}

export const CLI_USAGE = [
  "howdone <markdown-path> [options]",
  "howdone --help",
  "howdone --version",
  "howdone --dependencies",
] as const;

export const CLI_COMMANDS = [
  ["--help", "-h"],
  ["--version", "-v"],
  "--dependencies",
] as const satisfies readonly CliCommandHeader[];

export const CLI_OPTIONS = [
  { command: "--format", argument: "decimal|percentage" },
  { command: ["--format decimal", "--decimal"], argument: "" },
  { command: ["--format percentage", "--percentage"], argument: "" },
  { command: "--precision", argument: "N" },
  {
    command: ["--show-trailing-zeros", "--keep-trailing-zeros"],
    argument: "",
  },
  {
    command: ["--no-trailing-zeros", "--trim-trailing-zeros"],
    argument: "",
  },
  { command: "--tree", argument: "" },
  { command: "--details", argument: "" },
  { command: "--json", argument: "" },
  { command: "--max-label-clusters", argument: "N" },
  { command: "--no-truncate", argument: "" },
  { command: "--merge-frontmatter", argument: "" },
  { command: "--frontmatter-weight", argument: "N" },
  { command: "--", argument: "" },
] as const satisfies readonly CliOptionHeader[];

export const CLI_GLOBAL_OPTIONS = [
  { command: ["--silent", "-s"], argument: "" },
  { command: "--strict", argument: "" },
  { command: "--no-color", argument: "" },
  { command: "--no-pager", argument: "" },
] as const satisfies readonly CliOptionHeader[];

export type OutputMode = "default" | "tree" | "details" | "json";

export interface ParsedArguments {
  help: boolean;
  version: boolean;
  dependencies: boolean;
  path?: string;
  mode: OutputMode;
  format: ProgressFormat;
  formatExplicit: boolean;
  precision?: number;
  showTrailingZeros?: boolean;
  maxLabelClusters?: number;
  noTruncate: boolean;
  mergeFrontmatter: boolean;
  frontmatterWeight?: number;
  silent: boolean;
  strict: boolean;
  noColor: boolean;
  noPager: boolean;
}

export class ArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgumentError";
  }
}

function parsePositiveInteger(value: string): number {
  if (!/^\d+$/u.test(value)) {
    throw new ArgumentError(
      `--max-label-clusters must be a positive integer; received: ${value}`,
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ArgumentError(
      `--max-label-clusters must be a positive safe integer; received: ${value}`,
    );
  }
  return parsed;
}

function parseFrontmatterWeight(value: string): number {
  const invalid = () => {
    throw new ArgumentError(
      `--frontmatter-weight must be a decimal strictly between 0 and 1; received: ${value}`,
    );
  };
  if (!/^-?\d+(?:\.\d+)?$/u.test(value)) invalid();
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 1) invalid();
  return parsed;
}

function isNumericFrontmatterWeightValue(value: string): boolean {
  return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(value);
}

function requireFrontmatterWeightValue(value: string | undefined): string {
  if (
    value === undefined ||
    value.length === 0 ||
    (value.startsWith("-") && !isNumericFrontmatterWeightValue(value))
  ) {
    throw new ArgumentError("--frontmatter-weight requires a value.");
  }
  return value;
}

function parsePrecision(value: string): number {
  if (!/^\d+$/u.test(value)) {
    throw new ArgumentError(
      `--precision must be a non-negative integer; received: ${value}`,
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 100) {
    throw new ArgumentError(
      `--precision must be an integer from 0 through 100; received: ${value}`,
    );
  }
  return parsed;
}

function validatePrecisionForFormat(
  precision: number,
  format: ProgressFormat,
): void {
  const minimum = format === "decimal" ? 1 : 0;
  if (precision < minimum) {
    throw new ArgumentError(
      `--precision must be at least ${minimum} for ${format} format; received: ${precision}`,
    );
  }
}

function parseProgressFormat(value: string): ProgressFormat {
  if (value === "decimal" || value === "percentage") {
    return value;
  }
  throw new ArgumentError(
    `--format must be decimal or percentage; received: ${value}`,
  );
}

function chooseProgressFormat(
  current: ProgressFormat | undefined,
  next: ProgressFormat,
): ProgressFormat {
  if (current !== undefined && current !== next) {
    throw new ArgumentError(
      "--format, --decimal, and --percentage are mutually exclusive.",
    );
  }
  return next;
}

const STANDALONE_GLOBAL_OPTIONS = new Set(
  CLI_GLOBAL_OPTIONS.flatMap(({ command }) =>
    Array.isArray(command) ? [...command] : [command]
  ),
);

function requireStandaloneCommand(
  argv: readonly string[],
  command: string,
): void {
  const commandArguments = argv.filter((argument) =>
    !STANDALONE_GLOBAL_OPTIONS.has(argument)
  );
  if (commandArguments.length !== 1) {
    throw new ArgumentError(
      `${command} is a standalone command and cannot be combined with a Markdown path or analysis options.`,
    );
  }
}

function matchesCommandHeader(
  argument: string,
  command: CliCommandHeader,
): boolean {
  return Array.isArray(command)
    ? command.includes(argument)
    : command === argument;
}

export function parseArguments(argv: readonly string[]): ParsedArguments {
  let path: string | undefined;
  let mode: OutputMode = "default";
  let requestedFormat: ProgressFormat | undefined = undefined;
  let formatExplicit = false;
  let precision: number | undefined;
  let showTrailingZeros: boolean | undefined = undefined;
  let maxLabelClusters: number | undefined;
  let help = false;
  let version = false;
  let dependencies = false;
  let noTruncate = false;
  let mergeFrontmatter = false;
  let frontmatterWeight: number | undefined;
  let silent = false;
  let strict = false;
  let noColor = false;
  let noPager = false;
  let positionalOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;

    if (positionalOnly) {
      if (path !== undefined) {
        throw new ArgumentError("Only one Markdown file path may be provided.");
      }
      path = argument;
      continue;
    }
    if (argument === "--") {
      positionalOnly = true;
      continue;
    }
    if (matchesCommandHeader(argument, CLI_COMMANDS[0])) {
      requireStandaloneCommand(argv, "--help");
      help = true;
      continue;
    }
    if (matchesCommandHeader(argument, CLI_COMMANDS[1])) {
      requireStandaloneCommand(argv, "--version");
      version = true;
      continue;
    }
    if (matchesCommandHeader(argument, CLI_COMMANDS[2])) {
      requireStandaloneCommand(argv, "--dependencies");
      dependencies = true;
      continue;
    }
    if (
      argument === "--tree" ||
      argument === "--details" ||
      argument === "--json"
    ) {
      const nextMode = argument.slice(2) as Exclude<OutputMode, "default">;
      if (mode !== "default" && mode !== nextMode) {
        throw new ArgumentError(
          "--tree, --details, and --json are mutually exclusive.",
        );
      }
      mode = nextMode;
      continue;
    }
    if (argument === "--decimal" || argument === "--percentage") {
      const nextFormat = argument.slice(2) as ProgressFormat;
      requestedFormat = chooseProgressFormat(requestedFormat, nextFormat);
      formatExplicit = true;
      continue;
    }
    if (argument === "--format") {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new ArgumentError("--format requires decimal or percentage.");
      }
      const nextFormat = parseProgressFormat(value);
      requestedFormat = chooseProgressFormat(requestedFormat, nextFormat);
      formatExplicit = true;
      index += 1;
      continue;
    }
    if (argument.startsWith("--format=")) {
      const value = argument.slice("--format=".length);
      if (value.length === 0) {
        throw new ArgumentError("--format requires decimal or percentage.");
      }
      const nextFormat = parseProgressFormat(value);
      requestedFormat = chooseProgressFormat(requestedFormat, nextFormat);
      formatExplicit = true;
      continue;
    }
    if (argument === "--precision") {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new ArgumentError("--precision requires a value.");
      }
      precision = parsePrecision(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--precision=")) {
      const value = argument.slice("--precision=".length);
      if (value.length === 0) {
        throw new ArgumentError("--precision requires a value.");
      }
      precision = parsePrecision(value);
      continue;
    }
    if (argument === "--show-trailing-zeros" || argument === "--keep-trailing-zeros") {
      if (showTrailingZeros === false) {
        throw new ArgumentError(
          "--show-trailing-zeros and --no-trailing-zeros are mutually exclusive.",
        );
      }
      showTrailingZeros = true;
      continue;
    }
    if (argument === "--no-trailing-zeros" || argument === "--trim-trailing-zeros") {
      if (showTrailingZeros === true) {
        throw new ArgumentError(
          "--show-trailing-zeros and --no-trailing-zeros are mutually exclusive.",
        );
      }
      showTrailingZeros = false;
      continue;
    }
    if (argument === "--no-truncate") {
      noTruncate = true;
      continue;
    }
    if (argument === "--silent" || argument === "-s") {
      silent = true;
      continue;
    }
    if (argument === "--merge-frontmatter") {
      mergeFrontmatter = true;
      continue;
    }
    if (argument === "--strict") {
      strict = true;
      continue;
    }
    if (argument === "--no-color") {
      noColor = true;
      continue;
    }
    if (argument === "--no-pager") {
      noPager = true;
      continue;
    }
    if (argument === "--frontmatter-weight") {
      const value = requireFrontmatterWeightValue(argv[index + 1]);
      frontmatterWeight = parseFrontmatterWeight(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--frontmatter-weight=")) {
      const value = requireFrontmatterWeightValue(
        argument.slice("--frontmatter-weight=".length),
      );
      frontmatterWeight = parseFrontmatterWeight(value);
      continue;
    }
    if (argument === "--max-label-clusters") {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new ArgumentError("--max-label-clusters requires a value.");
      }
      maxLabelClusters = parsePositiveInteger(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--max-label-clusters=")) {
      const value = argument.slice("--max-label-clusters=".length);
      if (value.length === 0) {
        throw new ArgumentError("--max-label-clusters requires a value.");
      }
      maxLabelClusters = parsePositiveInteger(value);
      continue;
    }
    if (argument.startsWith("-")) {
      throw new ArgumentError(`Unknown option: ${argument}`);
    }
    if (path !== undefined) {
      throw new ArgumentError("Only one Markdown file path may be provided.");
    }
    path = argument;
  }

  if (noTruncate && maxLabelClusters !== undefined) {
    throw new ArgumentError(
      "--no-truncate and --max-label-clusters are mutually exclusive.",
    );
  }

  const format = requestedFormat ?? "percentage";
  if (precision !== undefined) {
    validatePrecisionForFormat(precision, format);
  }

  return {
    help,
    version,
    dependencies,
    path,
    mode,
    format,
    formatExplicit,
    precision,
    showTrailingZeros,
    maxLabelClusters,
    noTruncate,
    mergeFrontmatter,
    frontmatterWeight,
    silent,
    strict,
    noColor,
    noPager,
  };
}
