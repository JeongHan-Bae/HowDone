# Public API

This document is included in the published `howdone` core package. HowDone is
published in two parts: `howdone` is the framework-independent hexagonal core,
and `howdone-cli` is the primary product and command executor. Its command-line
names are `howdone` and `howdone-cli`. The package exposes separate entries for
Core contracts, standard implementations, and application composition. The
composition example below is the primary way to use the Core package.

## Use the Core: the hexagonal composition root

The primary use of the `howdone` package is to compose the application from
ports. The Core owns the document model, checklist semantics, progress
calculation, argument policy, and output routing. The composition root owns
the source, filesystem, terminal, JSON, and information-document adapters.

For the ready-made command, use the CLI package:

```sh
npx howdone-cli tasks.md
```

For a programmatic composition, the application root has the same shape as the
CLI boot entry. The following is a complete composition outline. In this
example, `./adapters.js` is a module that the consuming application must write
itself; it is not a file supplied by `howdone`. Its exports are the consumer's
implementations of the required external Ports. The Core package does not
provide those external adapters.

```ts
import {run} from "howdone/application";
import type {CliDependencies, CliIO} from "howdone/application";
import {TypedAstParser} from "howdone/std";

import {
    markdownLexer,
    yamlValueParser,
    tomlValueParser,
    markdownFileReader,
    terminalRenderer,
    jsonRenderer,
    infoPort,
} from "./adapters.js"; // The consumer creates ./adapters.js and implements these exports.

const io: CliIO = {
    stdout: process.stdout,
    stderr: process.stderr,
};

const dependencies: CliDependencies = {
    lexer: markdownLexer,
    parser: new TypedAstParser(),
    yamlValueParser,
    tomlValueParser,
    fileReader: markdownFileReader,
    terminalRenderer,
    jsonRenderer,
    infoPort,
};

const exitCode = await run(process.argv.slice(2), io, dependencies);
process.exitCode = exitCode;
```

`process.argv.slice(2)` is the application argument list. A host that is not
Node supplies its own `CliIO` sinks and its own adapter implementations. The
CLI product's Node IO adapter is the standard CLI-side binding of `stdout` to
`process.stdout` and `stderr` to `process.stderr`; it is not part of
`howdone/std`.

The only standard implementation currently exposed by `howdone/std` is
`TypedAstParser`, which fills the replaceable `parser` slot. To replace it,
change one line in the composition root:

```ts
const dependencies: CliDependencies = {
    // ...the same external adapters...
    parser: myMarkdownAstParser,
};
```

All `CliDependencies` properties remain required. `std` provides a
usable implementation where one exists; it does not make a dependency
optional. The fixed Core functions for source-pipeline normalization,
frontmatter classification, progress calculation, and display-option policy
are called by the application and are not replaceable dependency slots.

The root `howdone` entry also re-exports `TypedAstParser` for compatibility;
`howdone/std` is the explicit entry for standard replaceable implementations.

### Execution flow

```text
argv + CliIO + CliDependencies
  -> MarkdownFileReader.read(path)
  -> MarkdownLexer.lex(source)
  -> MarkdownAstParser.parse(tokens)
  -> Core frontmatter classification and progress calculation
  -> ProgressReport
  -> TerminalOutputPort or JsonOutputPort
```

The Core never imports an adapter. It passes the path to the file-reader Port,
passes source text to the lexer Port, passes the resulting tokens to the
parser Port, and performs the framework-independent calculation itself. The
application then sends the report to exactly one selected output Port. Help,
version, and dependency information bypass the Markdown pipeline and go from
`InfoDocumentPort` to `TerminalOutputPort`.

## User-visible API

The public application surface is the `run` function and the documents passed
through the output Ports:

| API value                             | What a caller can observe                                                                                                                                                    |
|---------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `run(argv, io, dependencies)`         | An asynchronous `Promise<number>`: `0` for success and `1` for argument, read, parse, warning-strictness, or rendering failure.                                              |
| `ProgressReport`                      | Separate Markdown/frontmatter results or one explicitly merged result, with numeric progress and source metadata.                                                            |
| `TerminalOutput`                      | A semantic, streamable terminal document for reports, information, warnings, and errors. Its concrete text, color, style, and Pager behavior belong to the terminal adapter. |
| `JsonObject`                          | A machine-readable JSON data object. It contains data only, not terminal diagnostics or ANSI sequences.                                                                      |
| `WarningDocument` and `ErrorDocument` | Diagnostic meaning plus a message. The terminal adapter chooses the visible prefix, color, and style.                                                                        |
| `InfoDocument`                        | An empty marker extended by the application for Help, version, and dependency information. Core forwards the value without inspecting its fields.                            |

Reports and information documents target `io.stdout`. Warnings and errors
target `io.stderr`. If a terminal Port has no optional `print` member, Core
writes its rendered value to the corresponding `CliIO` sink. If a JSON Port
has no optional delivery member, Core writes ordinary JSON to `io.stdout`.
Therefore diagnostic output cannot contaminate the JSON document consumed by
`jq` or another pipeline unless the caller explicitly merges stderr into
stdout.

