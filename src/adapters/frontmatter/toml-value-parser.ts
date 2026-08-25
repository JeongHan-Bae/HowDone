import { parse as parseToml } from "smol-toml";
import type { FrontmatterAst, FrontmatterValueParser } from "howdone";

function tomlValueKind(value: unknown): string {
  if (Array.isArray(value)) {
    return "array";
  }
  if (value === null) {
    return "null";
  }
  return typeof value === "object" ? "object" : typeof value;
}

function validateTomlArrays(value: unknown): void {
  if (Array.isArray(value)) {
    const firstKind = value[0] === undefined ? undefined : tomlValueKind(value[0]);
    if (firstKind !== undefined && value.some((item) => tomlValueKind(item) !== firstKind)) {
      throw new Error("TOML arrays must contain values of a single type");
    }
    for (const item of value) {
      validateTomlArrays(item);
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      validateTomlArrays(child);
    }
  }
}

export class TomlValueParser implements FrontmatterValueParser {
  parse(frontmatter: FrontmatterAst): unknown {
    try {
      const value = parseToml(frontmatter.value);
      validateTomlArrays(value);
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid toml frontmatter: ${message}`);
    }
  }
}

export const defaultTomlValueParser = new TomlValueParser();
