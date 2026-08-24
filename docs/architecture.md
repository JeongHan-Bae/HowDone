# HowDone architecture

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
│   ├── api.md
│   ├── architecture.md
│   ├── development.md
│   └── syntax.md
├── scripts/
│   ├── build-test-artifacts.mjs
│   ├── check-package-contents.ts
│   ├── check-platform-neutral.ts
│   ├── run-cucumber.mjs
│   └── update-version-badge.mjs
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
│   │   │   ├── json-renderer.ts
│   │   │   ├── label-formatter.ts
│   │   │   └── terminal-renderer.ts
│   │   ├── runtime/
│   │   │   ├── node-package-version.ts
│   │   │   └── node-warning-sink.ts
│   │   └── unicode/
│   │       └── intl-grapheme-segmenter.ts
│   ├── application/
│   │   ├── cli/
│   │   │   ├── args.ts
│   │   │   └── help.ts
│   │   ├── analyze.ts
│   │   └── types.ts
│   ├── boot/
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
│       └── types.ts
├── test/                    BDD, TDD, and regression tests
├── .gitattributes
├── .gitignore
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE                  Apache License 2.0
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.build.json
├── tsconfig.json
├── tsconfig.test-build.json
└── version_badge.json
```

## Pipeline

```text
Markdown source
  -> RemarkLexer adapter
  -> core/source LexerToken[]
  -> core/ast TypedAstParser
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
`dist/` directory. The compiler rewrites relative `.ts` imports to `.js` and
emits declarations for the public core entry. The package `howdone` bin points
directly to the compiled `dist/boot/main.js` entry. Repository source checks
continue to use `bin/howdone.cjs`: Node.js 23+ uses native TypeScript
execution and Node.js 18.18–22 uses `tsx`. The source and compiled test modes
select their entry explicitly; each mode owns its runtime contract.

The first arrow is the only Markdown syntax-engine boundary. Unified/Remark recognizes CommonMark, GFM task lists, YAML/TOML frontmatter, code blocks, tables, HTML, links, and inline content. The adapter maps the external mdast into local source tokens and source spans. No core module imports mdast. YAML/TOML syntax is decoded by the format adapter; the core classifier then applies the semantic shape rules, never Markdown checkbox text.

The source contract allows an empty body, a body without frontmatter, one
frontmatter section without a body, or multiple frontmatter sections with an
optional body. Frontmatter sections are collected in source order only while
they form the document prefix. A frontmatter node after a Markdown body node is
rejected by the lexer. Each section retains its own format, so YAML/YAML,
YAML/TOML, TOML/YAML, TOML/TOML, and longer alternating sequences do not get
collapsed into one parser input. Recognized roots from all sections are
aggregated for the report-level separate result. `--merge-frontmatter` requires
at least two source components, counting every frontmatter section and the
Markdown body, so multiple frontmatter sections may be merged without Markdown.
The default frontmatter weight is `frontmatter root count / (frontmatter root
count + Markdown root count)`; roots inside the aggregated frontmatter side
retain root-count weighting. An explicit `--frontmatter-weight` replaces the
derived weight for the entire frontmatter side only when it is a legal decimal
in `(0, 1)`. A numeric weight without merge is invalid, while an out-of-range
or non-decimal value is illegal; both produce a process warning by default,
`--silent` suppresses it, and `--strict` turns it into an error.

Terminal output defaults to percentage format with precision `2` and hidden
trailing zeroes; decimal format defaults to precision `4`. Tree/details labels
default to 10 grapheme clusters, while JSON keeps labels and numeric fields
complete unless an explicit label limit is requested. JSON format, precision,
and trailing-zero options are ignored with a process warning; `--json --no-truncate`
is a no-op without a warning. Output-mode, truncation, and
trailing-zero conflicts are hard errors. Warnings are suppressed by `--silent`
and upgraded to errors by `--strict`.

## Stage contracts