The public package entries are:

| Use                                      | Entry                 | Contents                                                                                                | Dependency responsibility                                                                  |
|------------------------------------------|-----------------------|---------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| Core API                                 | `howdone`             | Core data contracts, Port contracts, fixed Core policy, and the complete framework-independent Core API | Core owns the policy; external Ports are supplied by the composition root                  |
| Standard replaceable Port implementation | `howdone/std`         | `TypedAstParser`, the standard `MarkdownAstParser` implementation                                       | Use it for `parser` or replace that Port                                                   |
| Core application                         | `howdone/application` | `run`, `CliDependencies`, and `CliIO`                                                                   | The consumer supplies the application collaborators, including the Core `InfoDocumentPort` |
| Primary CLI product                      | `howdone-cli`         | The `howdone` and `howdone-cli` bins and their default adapters                                         | The CLI constructs the Node and third-party adapters                                       |

## Public interfaces

These are the external contracts a composition root may need to implement or
replace. Internal helper functions in Core subfolders are not additional
composition dependencies.

### `CliDependencies`

`CliDependencies` is the complete application composition contract. Every
property is required even when a particular invocation does not use it:

```ts
interface CliDependencies<
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
```

The `parser` property can use `new TypedAstParser()` from `howdone/std` or a
consumer-owned `MarkdownAstParser`. The other properties have no Core standard
implementation because they depend on external syntax libraries, a host
filesystem, terminal behavior, JSON delivery, or application-owned wording.
The CLI package supplies one default set of those adapters.

### `CliIO`, `TerminalIO`, and `TextWritable`

`CliIO` is the application's pair of plain fallback sinks:

```ts
interface TextWritable {
    write(chunk: string): void;
}

interface TerminalIO {
    readonly stdout: TextWritable;
    readonly stderr: TextWritable;
}

interface CliIO extends TerminalIO {
}
```

This is a required application input, not a Core `std` value. The CLI has a
standard Node binding in its own adapter layer. A library consumer can replace
it with capture sinks, file sinks, or another host's output streams.

### `InfoDocument` and `InfoDocumentPort`

Core defines no Help, version, or dependency document fields. It does define
the standalone information-command behavior and asks this Port to execute one
of the three commands. The consuming application extends the empty marker and
returns its document:

```ts
interface InfoDocument {
}

type InfoCommand = "help" | "version" | "dependencies";

interface InfoDocumentPort<
    TDocument extends InfoDocument = InfoDocument,
> {
    execute(command: InfoCommand): TDocument;
}

interface RuntimeDependency {
    name: string;
    version: string;
}
```

The Port and its documents are required application collaborators. The CLI
implements `execute` and defines the structured shape and wording; Core calls
the Port, then sends the opaque returned document to the terminal renderer.
`InfoDocumentPort` is the Core execution boundary; the CLI Help document is
not a Core or `howdone/std` implementation.

### Source and decoding Ports

`MarkdownLexer` owns source-syntax recognition and returns only the published
local token contract:

```ts
interface MarkdownLexer {
    lex(source: string): LexerToken[];
}
```

`MarkdownAstParser` converts those tokens into the local `DocumentAst`:

```ts
interface MarkdownAstParser {
    parse(tokens: readonly LexerToken[]): DocumentAst;
}
```

`TypedAstParser` from `howdone/std` is the standard implementation of this
Port. It performs token-to-AST normalization and does not choose a Markdown
syntax library. A consumer may replace it with a parser for another token
producer.

`FrontmatterValueParser` decodes one YAML or TOML section. It does not decide
whether the decoded value is a checklist; Core owns that semantic policy:

```ts
interface FrontmatterValueParser {
    parse(frontmatter: FrontmatterAst): unknown;
}
```

The application requires one instance for YAML and one for TOML. They are
separate properties because each parsed section selects its format-specific
decoder.

`MarkdownFileReader` owns host path resolution, extension policy, and file
access:

```ts
interface MarkdownFileReader {
    read(filePath: string): Promise<string>;
}
```

Core does not provide a filesystem implementation. The CLI uses Node's native
`node:path` and `node:fs` behavior; another composition may use a virtual or
remote filesystem without changing Core.

### Core source and AST values

The source and AST values are framework-independent data contracts. A custom
lexer must produce the published token shapes, and a custom parser must return
the published AST shapes. The standard `TypedAstParser` consumes these local
tokens; it does not expose a third-party parser AST.

