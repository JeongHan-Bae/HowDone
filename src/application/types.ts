import type {
  JsonOutputPort,
  MarkdownAstParser,
  MarkdownFileReader,
  MarkdownLexer,
  TerminalOutputPort,
} from "../core/ports.ts";

export interface CliIO {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
}

export interface CliDependencies {
  lexer: MarkdownLexer;
  parser: MarkdownAstParser;
  fileReader: MarkdownFileReader;
  terminalRenderer: TerminalOutputPort;
  jsonRenderer: JsonOutputPort;
}
