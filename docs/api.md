# Public API

This document is included in the published `howdone` core package. HowDone is
published in two parts: `howdone` is the framework-independent hexagonal core,
and `howdone-cli` is the primary product and command executor. Its command-line
names are `howdone` and `howdone-cli`. The two packages expose different composition contracts:

| Use | Entry | Who supplies the adapters | Dependency responsibility |
| --- | --- | --- | --- |
| Hexagonal core package | `howdone/application` | The package consumer | The consumer supplies every port in `CliDependencies` |
| Primary CLI product | the `howdone` and `howdone-cli` bins from `howdone-cli` | HowDone's boot composition root | HowDone constructs the default adapters from `packages/cli/package.json` |

The hexagonal core package is the reusable contract. The CLI is the primary
user-facing application of that contract, not the definition of the core API.

## Hexagonal package contract

A consumer imports the application function and its composition types:

```ts
import { run } from "howdone/application";
import type { CliDependencies, CliIO } from "howdone/application";

const io: CliIO = {
  stdout: { write: (chunk) => hostStdout.write(chunk) },
  stderr: { write: (chunk) => hostStderr.write(chunk) },
};

const dependencies: CliDependencies = {
  lexer,
  parser,
  yamlValueParser,
  tomlValueParser,
  fileReader,
  terminalRenderer,
  jsonRenderer,
  warning,
  version: "consumer-defined-version",
  runtimeDependencies: [],
};

const exitCode = await run(["tasks.md", "--json"], io, dependencies);
```

`run` is asynchronous because `MarkdownFileReader.read` is asynchronous. It
returns the CLI-style numeric status: `0` for success and `1` when argument,
read, parse, warning-strictness, or rendering behavior fails. `argv` contains
the application arguments, without the Node executable or package bin name.

The package does not construct filesystem, Markdown, YAML/TOML, Unicode,
terminal, JSON, warning, or package-metadata adapters for a programmatic
consumer. Every required collaborator is explicit in `CliDependencies`:

```ts
import type {
  FrontmatterValueParser,
  JsonOutputPort,
  MarkdownAstParser,
  MarkdownFileReader,
  MarkdownLexer,
  RuntimeDependency,
  TerminalOutputPort,
  WarningPort,
} from "howdone";

interface CliIO {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
}

interface CliDependencies {
  lexer: MarkdownLexer;
  parser: MarkdownAstParser;
  yamlValueParser: FrontmatterValueParser;
  tomlValueParser: FrontmatterValueParser;
  fileReader: MarkdownFileReader;
  terminalRenderer: TerminalOutputPort;
  jsonRenderer: JsonOutputPort;
  warning: WarningPort;
  version: string;
  runtimeDependencies: readonly RuntimeDependency[];
}
```

The two `FrontmatterValueParser` instances are separate ports because the
application selects the YAML or TOML implementation from each parsed section.
Both output ports are required in the composition object even when one call
uses only `--json` or only terminal output.

### Port responsibilities

| Port | Required behavior |
| --- | --- |
| `MarkdownFileReader` | Resolve the received path using the consumer's filesystem policy and return the source text. |
| `MarkdownLexer` | Convert source text to the published `LexerToken[]` contract. |
| `MarkdownAstParser` | Convert those tokens to `DocumentAst`, retaining separate prefix frontmatter and Markdown body. |
| `FrontmatterValueParser` | Decode one `FrontmatterAst` value; semantic checklist recognition remains in the core classifier. |
| `TerminalOutputPort` | Render the requested terminal mode from a `ProgressReport` or `ProgressResult` and resolved display options. |
| `JsonOutputPort` | Serialize a `ProgressReport`; optional display options apply only to explicitly requested JSON label truncation. |
| `WarningPort` | Receive non-fatal warnings. `--silent` prevents calls and `--strict` turns warning conditions into a failed run. |
| `version` and `runtimeDependencies` | Supply metadata for the standalone `--version` and `--dependencies` commands and the requirements section of `--help`; these values are not discovered by the package. |

