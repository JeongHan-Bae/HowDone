import type { DocumentAst } from "./ast/types.ts";
import type { FrontmatterAst } from "./ast/types.ts";
import type { ResolvedDisplayOptions } from "./config/types.ts";
import type { ProgressReport } from "./progress/types.ts";
import type { LexerToken } from "./source/types.ts";

/**
 * @brief Converts source text into the core's published lexer-token stream.
 *
 * @details
 * The implementation owns source-syntax recognition and may use any parsing
 * library or handwritten lexer. The core consumes only the returned
 * `LexerToken[]` contract.
 */
export interface MarkdownLexer {
  /**
   * @brief Lexes one Markdown source document.
   *
   * @param source The complete Markdown source text.
   * @returns The ordered tokens recognized from the source.
   */
  lex(source: string): LexerToken[];
}

/**
 * @brief Converts lexer tokens into the core's normalized document AST.
 *
 * @details
 * The implementation maps the token stream to `DocumentAst`, preserving the
 * separate frontmatter and Markdown-body channels required by the core.
 */
export interface MarkdownAstParser {
  /**
   * @brief Parses a complete lexer-token stream.
   *
   * @param tokens The ordered tokens produced by a `MarkdownLexer`.
   * @returns The normalized document AST.
   */
  parse(tokens: readonly LexerToken[]): DocumentAst;
}

/**
 * @brief Decodes one frontmatter section into a format-specific value.
 *
 * @details
 * The implementation owns YAML or TOML syntax decoding. Semantic checklist
 * recognition is performed later by the framework-independent core.
 */
export interface FrontmatterValueParser {
  /**
   * @brief Decodes the raw value of one frontmatter section.
   *
   * @param frontmatter The frontmatter AST value to decode.
   * @returns The decoded format-specific value.
   */
  parse(frontmatter: FrontmatterAst): unknown;
}

/**
 * @brief Reads Markdown source text from a caller-selected filesystem.
 *
 * @details
 * The implementation owns path resolution, extension policy, and filesystem
 * access. Core receives only the source text and does not depend on a
 * filesystem API.
 */
export interface MarkdownFileReader {
  /**
   * @brief Reads one Markdown file.
   *
   * @param filePath The path supplied by the application or caller.
   * @returns A promise for the file's complete source text.
   */
  read(filePath: string): Promise<string>;
}

/**
 * @brief Describes one runtime dependency for an information document.
 */
export interface RuntimeDependency {
  /** @brief Published package name. */
  name: string;

  /** @brief Published package version or version range. */
  version: string;
}

/**
 * @brief Splits text into Unicode grapheme clusters.
 *
 * @details
 * A grapheme cluster is one user-perceived character. Terminal adapters use
 * this boundary when applying label limits without cutting a composed symbol.
 */
export interface GraphemeSegmenter {
  /**
   * @brief Segments text at Unicode grapheme boundaries.
   *
   * @param text The text to segment.
   * @returns Grapheme clusters in their original order.
   */
  segment(text: string): string[];
}

/**
 * @brief A destination that accepts plain text output.
 *
 * @details
 * This is the platform-neutral sink used by a streamable output value. A
 * Node.js `process.stdout`, a file-like sink, and a test capture sink can all
 * satisfy this interface without the core depending on Node.js stream types.
 */
export interface TextWritable {
  /**
   * @brief Writes one plain text chunk to the destination.
   *
   * @param chunk The plain text chunk to write.
   */
  write(chunk: string): void;
}

/**
 * @brief The standard output and error sinks used by an application.
 *
 * @details
 * Core uses this interface only for ordinary fallback delivery. A terminal
 * output implementation may own richer target streams, but the application
 * always has a plain `stdout` and `stderr` destination available.
 */
export interface TerminalIO {
  readonly stdout: TextWritable;
  readonly stderr: TextWritable;
}

/**
 * @brief Marker contract for an application-owned information document.
 *
 * @details
 * `InfoDocument` is the information-document category alongside a progress
 * report and diagnostic documents. Core does not define its fields or wording.
 * An application such as the CLI extends this empty contract with its own
 * shape before passing that value to `TerminalOutputPort`.
 */
export interface InfoDocument {}

/**
 * @brief Names the standalone information commands understood by Core.
 *
 * @details
 * The command names describe application behavior, not the shape or wording
 * of an information document. The consuming adapter decides how each command
 * is represented while Core selects the command from parsed arguments.
 */
export type InfoCommand = "help" | "version" | "dependencies";

/**
 * @brief Executes a standalone information command and returns its document.
 *
 * @details
 * Core owns the dispatch behavior for the `--help`, `--version`, and
 * `--dependencies` commands. It calls this Port instead of importing a CLI
 * document implementation, then forwards the returned opaque document to
 * `TerminalOutputPort.renderDocument`.
 *
 * The Port implementation owns the `InfoDocument` shape, wording, and any
 * external data needed to construct it. A CLI can therefore define its Help
 * document while another application can provide a different document for the
 * same command.
 */
