# HowDone architecture

HowDone is published in two parts. The `howdone` npm package is the
framework-independent hexagonal core, while `howdone-cli` is the primary
product and command executor. The CLI's command-line names are `howdone` and
`howdone-cli`; it composes the default adapters around the reusable core.

## Repository layout

```text
./
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── update-version-badge.yml
├── bin/
│   └── howdone.cjs
├── docs/
│   ├── assets/
│   │   ├── howdone-terminal.svg
│   │   └── task-editor.svg
│   ├── api.md
│   ├── architecture.md
│   ├── development.md
│   ├── guide.md
│   └── syntax.md
├── packages/
│   ├── cli/
│   │   ├── docs/
│   │   ├── package.json
│   │   └── README.md
│   └── core/
│       ├── docs/
│       ├── source/
│       │   ├── application/
│       │   │   └── index.ts
│       │   └── core/
│       │       ├── index.ts
│       │       └── std.ts
│       ├── package.json
│       └── README.md
├── scripts/
│   ├── build-test-artifacts.mjs
│   ├── check-ascii.ts
│   ├── check-cli-help.ts
│   ├── check-package-contents.ts
│   ├── check-platform-neutral.ts
│   ├── clean.mjs
│   ├── install-local.mjs
│   ├── run-compiled-tests.mjs
│   ├── run-cucumber.mjs
│   ├── sync-package-artifacts.mjs
│   ├── typecheck-maintenance.ts
│   ├── update-version-badge.mjs
│   └── validate-release.mjs
├── src/
│   ├── adapters/
│   │   ├── filesystem/
│   │   │   └── node-file-reader.ts
│   │   ├── frontmatter/
│   │   │   ├── toml-value-parser.ts
│   │   │   └── yaml-value-parser.ts
│   │   ├── markdown/
│   │   │   └── remark-lexer.ts
│   │   ├── output/
│   │   │   ├── cli-help-terminal.ts
│   │   │   ├── cli-help.ts
│   │   │   ├── ink-pager.ts
│   │   │   ├── ink-terminal-renderer.ts
│   │   │   ├── json-renderer.ts
│   │   │   ├── label-formatter.ts
│   │   │   ├── pager-state.ts
│   │   │   ├── terminal-colors.ts
│   │   │   ├── terminal-output.ts
│   │   │   ├── terminal-renderer.ts
│   │   │   └── terminal-width.ts
│   │   ├── runtime/
│   │   │   ├── node-cli-io.ts
│   │   │   └── node-package-version.ts
│   │   └── unicode/
│   │       └── intl-grapheme-segmenter.ts
│   ├── application/
│   │   ├── cli/
│   │   │   └── args.ts
│   │   ├── analyze.ts
│   │   ├── index.ts
│   │   └── types.ts
│   ├── boot/
│   │   ├── cli-main.ts
│   │   ├── cli-runtime.ts
│   │   ├── entrypoint.ts
│   │   ├── main.ts
│   │   └── pipeline.ts
│   └── core/
│       ├── ast/
│       │   ├── parser.ts
│       │   └── types.ts
│       ├── config/
│       │   ├── options.ts
│       │   └── types.ts
│       ├── frontmatter/
│       │   ├── classifier.ts
│       │   ├── tree-builder.ts
│       │   └── types.ts
│       ├── progress/
│       │   ├── analyzer.ts
│       │   ├── metrics.ts
│       │   ├── report.ts
│       │   ├── tree-builder.ts
│       │   └── types.ts
│       ├── source/
│       │   ├── pipeline.ts
│       │   └── types.ts
│       ├── index.ts
│       ├── ports.ts
│       ├── std.ts
│       └── types.ts
├── test/                    BDD, TDD, published-package, and regression tests; see test/README.md
├── .gitattributes
├── .gitignore
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE                  Apache License 2.0
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.build.json
├── tsconfig.cli-build.json
├── tsconfig.json
├── tsconfig.test-build.json
├── version_badge.json
└── version_badge_cli.json
```

## Pipeline

```text
Markdown source
  -> RemarkLexer adapter
  -> core/source LexerToken[]
  -> core/std TypedAstParser
  -> core/ast DocumentAst
       -> Markdown body RootAst
            -> core/progress tree-builder -> core/progress metrics
            -> Markdown ProgressResult
       -> YAML/TOML FrontmatterAst
            -> format-specific YAML/TOML value adapter -> core/frontmatter classifier
            -> core/frontmatter tree-builder
            -> frontmatter ProgressResult
  -> separate or explicitly merged ProgressReport
  -> terminal or JSON output adapter
```

