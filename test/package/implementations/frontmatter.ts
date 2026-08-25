import type { FrontmatterAst, FrontmatterValueParser } from "howdone";
import { tomlValueOutput, yamlValueOutput } from "./data.ts";

export class ConsumerYamlValueParser implements FrontmatterValueParser {
  parse(frontmatter: FrontmatterAst): unknown {
    if (frontmatter.format !== "yaml") {
      throw new Error("consumer YAML parser received TOML");
    }
    return yamlValueOutput(frontmatter.value);
  }
}

export class ConsumerTomlValueParser implements FrontmatterValueParser {
  parse(frontmatter: FrontmatterAst): unknown {
    if (frontmatter.format !== "toml") {
      throw new Error("consumer TOML parser received YAML");
    }
    return tomlValueOutput(frontmatter.value);
  }
}
