# HowDone

HowDone answers “How done is this Markdown?” It is a local, cross-platform CLI that analyzes hierarchical Markdown task lists, calculates overall and per-level completion, and never modifies or uploads the source file.

## Install and run

From this project directory:

```bash
npm install
npm link
howdone ./tasks.md
```

The package can also be installed from a local package path:

```bash
npm install /path/to/HowDone
npx howdone ./tasks.md
```

After the first npm release, install it globally or run it through `npx`:

```bash
npm install --global howdone
howdone README.md
npx howdone README.md
```

The npm package is `howdone` and the executable is `howdone`. Node.js 23 and newer runs the TypeScript entry point with Node's native type stripping. Node.js 18.18 through 22 automatically uses the bundled `tsx` fallback. Node.js versions below 18.18 are rejected.

## Usage

```text
howdone <markdown-path>
howdone <markdown-path> --format decimal
howdone <markdown-path> --format percentage
howdone <markdown-path> --precision 3
howdone <markdown-path> --show-trailing-zeros
howdone <markdown-path> --tree
howdone <markdown-path> --details
howdone <markdown-path> --json
howdone <markdown-path> --max-label-clusters 15
howdone <markdown-path> --no-truncate
howdone --help
howdone --version
```

With only a Markdown path, the CLI prints the overall percentage, for example `75%`. Use `--format decimal` for a decimal value such as `0.75`, or `--format percentage`/`--percentage` for an explicit percentage. `--tree`, `--details`, and `--json` are mutually exclusive. JSON output contains the complete numeric report; labels are complete by default and can be truncated with an explicit label limit.

The path is passed to Node's platform-native `node:path` and `node:fs` implementations. The CLI does not hand-write a Windows-path parser or translate one operating system's path syntax on another operating system. Relative paths, absolute paths, Unicode names, spaces, and the platform's native separators are therefore resolved by the runtime on the system where the command runs.

## Calculation model

Remark parses Markdown into mdast. The Remark adapter maps only the relevant list structure to a small library-independent document model. The core then applies these rules:

- A task list item with no statistical children is a leaf: checked is `1`, unchecked is `0`.
- A list item with statistical children is a branch. Its own checkbox state is ignored, and its progress is the average of its children.
- A plain list item with task descendants becomes an implicit statistical node.
- A plain list item with no task descendants is discarded.
- Root nodes have equal weight.
- Headings, ordinary paragraphs, code blocks, tables, HTML comments, and frontmatter do not create task nodes.

For example:

```markdown
- A
  - B
    - [x] C1
    - [ ] C2
  - [x] D
```

produces `C1 = 100%`, `C2 = 0%`, `B = 50%`, `D = 100%`, and `A = 75%`.

## Text display

Labels are truncated only when a display mode has truncation enabled. The default limit is 10 Unicode grapheme clusters, not JavaScript UTF-16 code units. This keeps emoji, flags, ZWJ sequences, combining marks, and CJK characters intact. JSON keeps complete labels by default; `--json --max-label-clusters N` enables the same label truncation.

Percentage output uses 2 decimal places by default and decimal output uses 4. Trailing zeroes are hidden by default, so `50.103%` is displayed as `50.1%`; `--show-trailing-zeros` preserves the selected precision. `--precision N` accepts 0 through 100 for percentages and 1 through 100 for decimal output.

HowDone uses these fixed display defaults:

- maximum label length: 10 Unicode grapheme clusters;
- ellipsis: `...`;
- percentage precision: 2 decimal places;
- decimal precision: 4 decimal places;
- trailing zeroes: hidden.

Use the CLI options above to change display behavior for the current command.
Invalid option values produce a non-zero exit code with a clear error.

## Architecture and pipeline

The project follows a lightweight hexagonal architecture. `src` has no loose business modules: stage contracts and domain calculations live under `core`, external implementations live under `adapters`, use-case orchestration lives under `application`, and the executable entrypoint lives under `boot`.

```text
Markdown source
  -> MarkdownLexer port
     -> RemarkLexer adapter (Unified / Remark / GFM / frontmatter)
  -> LexerToken[]
  -> MarkdownAstParser port
     -> TypedAstParser
  -> RootAst
  -> Progress tree builder
  -> Completion metrics
  -> ProgressResult
  -> Terminal renderer or JSON renderer
```

The stage contracts are local TypeScript definitions:

| Stage | Contract | Default implementation |
| --- | --- | --- |
| Source / lexer | `src/core/source/types.ts` | `src/adapters/markdown/remark-lexer.ts` |
| AST | `src/core/ast/types.ts` | `src/core/ast/parser.ts` |
| Progress tree | `src/core/progress/types.ts` | `src/core/progress/tree-builder.ts` |
| Completion metrics | `src/core/progress/types.ts` | `src/core/progress/metrics.ts` |
| Ports | `src/core/ports.ts` | filesystem, Unicode, and output adapters |

Remark owns Markdown/GFM recognition. The adapter converts the external mdast into the project's `LexerToken` contract; the typed AST parser then produces the local `RootAst`. The progress core never imports Unified, Remark, Node filesystem APIs, or CLI code. The JSON renderer serializes the full `ProgressResult` with numeric completion fields and complete labels by default; an explicit label limit creates a display-only truncated copy.

`bin/howdone.cjs` only selects native TypeScript or the bundled `tsx` loader and invokes `src/boot/main.ts`. It contains no business logic.

## Development

```bash
npm run typecheck
npm test
npm run test:bdd
npm run test:all
npm run pack:check
```

TDD tests use TypeScript and Node's native `node:test` API under `test/tdd/`. BDD tests use Cucumber features under `test/bdd/` and invoke the real `bin/howdone.cjs -> src/boot/main.ts` path. The broad regression suite covers the fixed acceptance sample, AST boundaries, implicit nodes, recursive progress, Unicode labels, display options, CLI modes, errors, and file-path handling.

The first published alpha is `howdone@0.0.1` on the `alpha` dist-tag. Later
formal versions are published from `vX.Y.Z` Git tags only after the reusable CI
workflow succeeds; the Release workflow derives the npm version from that tag.