TypeScript source is compiled by `tsconfig.build.json` into the ignored
`packages/core/dist/` directory, and `tsconfig.cli-build.json` emits the CLI
adapters into `packages/cli/dist/`. The compiler rewrites relative `.ts`
imports to `.js` and emits declarations for the public core entry.
The `howdone` package is the framework-independent hexagonal core and has no
bin; the `howdone-cli` package is the primary product and its `howdone` and
`howdone-cli` bins point directly to `dist/boot/cli-main.js`. Repository source checks continue to use
`bin/howdone.cjs`: Node.js 23+ uses native TypeScript execution and Node.js
18.18-22 uses `tsx`. The source and compiled test modes select their entry
explicitly; each mode owns its runtime contract. Compiled parity stages the
two compiled packages and the CLI's resolved production dependency closure in
a temporary sandbox. The test runner may use development dependencies to
orchestrate BDD, but the package consumer and CLI application processes can
resolve only the package's published runtime dependencies. The separate
local-install parity mode installs the compiled Core and CLI from local package
paths into another temporary sandbox, then runs the installed package entries
and both CLI bin aliases.

The test boundary is intentionally split. `test/bdd/` is a CLI-only black-box
suite that starts the executable and owns CLI process behavior. The
`test/package/tdd/` and `test/package/bdd/` suites are Core consumer tests: they
stage the public `howdone` package and supply their own ports and JSON fixtures.
They do not import CLI adapters or share CLI BDD steps. The consumer output
fixture covers 16 terminal/JSON capability declarations across four requested
color/Pager mode combinations, for 64 cases.

The repository root is the only source of the shared `LICENSE`, `docs/api.md`,
`docs/guide.md`, and `docs/syntax.md` content. `scripts/sync-package-artifacts.mjs`
materializes the core API, CLI guide, and CLI syntax documents plus the shared
license in the ignored workspace package directories before builds, package
checks, and releases, so
the npm tarballs contain the required files without maintaining duplicate
tracked documents.

The first arrow is the only Markdown syntax-engine boundary. Unified/Remark recognizes CommonMark, GFM task lists,
YAML/TOML frontmatter, code blocks, tables, HTML, links, and inline content. The adapter maps the external mdast into
local source tokens and source spans. No core module imports mdast. YAML/TOML syntax is decoded by the format adapter;
the core classifier then applies the semantic shape rules, never Markdown checkbox text.

The source contract allows an empty body, a body without frontmatter, one
frontmatter section without a body, or multiple frontmatter sections with an
optional body. Frontmatter sections are collected in source order only while
they form the document prefix. A delimiter-shaped YAML/TOML block after a
Markdown body is parsed as ordinary Markdown, even when its contents are valid
frontmatter data. This is a defined ambiguity rule: the delimiter has ordinary
Markdown meaning, especially as a thematic break, so the grammar resolves the
middle-of-document ambiguity in favor of Markdown. Each section retains its
own format, so YAML/YAML,
YAML/TOML, TOML/YAML, TOML/TOML, and longer alternating sequences do not get
collapsed into one parser input. Recognized roots from all sections are
aggregated for the report-level separate result. `--merge-frontmatter` requires
at least two source components, counting every frontmatter section and the
Markdown body, so multiple frontmatter sections may be merged without Markdown.
The default frontmatter weight is `frontmatter root count / (frontmatter root
count + Markdown root count)`; roots inside the aggregated frontmatter side
retain root-count weighting. An explicit `--frontmatter-weight` replaces the
derived weight for the entire frontmatter side only when it is a legal decimal
in `(0, 1)`. A numeric weight without merge is valid but unused and produces a
warning diagnostic on stderr by default. An out-of-range or non-decimal value
is an invalid option value and produces a hard error, regardless of
`--silent` or `--strict`.

Terminal output defaults to percentage format with precision `2` and hidden
trailing zeroes; decimal format defaults to precision `4`. Tree/details labels
default to 10 grapheme clusters, while JSON keeps labels and numeric fields
complete unless an explicit label limit is requested. Help stdout, terminal
report stdout, and JSON stdout all use the default TTY Pager policy; stderr
diagnostics do not page. Argument usage guidance, when present, is part of the
single error document on stderr. JSON format, precision, and
trailing-zero options are ignored with a warning diagnostic;
`--json --no-truncate` is a no-op without a warning. Output-mode, truncation,
and trailing-zero conflicts are hard errors. Warnings are suppressed by
`--silent` and upgraded to errors by `--strict`.