```ts
type FrontmatterFormat = "yaml" | "toml";

interface RootAst {
    type: "root";
    children: BlockAst[];
}

interface DocumentAst {
    type: "document";
    frontmatter: FrontmatterAst[];
    body: RootAst;
}

interface ParagraphAst {
    type: "paragraph";
    text: string;
}

interface HeadingAst {
    type: "heading";
    depth: number;
    text: string;
}

interface ListItemAst {
    type: "list-item";
    checked: boolean | null;
    children: BlockAst[];
}

interface ListAst {
    type: "list";
    ordered: boolean;
    start: number | null;
    items: ListItemAst[];
}

interface BlockquoteAst {
    type: "blockquote";
    children: BlockAst[];
}

interface CodeBlockAst {
    type: "code-block";
    language: string | null;
    value: string;
}

interface TableAst {
    type: "table";
    value: string;
}

interface HtmlAst {
    type: "html";
    value: string;
}

interface ThematicBreakAst {
    type: "thematic-break";
}

interface UnsupportedAst {
    type: "unsupported";
    value: string;
}

interface FrontmatterAst {
    type: "frontmatter";
    format: FrontmatterFormat;
    value: string;
}

type BlockAst =
    | ParagraphAst
    | HeadingAst
    | ListAst
    | BlockquoteAst
    | CodeBlockAst
    | TableAst
    | HtmlAst
    | ThematicBreakAst
    | UnsupportedAst;
```

`DocumentAst.frontmatter` contains only the contiguous prefix of recognized
frontmatter sections. `DocumentAst.body` contains the remaining Markdown
blocks. List and list-item nodes preserve nesting and task state; code, table,
HTML, quote, thematic-break, and unsupported nodes remain typed so progress
semantics can ignore them by AST kind.

The lexer contract is also local and typed:

```ts
const TokenKind = {
    frontmatter: "frontmatter",
    syntaxNode: "syntax-node",
    eof: "eof",
} as const;

type TokenKind = (typeof TokenKind)[keyof typeof TokenKind];

interface SourcePosition {
    offset: number;
    line: number;
    column: number;
}

interface TokenSpan {
    start: SourcePosition;
    end: SourcePosition;
}

interface TokenBase<K extends TokenKind = TokenKind> extends TokenSpan {
    kind: K;
    lexeme: string;
}

interface ScannedParagraphNode {
    type: "paragraph";
    text: string;
}

interface ScannedHeadingNode {
    type: "heading";
    depth: number;
    text: string;
}

interface ScannedListItemNode {
    type: "list-item";
    checked: boolean | null;
    children: ScannedBlockNode[];
}

interface ScannedListNode {
    type: "list";
    ordered: boolean;
    start: number | null;
    items: ScannedListItemNode[];
}

interface ScannedBlockquoteNode {
    type: "blockquote";
    children: ScannedBlockNode[];
}

interface ScannedCodeBlockNode {
    type: "code-block";
    language: string | null;
    value: string;
}

interface ScannedTableNode {
    type: "table";
    value: string;
}

interface ScannedHtmlNode {
    type: "html";
    value: string;
}

interface ScannedThematicBreakNode {
    type: "thematic-break";
}

interface ScannedUnsupportedNode {
    type: "unsupported";
    value: string;
}

type ScannedBlockNode =
    | ScannedParagraphNode
    | ScannedHeadingNode
    | ScannedListNode
    | ScannedBlockquoteNode
    | ScannedCodeBlockNode
    | ScannedTableNode
    | ScannedHtmlNode
    | ScannedThematicBreakNode
    | ScannedUnsupportedNode;

interface ScannedFrontmatterNode {
    type: "frontmatter";
    format: FrontmatterFormat;
    value: string;
}

interface SyntaxNodeToken extends TokenBase<typeof TokenKind.syntaxNode> {
    node: ScannedBlockNode;
}

interface FrontmatterToken extends TokenBase<typeof TokenKind.frontmatter> {
    node: ScannedFrontmatterNode;
}

interface EofToken extends TokenBase<typeof TokenKind.eof> {
    kind: typeof TokenKind.eof;
}

type LexerToken = SyntaxNodeToken | FrontmatterToken | EofToken;

interface SourceDocument {
    sourceText: string;
    sourcePath?: string;
    tokens: LexerToken[];
    ast: DocumentAst;
}
```

Positions and lexemes retain source information for consumers that need
source-aware diagnostics. The Core parser sees only these contracts, so a
consumer can replace the Markdown lexer and keep the standard parser when the
token contract is preserved.

### `GraphemeSegmenter`

`GraphemeSegmenter` is a public adapter contract for Unicode label handling:

```ts
interface GraphemeSegmenter {
    segment(text: string): string[];
}
```

It is not a separate `CliDependencies` property. A terminal renderer may keep
it as an internal collaborator and may use `Intl.Segmenter`, another library,
or another implementation.

### Standard and replacement policy