| Stage | Contract | Implementation | Allowed dependency direction |
| --- | --- | --- | --- |
| Source | `core/source/types.ts` | `adapters/markdown/remark-lexer.ts` | adapter may import Unified/Remark and core source types |
| AST | `core/ast/types.ts` | `core/ast/parser.ts` | parser consumes local tokens only |
| Frontmatter values | `core/ports.ts` | `adapters/frontmatter/{yaml,toml}-value-parser.ts` | separate adapters decode YAML or TOML and report syntax errors |
| Frontmatter semantics | `core/frontmatter/types.ts` | `core/frontmatter/classifier.ts` | core-only recognition of checklist shapes |
| Frontmatter tree | `core/progress/types.ts` | `core/frontmatter/tree-builder.ts` | semantic checklist entries to checkbox nodes |
| Progress tree | `core/progress/types.ts` | `core/progress/tree-builder.ts` | domain AST to checkbox nodes |
| Completion | `core/progress/types.ts` | `core/progress/metrics.ts` | recursive numeric policy only |
| Application | `application/analyze.ts` | `boot/main.ts` composition | ports in, report out |
| Output | `core/ports.ts` | `adapters/output/*` | adapters consume core result |

Definition files describe data and contracts. Implementation files consume those definitions; definitions do not import implementations.

HowDone is a hexagonal application. `src/core/` is the dependency center: it
defines contracts and framework-independent policy. Adapters implement core
ports; application code coordinates a use case through those ports; and the
boot layer is the only composition root. No core module imports an adapter,
Node runtime API, parser library, or terminal library, and no adapter imports
application or boot code.

`docs/syntax.md` is the user-facing syntax contract. This architecture
document may point to it, but the syntax document remains standalone so it can
be read from the published package without requiring repository documentation.

## Core AST

The local document AST deliberately contains more structure than the progress feature needs:

- `document` owns frontmatter sections and the Markdown `root` body;
- `frontmatter` sections retain their YAML/TOML format and raw value for the value adapter;
- `list` owns ordered/unordered `list-item` nodes;
- `list-item` owns paragraph, heading, and nested-list blocks and carries `checked: boolean | null`;
- code, table, HTML, blockquote, and unsupported blocks remain typed so the Markdown progress stage can ignore them by AST kind rather than by source regex.

The Markdown progress tree builder considers only document-root lists as statistical roots. Nested lists are found through list-item descendants. A plain list item with no statistical descendants is dropped; a plain item with descendants becomes an implicit `CheckboxNode`.

The complete frontmatter recognition contract belongs to
[`docs/syntax.md`](syntax.md). Architecturally, the format adapters only decode
YAML or TOML values, `core/frontmatter/classifier.ts` applies the shared
semantic contract, and `core/frontmatter/tree-builder.ts` turns recognized
entries into progress nodes. The classifier evaluates YAML and TOML separately;
the TOML adapter enforces its homogeneous-array grammar before classification.

## Adapters and ports

- `MarkdownLexer` is implemented by `RemarkLexer`. It delegates source recognition to Unified/Remark and emits local `LexerToken` objects.
- `FrontmatterValueParser` is implemented separately by `YamlValueParser` and `TomlValueParser`. Each delegates one syntax to its native library (`yaml` or `smol-toml`) and emits format-independent values. `classifyFrontmatter` in `core/frontmatter/classifier.ts` applies the semantic checklist contract.
- `MarkdownFileReader` is implemented by `NodeMarkdownFileReader`, which delegates path resolution to `node:path` and file access to `node:fs/promises`.
- `GraphemeSegmenter` is implemented by `IntlGraphemeSegmenter`, which delegates Unicode grapheme boundaries to `Intl.Segmenter`.
- `TerminalOutputPort` and `JsonOutputPort` are implemented by the output adapters. They receive separate Markdown/frontmatter results or an explicitly merged result. A single source channel uses the original flat display shape; a body plus frontmatter, or multiple frontmatter sections, uses source-labelled nested sections. JSON preserves labels by default; an explicit display option can create a truncated serialization copy without mutating the core result. The top-level report result remains available as the root-count summary or merged result.

## Composition root

`src/boot/main.ts` constructs every default adapter and passes them to the application, including the package-version reader and process-warning sink. The package-version adapter reads the current npm package's own `package.json` metadata; the repository badge script is not a runtime dependency and is not published. `src/application/analyze.ts` does not instantiate Remark, filesystem, runtime, or output implementations. The repository launcher starts `src/boot/main.ts`, while the published `howdone` bin starts the compiled `dist/boot/main.js`; both entries use the same composition root and application.
