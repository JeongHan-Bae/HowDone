import type { ProgressFormat } from "../../core/config/types.ts";

export type OutputMode = "default" | "tree" | "details" | "json";

export interface ParsedArguments {
  help: boolean;
  version: boolean;
  path?: string;
  mode: OutputMode;
  format: ProgressFormat;
  precision?: number;
  showTrailingZeros?: boolean;
  maxLabelClusters?: number;
  noTruncate: boolean;
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

export function parseArguments(argv: readonly string[]): ParsedArguments {
  let path: string | undefined;
  let mode: OutputMode = "default";
  let format: ProgressFormat = "percentage";
  let requestedFormat: ProgressFormat | undefined;
  let precision: number | undefined;
  let showTrailingZeros: boolean | undefined;
  let maxLabelClusters: number | undefined;
  let help = false;
  let version = false;
  let noTruncate = false;
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
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--version" || argument === "-v") {
      version = true;
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
      format = chooseProgressFormat(requestedFormat, nextFormat);
      requestedFormat = format;
      continue;
    }
    if (argument === "--format") {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new ArgumentError("--format requires decimal or percentage.");
      }
      const nextFormat = parseProgressFormat(value);
      format = chooseProgressFormat(requestedFormat, nextFormat);
      requestedFormat = format;
      index += 1;
      continue;
    }
    if (argument.startsWith("--format=")) {
      const value = argument.slice("--format=".length);
      if (value.length === 0) {
        throw new ArgumentError("--format requires decimal or percentage.");
      }
      const nextFormat = parseProgressFormat(value);
      format = chooseProgressFormat(requestedFormat, nextFormat);
      requestedFormat = format;
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

  if (precision !== undefined) {
    validatePrecisionForFormat(precision, format);
  }

  return {
    help,
    version,
    path,
    mode,
    format,
    precision,
    showTrailingZeros,
    maxLabelClusters,
    noTruncate,
  };
}