## Stage contracts

| Stage                 | Contract                    | Implementation                                     | Allowed dependency direction                                   |
|-----------------------|-----------------------------|----------------------------------------------------|----------------------------------------------------------------|
| Source                | `core/source/types.ts`      | `adapters/markdown/remark-lexer.ts`                | adapter may import Unified/Remark and core source types        |
| AST                   | `core/ast/types.ts`         | `core/ast/parser.ts`, exported by `howdone/std`    | parser consumes local tokens only                              |
| Frontmatter values    | `core/ports.ts`             | `adapters/frontmatter/{yaml,toml}-value-parser.ts` | separate adapters decode YAML or TOML and report syntax errors |
| Frontmatter semantics | `core/frontmatter/types.ts` | `core/frontmatter/classifier.ts`                   | core-only recognition of checklist shapes                      |
| Frontmatter tree      | `core/progress/types.ts`    | `core/frontmatter/tree-builder.ts`                 | semantic checklist entries to checkbox nodes                   |
| Progress tree         | `core/progress/types.ts`    | `core/progress/tree-builder.ts`                    | domain AST to checkbox nodes                                   |
| Completion            | `core/progress/types.ts`    | `core/progress/metrics.ts`                         | recursive numeric policy only                                  |
| Application           | `application/analyze.ts`    | `boot/cli-runtime.ts` composition                  | ports in, report out                                           |
| Output                | `core/ports.ts`             | `adapters/output/*`                                | adapters consume core result                                   |

Definition files describe data and contracts. Implementation files consume those definitions; definitions do not import
implementations.

The `core` subfolders contain framework-independent contracts and fixed policy,
plus implementations for replaceable Ports. The public `howdone/std` entry
exposes `TypedAstParser`, the standard implementation for the replaceable AST
parser Port; the root `howdone` entry exports the complete Core API. The CLI's
Markdown, frontmatter, filesystem, terminal, JSON, and host-IO adapters are a
different category: they interact with external libraries or host behavior and
are supplied by the CLI composition root.

HowDone is a hexagonal application. `src/core/` is the dependency center: it
defines contracts and framework-independent policy. Adapters implement core
ports; application code coordinates a use case through those ports; and the
boot layer is the only composition root. No core module imports an adapter,
Node runtime API, parser library, or terminal library, and no adapter imports
application or boot code.

`docs/syntax.md` is the user-facing source and result language contract, while
`docs/guide.md` is the user-facing CLI command and parameter guide. This
architecture document may point to either; both published documents remain
standalone so they can be read from the CLI package without requiring
repository documentation.

## Core AST

The local document AST deliberately contains more structure than the progress feature needs:

- `document` owns frontmatter sections and the Markdown `root` body;
- `frontmatter` sections retain their YAML/TOML format and raw value for the value adapter;
- `list` owns ordered/unordered `list-item` nodes;
- `list-item` owns paragraph, heading, and nested-list blocks and carries `checked: boolean | null`;
- code, table, HTML, blockquote, and unsupported blocks remain typed so the Markdown progress stage can ignore them by
  AST kind rather than by source regex.

The Markdown progress tree builder considers only document-root lists as statistical roots. Nested lists are found
through list-item descendants. A plain list item with no statistical descendants is dropped; a plain item with
descendants becomes an implicit `CheckboxNode`.

The complete frontmatter recognition contract belongs to
[`docs/syntax.md`](syntax.md). Architecturally, the format adapters only decode
YAML or TOML values, `core/frontmatter/classifier.ts` applies the shared
semantic contract, and `core/frontmatter/tree-builder.ts` turns recognized
entries into progress nodes. The classifier evaluates YAML and TOML separately;
the TOML adapter enforces its homogeneous-array grammar before classification.

## Adapters and ports

- `MarkdownLexer` is implemented by `RemarkLexer`. It delegates source recognition to Unified/Remark and emits local
  `LexerToken` objects. The lexer uses Remark's frontmatter extension for prefix candidates and a Remark Markdown parse
  for the body, so late delimiter-shaped blocks remain Markdown without a hand-written Markdown parser.
- `FrontmatterValueParser` is implemented separately by `YamlValueParser` and `TomlValueParser`. Each delegates one
  syntax to its native library (`yaml` or `smol-toml`) and emits format-independent values. `classifyFrontmatter` in
  `core/frontmatter/classifier.ts` applies the semantic checklist contract.