| Contract or value                                                        | Standard source                                       | Required by the application | Replaceable                  |
|--------------------------------------------------------------------------|-------------------------------------------------------|-----------------------------|------------------------------|
| `MarkdownAstParser` / `parser`                                           | `new TypedAstParser()` from `howdone/std`             | Yes                         | Yes                          |
| `MarkdownLexer` / `lexer`                                                | None in Core; CLI adapter uses Unified/Remark         | Yes                         | Yes                          |
| YAML/TOML `FrontmatterValueParser` values                                | None in Core; CLI adapters use YAML/TOML libraries    | Yes, both                   | Yes                          |
| `MarkdownFileReader` / `fileReader`                                      | None in Core; CLI uses a Node adapter                 | Yes                         | Yes                          |
| `TerminalOutputPort` / `terminalRenderer`                                | None in Core; CLI uses a terminal adapter             | Yes                         | Yes                          |
| `JsonOutputPort` / `jsonRenderer`                                        | None in Core; CLI uses a JSON adapter                 | Yes                         | Yes                          |
| `InfoDocumentPort` / `infoPort`                                          | None in `howdone/std`; CLI defines the documents      | Yes                         | Yes                          |
| `CliIO` / `TerminalIO`                                                   | None in `howdone/std`; CLI binds Node process streams | Yes, as the `run` argument  | Yes                          |
| Core progress, frontmatter, configuration, and source-pipeline functions | Built into `howdone`                                  | Not a dependency property   | No through `CliDependencies` |

### Diagnostic document contract

Warnings and errors retain their meaning in the core/application boundary while
their presentation remains an adapter concern:

```ts
interface WarningDocument {
    readonly message: string;
}

interface ErrorDocument {
    readonly message: string;
}
```

The application sends these documents to `TerminalOutputPort.renderWarning` or
`TerminalOutputPort.renderError`, then sends the returned `TOutput` to
`print` with `target: "stderr"`. If `print` is absent, it writes that exact
output value to `io.stderr`. The terminal adapter chooses prefixes, semantic
parts, colors, and ANSI sequences. `JsonOutputPort` never receives these
human-readable documents. There is no separate `WarningPort`: warning and
error meanings use the same terminal output port and the same stderr routing.

### Terminal output contract

`TerminalOutputPort` keeps terminal enhancement optional. Its `render` method
returns a streamable output value rather than a `string`:

```ts
interface Streamable {
    writeTo(destination: { write(chunk: string): void }): void;
}

interface TerminalOutputPart {
    readonly text: string;
    readonly semantic?: TerminalTextSemantic;
}

const TerminalTextSemantic = {
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

type TerminalTextSemantic =
    (typeof TerminalTextSemantic)[keyof typeof TerminalTextSemantic];

interface TerminalOutputLine {
    readonly parts: readonly TerminalOutputPart[];
    readonly emptyLineMarker?: boolean;
}

interface TerminalTextDocument {
    readonly lines: readonly TerminalOutputLine[];
}

interface TerminalOutput extends Streamable, TerminalTextDocument {
}

type TerminalFeatureMode = "auto" | "never";

interface TerminalOutputOptions {
    color?: TerminalFeatureMode;
    pager?: TerminalFeatureMode;
    target?: "stdout" | "stderr";
}

interface InfoDocument {
}

interface WarningDocument {
    readonly message: string;
}

interface ErrorDocument {
    readonly message: string;
}

interface TerminalOutputPort<
    TOutput extends TerminalOutput = TerminalOutput,
    TDocument extends InfoDocument = InfoDocument,
> {
    render(
        mode: "default" | "tree" | "details",
        report: ProgressReport,
        options: ResolvedDisplayOptions,
    ): TOutput;

    renderDocument(
        document: TDocument,
        options?: TerminalOutputOptions,
    ): TOutput;

    renderWarning(document: WarningDocument): TOutput;

    renderError(document: ErrorDocument): TOutput;

    print?(
        content: TOutput,
        options?: TerminalOutputOptions,
    ): void | Promise<void>;
}
```

`TOutput` is one concrete type selected by the terminal adapter. All four
render methods return that exact type, and `print` accepts that same type; the
application cannot accidentally print a different representation. `InfoDocument`
is an empty Core marker for application-owned information such as Help, version,
and dependencies. The CLI extends it with its own structured shape;
Core does not inspect that shape.

The core forwards the requested modes to the optional `print` member and does
not inspect TTY state or perform a shared capability check. The implementation
may support neither, one, or both features, but an implementation that declares
terminal enhancement support must be TTY-aware and judge the TTY of its own
target stream. It decides what `auto` means and chooses any color mapping or
terminal library itself; the core does not define colors or ANSI escape
sequences. Core has no force mode: an interactive Pager cannot be obtained for
a file or pipe, and forced styling would change ordinary redirected output.

The application passes `--no-color` as `color: "never"` and `--no-pager` as
`pager: "never"`; otherwise it forwards `"auto"` for each feature. Reports and
information documents use `target: "stdout"`; warnings and errors use
`target: "stderr"`. `renderDocument` also receives that target so a renderer
can lay out an information document against
the target stream's own TTY width; Core does not inspect that width. If `print`
is absent, the core writes the exact value returned by the corresponding
render method to `io.stdout` or `io.stderr`. It does not attempt to add color,
TTY detection, paging, or a replacement output value.

The application can use the same terminal output type for Help, warnings,
errors, and reports. A `TerminalOutputPart` with semantic `"code"` carries only
raw text; the CLI adapter chooses its representation. These are adapter
choices, not Core string or color requirements.