export interface InfoDocumentPort<
  TDocument extends InfoDocument = InfoDocument,
> {
  /**
   * @brief Executes one standalone information command.
   *
   * @param command The information command selected by Core.
   * @returns The application-owned document for the selected command.
   */
  execute(command: InfoCommand): TDocument;
}

/**
 * @brief A value that can write its plain-text representation to a sink.
 *
 * @details
 * A streamable value keeps its output representation separate from the
 * destination. The plain-text form contains no terminal control sequences, so
 * it can be written to stdout, a file-like sink, or a test capture sink.
 */
export interface Streamable {
  /**
   * @brief Writes the plain-text representation to a destination.
   *
   * @param destination The text sink that receives the output.
   */
  writeTo(destination: TextWritable): void;
}

/**
 * @brief Semantic meanings that terminal output may preserve.
 *
 * @details
 * A semantic meaning is independent from its color. For example, `partial`
 * and `warning` may both be shown in yellow, while remaining different
 * meanings in the output object.
 */
export const TerminalTextSemantic = {
  accent: "accent",
  code: "code",
  muted: "muted",
  complete: "complete",
  partial: "partial",
  zero: "zero",
  success: "success",
  warning: "warning",
  error: "error",
  deprecated: "deprecated",
  silent: "silent",
} as const;

/**
 * @brief The TypeScript union of semantic terminal text values.
 *
 * @details
 * Implementations may map these semantic values to any presentation supported
 * by their target terminal. The core does not prescribe a color palette.
 */
export type TerminalTextSemantic =
  (typeof TerminalTextSemantic)[keyof typeof TerminalTextSemantic];

/**
 * @brief A non-fatal warning document supplied to a terminal renderer.
 *
 * @details
 * The document carries message data only. The terminal renderer knows that
 * this document has warning meaning and chooses its prefix, semantic output,
 * color, and style.
 */
export interface WarningDocument {
  readonly message: string;
}

/**
 * @brief A failed-command error document supplied to a terminal renderer.
 *
 * @details
 * The document carries message data only. The terminal renderer knows that
 * this document has error meaning and chooses its prefix, semantic output,
 * color, and style.
 */
export interface ErrorDocument {
  readonly message: string;
}

/**
 * @brief One semantic text part in a terminal output line.
 *
 * @details
 * The optional semantic value is interpreted by the terminal output
 * implementation. It does not prescribe a color or a terminal escape
 * sequence.
 */
export interface TerminalOutputPart {
  readonly text: string;
  readonly semantic?: TerminalTextSemantic;
}

/**
 * @brief One visual line in a terminal output document.
 *
 * @details
 * The parts preserve presentation semantics for an output implementation;
 * their plain text is concatenated in source order for ordinary output. A
 * renderer may mark an intentional tree separator with `emptyLineMarker`; an
 * unmarked empty line remains an ordinary empty line.
 */
export interface TerminalOutputLine {
  readonly parts: readonly TerminalOutputPart[];
  readonly emptyLineMarker?: boolean;
}

/**
 * @brief A semantic document for human-readable terminal output.
 *
 * @details
 * Reports, help, warnings, and errors can all use this document shape. Core
 * supplies semantic parts but does not prescribe their plain string, color,
 * style, or target-stream representation.
 */
export interface TerminalTextDocument {
  readonly lines: readonly TerminalOutputLine[];
}

/**
 * @brief A semantic terminal output document.
 *
 * @details
 * Lines and parts remain available to a terminal-aware implementation for
 * color, visual-width calculation, resize handling, and paging. The core
 * does not define the string emitted by `writeTo`; a Port implementation owns
 * the document's plain and styled representations.
 */
export interface TerminalOutput extends Streamable, TerminalTextDocument {}

/**
 * @brief A requested policy for one optional terminal feature.
 *
 * @details
 * `auto` delegates the decision to a feature-capable Port implementation and
 * `never` disables the feature. Core has no force mode: a Pager requires an
 * interactive target, and forcing terminal styling into a file or pipeline
 * would change the ordinary output contract.
 */
export type TerminalFeatureMode = "auto" | "never";

/**
 * @brief Requested modes for optional terminal color and pager delivery.
 *
 * @details
 * These values are forwarded by the core. TTY and capability decisions remain
 * the responsibility of the implementation that receives them.
 */
export interface TerminalOutputOptions {
  /** @brief Requested color policy for the target terminal stream. */
  color?: TerminalFeatureMode;

  /** @brief Requested Pager policy for the target terminal stream. */
  pager?: TerminalFeatureMode;

  /** @brief Output stream selected for this delivery. */
  target?: TerminalOutputTarget;
}

/**
 * @brief The standard stream selected for terminal output.
 */
export type TerminalOutputTarget = "stdout" | "stderr";

/**
 * @brief A JSON object returned by a JSON output Port.
 *
 * @details
 * This type describes data, not a stream or a terminal representation. JSON
 * output implementations return the object itself, including its arrays,
 * primitive values, and nested objects. A delivery implementation can inspect
 * that same structure to recognize JSON punctuation, keys, strings, numbers,
 * and keywords without parsing a rendered string.
 */