- `MarkdownFileReader` is implemented by `NodeMarkdownFileReader`, which delegates path resolution to `node:path` and
  file access to `node:fs/promises`.
- `GraphemeSegmenter` is implemented by `IntlGraphemeSegmenter`, which delegates Unicode grapheme boundaries to
  `Intl.Segmenter`.
- `TerminalOutputPort` and `JsonOutputPort` are implemented by the output adapters. They receive separate
  Markdown/frontmatter results or an explicitly merged result. A single source channel uses the original flat display
  shape; a body plus frontmatter, or multiple frontmatter sections, uses source-labelled nested sections, including in
  default terminal mode. JSON preserves
  labels by default; an explicit display option can create a truncated serialization copy without mutating the core
  result. The top-level report result remains available as the root-count summary or merged result.
- `TerminalOutputPort.render`, `renderDocument`, `renderWarning`, and `renderError` each create the same concrete
  streamable `TOutput` type. The optional `print` member receives that exact value and owns direct output, color
  rendering, visual-width pagination, and the complete output retained after normal Pager exit. The CLI adapters'
  `cli-help.ts` defines the CLI-owned information documents and `cli-help-terminal.ts` maps their parts into terminal
  semantics; `terminal-output.ts` owns the CLI plain representation, `terminal-colors.ts` owns the adapter's
  semantic-to-color mapping, `terminal-width.ts` owns visual-cell measurement and lazy visual-row selection,
  `pager-state.ts` owns viewport movement, and `ink-terminal-renderer.ts` owns Ink integration, TTY checks, resize,
  input, cleanup, and diagnostic color delivery.
- Help, version, and dependency documents are CLI output adapters, not Core application exports. Core defines the empty
  `InfoDocument` marker, the `InfoCommand` names, and the `InfoDocumentPort` execution boundary; it does not import or
  define the CLI document shape.
- The application executes the selected information command through the CLI's `InfoDocumentPort`, forwards the returned
  opaque document to the terminal port, and falls back to `io.stdout` for reports/information or `io.stderr` for
  warnings/errors when `print` is absent. `JsonOutputPort` receives only JSON data, so diagnostics stay outside the JSON
  stdout document and do not affect `jq` pipelines.
- `JsonOutputPort.render` creates the JSON object itself. The optional JSON delivery member receives that exact object
  and may color or page its structural syntax on the provider's own TTY. When the member is absent, the application
  serializes the object with `JSON.stringify` and writes ordinary JSON. JSON does not use `Streamable` and does not
  define a Core color vocabulary; its object structure already distinguishes punctuation, keys, strings, numbers, and
  keywords.
- The core forwards `auto`/`never` feature modes but never checks TTY state. Core has no force mode: an interactive Pager
  cannot be obtained for a file or pipe, and forced styling would change ordinary redirected output. An implementation
  may declare terminal delivery only when it can judge the TTY of its own target
  stream; it may support color, Pager, both, or neither. A missing optional member falls back to the streamable value's
  ordinary `writeTo` behavior on the selected `TerminalIO` sink. The core does not define terminal colors or ANSI
  sequences.

## Composition root

`src/boot/cli-runtime.ts` is the shared CLI composition point. It constructs
the default adapters, terminal and JSON output ports, and CLI information
document provider exactly once. `src/boot/main.ts` is the source-checkout
wrapper; it supplies source-layout metadata and is reached through
`bin/howdone.cjs`. `src/boot/cli-main.ts` is the compiled `howdone-cli`
wrapper; it supplies installed-package metadata and is the file targeted by
both published CLI bins. The two wrappers remain separate because the source
and compiled artifacts have different package and documentation paths, while
their application composition is shared.
The package metadata adapter reads the CLI package's own version and runtime
dependency metadata from `packages/cli/package.json`; the repository badge
script reads the Core and CLI package versions and is not a runtime dependency.
The published `howdone/application` entry exposes the port boundary for
consumers that provide their own external implementations. The published
`howdone/std` entry exposes the dependency-free standard implementation
`TypedAstParser` for the replaceable AST parser Port. The CLI-side
`node-cli-io.ts` adapter binds the standard CLI host output to the current
process streams. The `howdone` package contains no third-party adapter or CLI
bin, while both CLI bin aliases start the compiled
`dist/boot/cli-main.js`.