The default CLI adapter uses one semantic output object for direct output,
color rendering, Pager viewport rendering, and the complete output written
after a normal `q` exit. Tree separator lines in that object use a visible
`\` marker; ordinary empty lines in details and prose remain empty.

### JSON output contract

`JsonOutputPort` returns the JSON object itself. It does not return a
`Streamable` value and it has no generic output type:

```ts
type JsonObject = Readonly<Record<string, unknown>>;

interface JsonOutputOptions {
    color?: TerminalFeatureMode;
    pager?: TerminalFeatureMode;
}

interface JsonOutputPort {
    render(
        report: ProgressReport,
        options?: ResolvedDisplayOptions,
    ): JsonObject;

    writeWithTerminalFeatures?(
        content: JsonObject,
        options?: JsonOutputOptions,
    ): void | Promise<void>;
}
```

The core forwards the exact object returned by `render` to the optional hook.
If the hook is absent, it writes `JSON.stringify(content, null, 2)` followed
by a newline to stdout. The core does not inspect TTY state. A provider may
declare the hook only when it can judge the TTY state of its own target stream;
the provider decides whether `auto` enables color or Pager there. JSON uses the
same object for both features, and its structure supplies the syntax categories
for punctuation, object keys, strings, numbers, and `true`/`false`/`null`
keywords. `--no-color` and `--no-pager` are forwarded as independent `never`
modes by the application.

Warnings and errors are written to the terminal diagnostic target, stderr, and
are never inserted into the JSON object or stdout document. This
keeps stdout a valid JSON document for `jq` and other pipes; users who
explicitly merge stderr with `2>&1` opt into mixing the streams themselves.

## Commands and options

`run` receives the command arguments without the Node executable or package
bin name. The application parses those arguments, validates conflicts and
values, and then selects one Core/application path. Value options accept both
`--option N` and `--option=N`. The next argument in a value position is
validated as that option's value. An absent or option-like invalid value is a
hard argument error; it is not reinterpreted as another option or as a path.

### Command forms

| Command form        | Core/application behavior                                                                       | Result                                  |
|---------------------|-------------------------------------------------------------------------------------------------|-----------------------------------------|
| `<markdown-path>`   | Read the path, lex and parse the source, calculate the report, and use the selected output mode | Report on stdout; diagnostics on stderr |
| `--help` or `-h`    | Execute `infoPort` with `"help"`; do not read Markdown                                          | Terminal output on stdout               |
| `--version` or `-v` | Execute `infoPort` with `"version"`; do not read Markdown                                       | Terminal output on stdout               |
| `--dependencies`    | Execute `infoPort` with `"dependencies"`; do not read Markdown                                  | Terminal output on stdout               |

The three information commands are standalone. They may be combined only with
the global options below; a Markdown path or analysis option is a hard
argument error. The Core does not define the fields or wording of these
documents. The application-owned information Port creates them and the terminal Port
renders them.

### Markdown path syntax

The `--` delimiter belongs to the Markdown-path command, not to the global
options. It ends option parsing, and the next value is used as the Markdown
path even when that value begins with `-`. Standalone information commands do
not use this delimiter.

```text
howdone -- --notes.md
howdone --json -- --notes.md
```

### Analysis options

| Option                                           | Core/application behavior                                                                                                                                                                                                                         |
|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--format decimal\|percentage`                   | Select the numeric presentation for terminal output. The default is `percentage`; `--format=N` is also accepted.                                                                                                                                  |
| `--decimal`, `--percentage`                      | Shorthand for the corresponding `--format` value. Selecting conflicting format values is a hard error.                                                                                                                                            |
| `--precision N`                                  | Select decimal places after validating `0..100` for percentage and `1..100` for decimal output. It is passed into resolved display options.                                                                                                       |
| `--show-trailing-zeros`, `--keep-trailing-zeros` | Keep zeroes through the selected precision. The two names are aliases.                                                                                                                                                                            |
| `--no-trailing-zeros`, `--trim-trailing-zeros`   | Hide trailing zeroes, which is the default. Conflicting trailing-zero requests are hard errors.                                                                                                                                                   |
| `--tree`                                         | Select the terminal tree renderer. It is mutually exclusive with `--details` and `--json`.                                                                                                                                                        |
| `--details`                                      | Select the terminal details renderer. It is mutually exclusive with `--tree` and `--json`.                                                                                                                                                        |
| `--json`                                         | Select `JsonOutputPort` and emit one JSON data object. It is mutually exclusive with `--tree` and `--details`.                                                                                                                                    |
| `--max-label-clusters N`                         | Request label truncation by Unicode grapheme clusters for the selected display. `--max-label-clusters=N` is also accepted; `N` must be a positive safe integer.                                                                                   |
| `--no-truncate`                                  | Disable label truncation. It conflicts with `--max-label-clusters`.                                                                                                                                                                               |
| `--merge-frontmatter`                            | Request one merged calculation/display when the source matches `FrontmatterSection+ MarkdownBody` or `FrontmatterSection FrontmatterSection+`; all frontmatter sections are aggregated before a body merge. |
| `--frontmatter-weight N`                         | Parse a decimal with `0 < N < 1`. If a valid merge has checklist roots on both sides, use `N` as the total frontmatter share. A valid but inapplicable weight is an ignored-option warning; an invalid or missing value is a hard argument error. |

