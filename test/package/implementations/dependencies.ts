import type { CliDependencies } from "howdone/application";
import {
  consumerCaseForCode,
  readerOutputForCode,
  type ConsumerExpectedResult,
} from "./data.ts";
import { consumerLexer, consumerParser } from "./markdown.ts";
import {
  ConsumerTomlValueParser,
  ConsumerYamlValueParser,
} from "./frontmatter.ts";
import { ConsumerFileReader } from "./filesystem.ts";
import {
  ConsumerGraphemeSegmenter,
  ConsumerWarningPort,
} from "./runtime.ts";
import { ConsumerJsonRenderer, ConsumerTerminalRenderer } from "./output.ts";

export interface ConsumerContext {
  code: string;
  path: string;
  source: string;
  expected: ConsumerExpectedResult;
  dependencies: CliDependencies;
  reader: ConsumerFileReader;
  warning: ConsumerWarningPort;
  terminal: ConsumerTerminalRenderer;
  json: ConsumerJsonRenderer;
}

export function createConsumerContext(code: string): ConsumerContext {
  const input = consumerCaseForCode(code);
  const reader = new ConsumerFileReader(code);
  const warning = new ConsumerWarningPort();
  const segmenter = new ConsumerGraphemeSegmenter();
  const terminal = new ConsumerTerminalRenderer(segmenter);
  const json = new ConsumerJsonRenderer();
  return {
    code,
    path: input.path,
    source: readerOutputForCode(code).source,
    expected: input.expected,
    reader,
    warning,
    terminal,
    json,
    dependencies: {
      lexer: consumerLexer,
      parser: consumerParser,
      yamlValueParser: new ConsumerYamlValueParser(),
      tomlValueParser: new ConsumerTomlValueParser(),
      fileReader: reader,
      terminalRenderer: terminal,
      jsonRenderer: json,
      warning,
      version: `consumer-${code}`,
      runtimeDependencies: [
        { name: "consumer-runtime", version: "1.0.0" },
      ],
    },
  };
}
