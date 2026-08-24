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
│   └── development.md
├── src/
│   ├── adapters/
│   │   ├── filesystem/
│   │   │   └── node-file-reader.ts
│   │   ├── markdown/
│   │   │   └── remark-lexer.ts
│   │   ├── output/
│   │   │   ├── json-renderer.ts
│   │   │   ├── label-formatter.ts
│   │   │   └── terminal-renderer.ts
│   │   └── unicode/
│   │       └── intl-grapheme-segmenter.ts
│   ├── application/
│   │   ├── cli/
│   │   │   ├── args.ts
│   │   │   └── help.ts
│   │   ├── analyze.ts
│   │   ├── types.ts
│   │   └── version.ts
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
│       ├── progress/
│       │   ├── analyzer.ts
│       │   ├── metrics.ts
│       │   ├── tree-builder.ts
│       │   └── types.ts
│       ├── source/
│       │   ├── pipeline.ts
│       │   └── types.ts
│       ├── index.ts
│       ├── ports.ts
│       └── types.ts
├── test/                    TDD, BDD, and regression tests
├── .gitignore
├── .gitattributes
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE                  Apache License 2.0
├── package-lock.json
├── package.json
├── README.md
├── scripts/
│   └── update-version-badge.mjs
├── version_badge.json       README version badge data
└── tsconfig.json
```

## Pipeline

```text
Markdown source
  -> RemarkLexer adapter
  -> core/source LexerToken[]
  -> core/ast TypedAstParser
  -> core/ast RootAst
  -> core/progress tree-builder
  -> core/progress metrics
  -> ProgressResult
  -> terminal or JSON output adapter
```

The first arrow is the only syntax-engine boundary. Unified/Remark recognizes CommonMark, GFM task lists, YAML/TOML frontmatter, code blocks, tables, HTML, links, and inline content. The adapter maps the external mdast into local source tokens and source spans. No core module imports mdast.

## Stage contracts

| Stage | Contract | Implementation | Allowed dependency direction |
| --- | --- | --- | --- |
| Source | `core/source/types.ts` | `adapters/markdown/remark-lexer.ts` | adapter may import Unified/Remark and core source types |
| AST | `core/ast/types.ts` | `core/ast/parser.ts` | parser consumes local tokens only |
| Progress tree | `core/progress/types.ts` | `core/progress/tree-builder.ts` | domain AST to checkbox nodes |
| Completion | `core/progress/types.ts` | `core/progress/metrics.ts` | recursive numeric policy only |
| Application | `application/analyze.ts` | `boot/main.ts` composition | ports in, report out |
| Output | `core/ports.ts` | `adapters/output/*` | adapters consume core result |

Definition files describe data and contracts. Implementation files consume those definitions; definitions do not import implementations.

## Core AST

The local AST deliberately contains more structure than the progress feature needs:

- `root` owns document blocks;
- `list` owns ordered/unordered `list-item` nodes;
- `list-item` owns paragraph, heading, and nested-list blocks and carries `checked: boolean | null`;
- code, table, HTML, frontmatter, blockquote, and unsupported blocks remain typed so the progress stage can ignore them by AST kind rather than by source regex.

The progress tree builder considers only document-root lists as statistical roots. Nested lists are found through list-item descendants. A plain list item with no statistical descendants is dropped; a plain item with descendants becomes an implicit `CheckboxNode`.

## Adapters and ports

- `MarkdownLexer` is implemented by `RemarkLexer`. It delegates source recognition to Unified/Remark and emits local `LexerToken` objects.
- `MarkdownFileReader` is implemented by `NodeMarkdownFileReader`, which delegates path resolution to `node:path` and file access to `node:fs/promises`.
- `GraphemeSegmenter` is implemented by `IntlGraphemeSegmenter`, which delegates Unicode grapheme boundaries to `Intl.Segmenter`.
- `TerminalOutputPort` and `JsonOutputPort` are implemented by the output adapters. JSON receives the raw `ProgressResult` and preserves labels by default; an explicit display option can create a truncated serialization copy without mutating the core result.

## Composition root

`src/boot/main.ts` constructs every default adapter and passes them to the application. `src/application/analyze.ts` does not instantiate Remark, filesystem, or output implementations. `bin/howdone.cjs` only chooses the TypeScript loader and starts `boot/main.ts`.
