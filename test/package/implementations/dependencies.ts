import type { InfoDocument, InfoDocumentPort } from "howdone";
import type { CliDependencies } from "howdone/application";
import { TypedAstParser } from "howdone/std";
import {
  consumerCaseForCode,
  consumerOutputCapabilityCaseForCode,
  readerOutputForCode,
  type ConsumerExpectedResult,
  type ConsumerOutputCapabilityCase,
} from "./data.ts";
import { consumerLexer, consumerParser } from "./markdown.ts";
import {
  ConsumerTomlValueParser,
  ConsumerYamlValueParser,
} from "./frontmatter.ts";
import { ConsumerFileReader } from "./filesystem.ts";
import { ConsumerGraphemeSegmenter } from "./runtime.ts";
import { ConsumerJsonRenderer, ConsumerTerminalRenderer } from "./output.ts";

export interface ConsumerContext {
  code: string;
  path: string;
  source: string;
  parserMode: ConsumerParserMode;
  expected: ConsumerExpectedResult;
  dependencies: CliDependencies;
  reader: ConsumerFileReader;
  terminal: ConsumerTerminalRenderer;
  json: ConsumerJsonRenderer;
  capability?: ConsumerOutputCapabilityCase;
}

export type ConsumerParserMode = "custom" | "standard";

export function createConsumerContext(
  code: string,
  capabilityCode?: string,
  diagnostics = false,
  parserMode: ConsumerParserMode = "custom",
): ConsumerContext {
  const input = consumerCaseForCode(code);
  const reader = new ConsumerFileReader(code);
  const segmenter = new ConsumerGraphemeSegmenter();
  const capability = capabilityCode === undefined
    ? undefined
    : consumerOutputCapabilityCaseForCode(capabilityCode);
  const terminal = new ConsumerTerminalRenderer(segmenter, capability, diagnostics);
  const json = new ConsumerJsonRenderer(capability);
  return {
    code,
    path: input.path,
    source: readerOutputForCode(code).source,
    parserMode,
    expected: input.expected,
    reader,
    terminal,
    json,
    capability,
    dependencies: {
      lexer: consumerLexer,
      parser: parserMode === "standard"
        ? new TypedAstParser()
        : consumerParser,
      yamlValueParser: new ConsumerYamlValueParser(),
      tomlValueParser: new ConsumerTomlValueParser(),
      fileReader: reader,
      terminalRenderer: terminal,
      jsonRenderer: json,
      infoPort: {
        execute: (command): InfoDocument => ({ kind: command }),
      } satisfies InfoDocumentPort,
    },
  };
}