`GraphemeSegmenter` is a public core port for a terminal adapter's Unicode
label handling. It is not a separate `CliDependencies` field because the
terminal renderer owns that internal collaborator. A consumer may implement
`TerminalOutputPort` with any segmenter or formatting library it chooses.

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

The core entry from `howdone` is framework-independent and exports the typed
pipeline, progress, frontmatter-classification, display-option, AST, token,
and port contracts. The `howdone/application` entry adds the CLI argument and
port composition boundary. Neither entry imports the repository's default
adapters.

## Package dependency boundary

At the hexagonal API level, the package has no required adapter dependency.
The consumer supplies the port implementations and may use its own filesystem,
Markdown parser, YAML/TOML decoder, Unicode segmenter, warning sink, and output
libraries. The compiled core and application entry only consume the values and
interfaces passed through the public contract.

The `howdone` npm package is the dependency-free hexagonal core/application
package. It has no CLI bin and no adapter runtime dependencies. Its
`docs/api.md` file is the published explanation of the core contract. The
separate `howdone-cli` npm package is the primary product and command
executor; it contains the `howdone` and `howdone-cli` executables and default adapters, depends
on the matching `howdone` version, and does not change the core package
contract.

## CLI composition and dependencies

The CLI is the default composition supplied by `howdone-cli`. Its compiled bins
point to `dist/boot/cli-main.js`; that composition root supplies the repository's file
reader, Unified/Remark Markdown lexer, YAML/TOML value parsers, Unicode
segmenter, terminal and JSON renderers, warning sink, and package metadata
reader. It then calls the same `run` function exported by
`howdone/application`.

The CLI runtime requires Node.js 18.18 or later and the following direct npm
runtime dependencies from `packages/cli/package.json`:

| Dependency | CLI adapter responsibility |
| --- | --- |
| `mdast-util-to-string` | Extract text from Markdown AST nodes. |
| `remark-frontmatter` | Recognize YAML/TOML delimiter nodes. |
| `remark-gfm` | Recognize GFM task lists and related Markdown syntax. |
| `remark-parse` | Parse Markdown source. |
| `smol-toml` | Decode TOML frontmatter values. |
| `unified` | Compose the Markdown parsing processor. |
| `yaml` | Decode YAML frontmatter values. |

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
import { runMarkdownPipeline } from "howdone";

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
import { calculateProgress } from "howdone";

const markdown = calculateProgress(document.ast.body);
```

The YAML/TOML value parser decodes each section, and the core classifier turns
the parsed value into semantic checklist containers and their entries before
they reach the progress tree:

```ts
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
nodes, not Markdown branch items. The complete recognition rules, including
root boundaries, named records, unnamed sequences, YAML/TOML differences, and
rejection behavior, are defined in the separately published `howdone-cli`
package's `docs/syntax.md`. The API guarantee is that the decoded value has
already passed the format-specific parser and the core classifier has returned
only recognized checklist shapes.

`ProgressResult` contains:

```ts
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

Percentage output defaults to two decimal places and decimal output defaults to
four. Trailing zeroes are omitted by default. Percentage precision may be `0`;
decimal precision must be at least `1`. Tree/details truncate labels to 10
grapheme clusters by default; JSON labels remain complete unless an explicit
limit is requested.

JSON contains raw numeric fields, so explicitly supplied format, precision, and
trailing-zero display options have no effect and produce a process warning.
`--json --no-truncate` is a valid no-op without a warning, while
`--json --max-label-clusters N` requests JSON label truncation. Output-mode,
truncation, and trailing-zero conflicts are hard errors. Warnings are
suppressed by `--silent` and upgraded to errors by `--strict`.

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
  "source": { "path": "tasks.md" },
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
exists.

`--merge-frontmatter` changes `presentation` to `"merged"` and makes
`progress` the weighted merged result; the channel results remain available for
comparison. Sections are never merged as YAML/TOML documents, even when
adjacent sections use the same format or the same key/table name. Merge and
warning option rules are part of the CLI argument contract and are exercised by
the CLI BDD suite.