export type JsonObject = Readonly<Record<string, unknown>>;

/**
 * @brief Requested optional features for JSON delivery.
 *
 * @details
 * JSON delivery supports color and Pager independently. The implementation
 * decides whether either feature is appropriate for its own target because
 * the document may also be consumed by `jq`, `cat`, or another pipeline.
 */
export interface JsonOutputOptions {
  /** @brief Requested color policy for JSON delivery. */
  color?: TerminalFeatureMode;

  /** @brief Requested Pager policy for JSON delivery. */
  pager?: TerminalFeatureMode;
}

/**
 * @brief Renders terminal output documents and optionally prints the result.
 *
 * @details
 * The Core application supplies one progress report or one `InfoDocument`,
 * warning document, or error document. Every render method converts its input
 * to the same `TerminalOutput` type.
 *
 * The Core application does not inspect TTY state or choose colors. If
 * `print` is absent, it writes the rendered output to `TerminalIO.stdout` for
 * reports and information documents, or `TerminalIO.stderr` for warnings and errors. If `print`
 * is present, the application delegates the same output value and requested
 * modes to it.
 */
export interface TerminalOutputPort<
  TOutput extends TerminalOutput = TerminalOutput,
  TDocument extends InfoDocument = InfoDocument,
> {
  /**
   * @brief Converts a progress report into terminal output.
   *
   * @details
   * The core supplies the report and display options but does not perform this
   * conversion. The Port implementation decides how to construct and enrich
   * the returned streamable output value.
   *
   * @param mode The requested human-readable output mode.
   * @param report The progress report to present.
   * @param options The resolved display options.
   * @returns The implementation's streamable terminal output value.
   */
  render(
    mode: "default" | "tree" | "details",
    report: ProgressReport,
    options: ResolvedDisplayOptions,
  ): TOutput;

  /**
   * @brief Converts an information document into terminal output.
   *
   * @details
   * The document type is supplied by the application that owns the
   * `InfoDocument` contract; Core does not define that application-specific
   * shape.
   *
   * @param document The application-owned output document.
   * @param options Optional terminal feature modes and target stream.
   * @returns The rendered terminal output value.
   */
  renderDocument(
    document: TDocument,
    options?: TerminalOutputOptions,
  ): TOutput;

  /**
   * @brief Converts a warning document into terminal output.
   *
   * @param document The warning document.
   * @returns The rendered terminal output value.
   */
  renderWarning(document: WarningDocument): TOutput;

  /**
   * @brief Converts an error document into terminal output.
   *
   * @param document The error document.
   * @returns The rendered terminal output value.
   */
  renderError(document: ErrorDocument): TOutput;

  /**
   * @brief Optionally prints a previously rendered terminal output value.
   *
   * @details
   * A provider may declare this member only when it owns the target stream and
   * can decide TTY-aware color and Pager behavior. The application never sends
   * a raw string through this member; it sends the exact `TerminalOutput`
   * returned by one of the render methods.
   *
   * @param content The exact output value returned by a render method.
   * @param options Requested terminal feature modes and target stream.
   * @returns A promise when terminal delivery is asynchronous; otherwise
   *          `void`.
   */
  print?(
    content: TOutput,
    options?: TerminalOutputOptions,
  ): void | Promise<void>;
}

/**
 * @brief The output Port for machine-readable JSON documents.
 *
 * @details
 * The core forwards the report and returns the implementation's JSON object.
 * An optional delivery member may color or page that same object when the
 * implementation can judge its own target TTY. It must leave non-TTY output
 * as ordinary JSON suitable for pipes and files.
 */
export interface JsonOutputPort {
  /**
   * @brief Converts a progress report into a JSON output value.
   *
   * @param report The progress report to serialize.
   * @param options Optional display options for JSON label truncation.
   * @returns The implementation's JSON object.
   */
  render(report: ProgressReport, options?: ResolvedDisplayOptions): JsonObject;

  /**
   * @brief Optionally delivers JSON with implementation-owned terminal features.
   *
   * @details
   * Core behavior:
   *
   * The core may forward the exact object returned by `render` and the
   * requested JSON color and pager modes. It does not inspect TTY state or
   * parse JSON text to recover syntax semantics.
   *
   * Provider declaration:
   *
   * A JSON output implementation may provide this member only when it can
   * judge the TTY state of its own target stream. It decides what `auto` means
   * and may support color, Pager, both, or ordinary output according to that
   * target.
   *
   * When this member is not provided:
   *
   * The core serializes the object returned by `render` with
   * `JSON.stringify` and writes the JSON document normally without terminal
   * enhancement.
   *
   * @param content The exact JSON object returned by `render`.
   * @param options The requested JSON delivery mode.
   * @returns A promise when delivery is asynchronous; otherwise `void`.
   */
  writeWithTerminalFeatures?(
    content: JsonObject,
    options?: JsonOutputOptions,
  ): void | Promise<void>;
}
