import type {
  JsonOutputPort,
  MarkdownAstParser,
  MarkdownFileReader,
  MarkdownLexer,
  FrontmatterValueParser,
  TerminalOutputPort,
  WarningPort,
} from "../core/index.ts";

export interface CliIO {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
}

export interface CliDependencies {
  lexer: MarkdownLexer;
  parser: MarkdownAstParser;
  yamlValueParser: FrontmatterValueParser;
  tomlValueParser: FrontmatterValueParser;
  fileReader: MarkdownFileReader;
  terminalRenderer: TerminalOutputPort;
  jsonRenderer: JsonOutputPort;
  warning: WarningPort;
  version: string;
}
