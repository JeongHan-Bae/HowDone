import { parse as parseYaml } from "yaml";
import type { FrontmatterAst, FrontmatterValueParser } from "../../core/index.ts";

export class YamlValueParser implements FrontmatterValueParser {
  parse(frontmatter: FrontmatterAst): unknown {
    try {
      return parseYaml(frontmatter.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid yaml frontmatter: ${message}`);
    }
  }
}

export const defaultYamlValueParser = new YamlValueParser();