`--json` always serializes raw numeric fields. Explicit format, precision, and
trailing-zero options therefore do not change JSON data and produce a warning;
`--strict` turns that warning into an error and `--silent` suppresses it.
`--json --no-truncate` is a silent no-op, while
`--json --max-label-clusters N` requests a truncated JSON copy without
mutating the Core report.

### Global options

These options are accepted by the Markdown command and by all three standalone
information commands:

| Option           | Core/application behavior                                                                                                          |
|------------------|------------------------------------------------------------------------------------------------------------------------------------|
| `--silent`, `-s` | Suppress warning documents. Error documents are still rendered and written to stderr.                                              |
| `--strict`       | Convert a warning condition into an error condition and return status `1`. It does not make an invalid value valid.                |
| `--no-color`     | Forward `color: "never"` to terminal and JSON delivery. Core does not choose colors or inspect TTY state.                          |
| `--no-pager`     | Forward `pager: "never"` to terminal and JSON delivery. Core does not inspect TTY state or provide a force mode. |

When `--strict` and `--silent` are both present, strict handling takes
precedence: a warning condition becomes an error instead of being suppressed.

Unknown options, missing values, invalid values, conflicting modes, and
conflicting truncation or trailing-zero options produce an error document on
stderr and a non-zero status. `--silent` does not suppress errors. A valid
ignored option produces a warning document on stderr unless `--silent` is
present; `--strict` upgrades it to an error document. The terminal adapter
chooses the visible diagnostic prefix, color, and style.

## Package pipeline

The complete package behavior is a sequence of typed port calls and core
operations:

```text
MarkdownFileReader.read(path)
  -> MarkdownLexer.lex(source)
  -> MarkdownAstParser.parse(tokens)
       -> Markdown body RootAst -> Markdown progress tree -> ProgressResult
       -> YAML/TOML FrontmatterAst -> value parser -> core classifier -> ProgressResult
  -> ProgressReport
  -> TerminalOutputPort.render(...) or JsonOutputPort.render(...)
```

The package never treats a direct input/output fixture as a substitute for a
stage contract. A consumer implementation must accept the preceding stage's
published value and produce the next stage's published value. The package
consumer tests exercise these same boundaries with separate input-to-code and
code-to-output data pairs before composing the full `run` call.

The `howdone` entry is framework-independent and exports the typed pipeline,
progress, frontmatter-classification, display-option, AST, token, and Port
contracts together with the standard Core policy. The `howdone/std` entry
explicitly exposes the standard implementation for the replaceable AST parser
Port. The `howdone/application` entry adds the CLI argument and Port composition
boundary. None of these Core entries imports the repository's third-party CLI
adapters.

## Package dependency boundary

At the hexagonal API level, the package has no required adapter dependency.
The consumer supplies the external Port implementations and may use its own
filesystem, Markdown parser, YAML/TOML decoder, Unicode segmenter,
terminal/output sinks, and output libraries. The compiled Core and application
entries only consume the values and interfaces passed through the public
contract; `howdone/std` contains only dependency-free implementations that can
be supplied to a replaceable Port.

The `howdone` npm package is the dependency-free hexagonal core/application
package. It has no CLI bin and no adapter runtime dependencies. Its
`docs/api.md` file is the published explanation of the core contract. The
separate `howdone-cli` npm package is the primary product and command
executor; it contains the `howdone` and `howdone-cli` executables and default adapters, depends
on the matching `howdone` version, and does not change the core package
contract.

## CLI composition and dependencies

The CLI is the default composition supplied by `howdone-cli`. Its compiled bins
point to `dist/boot/cli-main.js`; the shared CLI runtime supplies the package's
file reader, Unified/Remark Markdown lexer, YAML/TOML value parsers, Unicode
segmenter, terminal and JSON renderers, `InfoDocumentPort`, and package
metadata. The source-checkout and compiled entry wrappers provide their
artifact-specific metadata and documentation paths, then call the same `run`
function exported by `howdone/application`.

The CLI runtime requires Node.js 18.18 or later and the following direct npm
runtime dependencies from `packages/cli/package.json`:

Help, version, and dependency documents are owned by the CLI information-
document adapter.
They implement the Core `InfoDocument` marker and are passed through the
generic `TerminalOutputPort`; they are not exports of `howdone/application` or
`howdone/std`.

| Dependency             | CLI adapter responsibility                                                                                                  |
|------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| `chalk@5.6.2`          | Map semantic output parts to adapter-selected colors without putting color policy in the core.                              |
| `ink@5.2.1`            | Render the in-process terminal viewport, keyboard input, resize updates, and cleanup. It does not launch an external pager. |
| `mdast-util-to-string` | Extract text from Markdown AST nodes.                                                                                       |
| `react@18.3.1`         | Runtime peer required by Ink's renderer; it is the Ink rendering runtime, not a browser application.                        |
| `remark-frontmatter`   | Recognize YAML/TOML delimiter nodes.                                                                                        |
| `remark-gfm`           | Recognize GFM task lists and related Markdown syntax.                                                                       |
| `remark-parse`         | Parse Markdown source.                                                                                                      |
| `smol-toml`            | Decode TOML frontmatter values.                                                                                             |
| `string-width@7.2.0`   | Measure terminal visual cells for Help layout and Pager wrapping.                                                           |
| `unified`              | Compose the Markdown parsing processor.                                                                                     |
| `yaml`                 | Decode YAML frontmatter values.                                                                                             |

