import type {
  JsonOutputPort,
  MarkdownAstParser,
  MarkdownFileReader,
  MarkdownLexer,
  FrontmatterValueParser,
  InfoDocument,
  InfoDocumentPort,
  TerminalIO,
  TerminalOutput,
  TerminalOutputPort,
} from "howdone";

/**
 * @brief The application text destinations.
 *
 * @details
 * The application passes these sinks to its collaborators. Terminal
 * capability and TTY decisions belong to the selected output implementation,
 * not to this application contract.
 */
export interface CliIO extends TerminalIO {}

/**
 * @brief Injected collaborators required by the CLI application.
 *
 * @details
 * The application composes framework-independent ports and forwards terminal
 * feature requests and output/warning/error documents to the terminal
 * output port. It does not inspect TTY state or choose colors or Pager
 * behavior.
 */
export interface CliDependencies<
  TOutput extends TerminalOutput = TerminalOutput,
  TDocument extends InfoDocument = InfoDocument,
> {
  lexer: MarkdownLexer;
  parser: MarkdownAstParser;
  yamlValueParser: FrontmatterValueParser;
  tomlValueParser: FrontmatterValueParser;
  fileReader: MarkdownFileReader;
  terminalRenderer: TerminalOutputPort<TOutput, TDocument>;
  jsonRenderer: JsonOutputPort;
  infoPort: InfoDocumentPort<TDocument>;
}