These are CLI adapter dependencies. A consumer may use these libraries,
different libraries, or no parsing library at all, provided its implementations
satisfy the published port contracts. The help requirements section is derived
from the CLI package's dependency object, so it describes the CLI runtime
rather than the hexagonal core. The standalone `--dependencies` command emits
the same direct dependency entries as `name@version` lines without entering
the Markdown analysis pipeline.

## Core pipeline API

The core entry accepts a `MarkdownLexer` port and a `MarkdownAstParser` port:

```ts
import {runMarkdownPipeline} from "howdone";

const document = runMarkdownPipeline(
    source,
    lexer,
    parser,
    "tasks.md",
);
```

`SourceDocument` contains the original source, local `LexerToken[]`, and local
`DocumentAst`. The source text is preserved for diagnostics; later display
adapters must not mutate it. `DocumentAst.body` is the Markdown `RootAst`;
`DocumentAst.frontmatter` contains separate YAML/TOML sections recognized only
in the document prefix. A delimiter-shaped YAML/TOML block after Markdown body
content remains part of the Markdown AST, even when its contents are valid in
that data format. This is a defined ambiguity rule: because the delimiter also
has ordinary Markdown meaning, the grammar resolves a middle-of-document block
as Markdown.

## Progress API

```ts
import {calculateProgress} from "howdone";

const markdownProgress = calculateProgress(document.ast.body);
```

The other fixed Core operations are:

```ts
function classifyFrontmatter(value: unknown): FrontmatterDocument;

function buildProgressRoots(ast: RootAst): CheckboxNode[];

function calculateProgress(ast: RootAst): ProgressResult;

function calculateFrontmatterProgress(
    format: FrontmatterFormat,
    document: FrontmatterDocument,
): FrontmatterProgress;

function calculateCombinedProgress(
    markdown: ProgressResult,
    frontmatter: readonly FrontmatterProgress[],
    requestedFrontmatterWeight?: number,
): ProgressResult;

function calculateNodeProgress(node: CheckboxNode): number;

function summarizeProgress(roots: CheckboxNode[]): ProgressResult;

function collectLayerStatistics(result: ProgressResult): LayerStatistics[];

function flattenProgressNodes(
    input: ProgressResult | readonly CheckboxNode[],
): CheckboxNode[];
```

`classifyFrontmatter` applies the Core checklist-shape rules to a decoded
YAML/TOML value. `buildProgressRoots` and `calculateProgress` apply the same
statistical tree rules to the Markdown AST. `calculateFrontmatterProgress`
keeps a format and its recognized checklist descriptions alongside its result.
`calculateCombinedProgress` aggregates every frontmatter result in array order,
then combines that aggregate with Markdown when both sides have roots. Without
a requested weight, root counts determine the frontmatter share; a requested
weight applies to the complete frontmatter side.

The YAML/TOML value parser decodes each section, and the core classifier turns
the parsed value into semantic checklist containers and their entries before
they reach the progress tree:

```ts
interface FrontmatterDocument {
    checklists: FrontmatterChecklist[];
}

interface FrontmatterChecklistEntry {
    label: string;
    checked: boolean | null;
    children?: FrontmatterChecklistEntry[];
}

interface FrontmatterChecklist {
    type: "checklist";
    path: string[];
    entries: FrontmatterChecklistEntry[];
}

interface FrontmatterProgress {
    format: "yaml" | "toml";
    checklists: FrontmatterChecklist[];
    progress: ProgressResult;
}
```

A `FrontmatterChecklist` is a recognized container, not one checkbox. Its
`entries` are leaf checkboxes when `checked` is boolean and derived child
containers when `checked` is `null` with `children`; these are frontmatter
nodes, not Markdown branch items. The classifier's root boundaries,
named-record rules, sequence rules, and rejection behavior are Core semantics.
The API guarantee is that the decoded value has already passed the
format-specific parser and the core classifier has returned only recognized
checklist shapes.

`buildProgressReport` packages these channel results for an application:

```ts
interface ProgressReportOptions {
    mergeFrontmatter: boolean;
    frontmatterWeight?: number;
}

interface ProgressReportBuild {
    report: ProgressReport;
    mergeIgnored: boolean;
    weightIgnored: boolean;
}

function buildProgressReport(
    sourcePath: string,
    markdown: ProgressResult,
    frontmatter: readonly FrontmatterProgress[],
    markdownPresent: boolean,
    options: ProgressReportOptions,
): ProgressReportBuild;
```

Every frontmatter section is one source component and the present Markdown body
is one source component. A merge request is effective for one body plus at
least one section or for at least two sections. It first aggregates all
frontmatter sections; it never merges their YAML/TOML documents. A request with
fewer than two components leaves `presentation` separate and reports
`mergeIgnored`. A valid weight that has no checklist roots on one side leaves
the ordinary calculation unchanged and reports `weightIgnored`.

`ProgressResult` contains:

```ts
interface CheckboxNode {
    label: string;
    checked: boolean | null;
    implicit: boolean;
    children: CheckboxNode[];
    progress: number;
    depth: number;
}

interface LayerStatistics {
    depth: number;
    nodeCount: number;
    leafCount: number;
    branchCount: number;
}

type ProgressPresentation = "separate" | "merged";

interface ProgressResult {
    rootCount: number;
    explicitCheckboxCount: number;
    implicitNodeCount: number;
    nodeCount: number;
    completedEquivalent: number;
    progress: number;   // 0..1
    percentage: number; // 0..100
    roots: CheckboxNode[];
}
```

`CheckboxNode.progress` is recursively calculated. Leaf states use `1`/`0`;
branch states average statistical children and ignore the node's own `checked`
value. `completedEquivalent` is the sum of root progress values and roots have
equal weight.

## Output API

`ResolvedDisplayOptions` controls terminal formatting:

```ts
interface ResolvedDisplayOptions {
    maxLabelClusters: number;
    ellipsis: string;
    truncate: boolean;
    progressFormat: "decimal" | "percentage";
    precision: number;
    showTrailingZeros: boolean;
}
```

The fixed option resolver is:

```ts
function resolveDisplayOptions(
    maxLabelClusters: number | undefined,
    noTruncate: boolean,
    progressFormat?: "decimal" | "percentage",
    precision?: number,
    showTrailingZeros?: boolean,
): ResolvedDisplayOptions;
```

Percentage output defaults to two decimal places and decimal output defaults to
four. Trailing zeroes are omitted by default. Percentage precision may be `0`;
decimal precision must be at least `1`. Tree/details truncate labels to 10
grapheme clusters by default; JSON labels remain complete unless an explicit
limit is requested.

JSON contains raw numeric fields, so explicitly supplied format, precision, and
trailing-zero display options have no effect and produce a warning diagnostic.
`--json --no-truncate` is a valid no-op without a warning, while
`--json --max-label-clusters N` requests JSON label truncation. Output-mode,
truncation, and trailing-zero conflicts are hard errors. Warnings are
written to stderr, suppressed by `--silent`, and upgraded to error diagnostics
by `--strict`. Interactive CLI stderr colors warnings yellow and errors red;
redirected stderr and `--no-color` remain plain.

An invalid `--frontmatter-weight` value is an argument error, not a warning;
`--silent` and `--strict` do not change that result. A valid weight that cannot
affect the selected merge remains an ignored-option warning.

`JsonOutputPort` serializes a `ProgressReport`. The presence fields are
internal layout signals used by the application and are not emitted by the
JSON renderer:

```ts
interface ProgressReport {
    source: { path: string };
    frontmatter?: FrontmatterProgress[];
    frontmatterPresent?: boolean;
    markdown?: ProgressResult;
    markdownPresent?: boolean;
    presentation?: "separate" | "merged";
    frontmatterWeight?: number;
    progress: ProgressResult;
}
```

For one source channel, the JSON result is intentionally flat:

```json
{
  "source": {
    "path": "tasks.md"
  },
  "progress": {
    "rootCount": 0,
    "explicitCheckboxCount": 0,
    "implicitNodeCount": 0,
    "nodeCount": 0,
    "completedEquivalent": 0,
    "progress": 0,
    "percentage": 0,
    "roots": []
  }
}
```

This flat shape applies to a body-only document and to a frontmatter-only
document with exactly one section. It also applies when that channel has no
recognized checklist nodes. A document with both a body and frontmatter, or
with multiple frontmatter sections, uses the nested shape. In the nested shape,
`progress` is the report-level root-count summary across the available channels
when presentation is `"separate"`. `frontmatter` is listed before `markdown`
because frontmatter is the source prefix. It contains one entry per
frontmatter section, in source order; `markdown` is present only when a body
exists. The terminal default presentation uses the same source-component rule:
one component is concise, while two or more components are rendered as
source-labelled sections.

`--merge-frontmatter` changes `presentation` to `"merged"` and makes
`progress` the weighted merged result; the channel results remain available for
comparison. Its source grammar is:

```text
MergeableSource ::= FrontmatterSection+ MarkdownBody
                  | FrontmatterSection FrontmatterSection+
```

The first production is a body with at least one frontmatter section; the
second is at least two frontmatter sections without a body. A single body or a
single section is not mergeable. Sections are never merged as YAML/TOML
documents, even when adjacent sections use the same format or the same
key/table name. Core aggregates every frontmatter section first, then combines
that aggregate with the Markdown result when the body is present. Merge and
warning option rules are part of the CLI argument contract and are exercised by
the CLI BDD suite.
