# HowDone development guide

## Project intent

HowDone is a local Node.js/TypeScript command-line application that answers “How done is this Markdown?” by analyzing hierarchical task-list progress. It must not edit or upload the input file, require a browser, or require a network connection.

The executable path is intentionally small:

```text
bin/howdone.cjs -> src/boot/main.ts -> src/application/analyze.ts
```

`bin/howdone.cjs` may only select native TypeScript execution on Node.js 23+ or the bundled `tsx` loader on Node.js 18.18–22. It must not contain domain or parsing behavior.
Modules loaded through the native Node.js TypeScript path must use erasable
TypeScript syntax. Do not use parameter properties, enums, namespaces, or
other TypeScript constructs that require a transform at runtime.

## Architecture ownership

Keep the `src` root free of loose business modules. New implementation files belong in one of these areas:

- `src/core/`: contracts and framework-independent behavior. Keep source token types under `core/source`, AST contracts and normalization under `core/ast`, progress definitions and calculations under `core/progress`, and display-option policy under `core/config`.
- `src/adapters/`: implementations of core ports. Unified/Remark, Node `path`/`fs`, `Intl.Segmenter`, terminal output, and JSON output belong here.
- `src/application/`: CLI argument handling and the Markdown progress analysis use case. It composes ports but does not own external library parsing or filesystem details.
- `src/boot/`: the composition root. Construct the default adapters and call the application.

The source pipeline is a contract, not a shortcut:

```text
source text
  -> MarkdownLexer -> LexerToken[]
  -> MarkdownAstParser -> RootAst
  -> progress tree builder -> CheckboxNode[]
  -> completion metrics -> ProgressResult
  -> TerminalOutputPort or JsonOutputPort
```

Contracts belong in `src/core/**/types.ts` and `src/core/ports.ts`. Contract modules must not import adapters, CLI code, Node filesystem APIs, or terminal libraries. The default Markdown adapter delegates syntax recognition to Unified/Remark and maps its result into local typed tokens; do not replace it with regular-expression parsing.

Path handling must be delegated to Node's platform-native `node:path` and `node:fs` APIs. Do not write a foreign-OS path parser or translate Windows syntax on POSIX (or POSIX syntax on Windows). The adapter resolves the string using the runtime on the target system.

## Test taxonomy

TDD and BDD are separate evidence layers:

- `test/tdd/` verifies each pipeline boundary and intermediate contract: source to lexer tokens, lexer tokens to AST, AST to statistical tree, tree to completion metrics, and metrics to terminal/JSON output.
- `test/bdd/features/` and `test/bdd/steps/` verify user-visible command behavior through the real `bin/howdone.cjs -> boot` path. These scenarios cover final stdout, JSON, exit status, paths, options, and errors.
- `test/index.test.ts` is the broad regression suite containing the fixed acceptance matrix and Unicode/display-option edge cases.

A final result test cannot replace a stage test. When changing a stage, update that stage's TDD test and add or update a BDD scenario if the user-visible behavior changes. Keep assertions on intermediate token/AST/result shapes explicit.

## User-visible contract

- CLI output is English, even when the Markdown source is not.
- The default mode prints only the overall percentage; `--tree`, `--details`, and `--json` are explicit alternate modes and mutually exclusive.
- JSON output contains numeric `ProgressResult` fields and raw labels by default. An explicit label limit may request grapheme-safe truncation in JSON without mutating the core result.
- Percentage output defaults to two decimal places, decimal output to four; trailing zeroes are hidden unless explicitly requested. Percentage precision may be zero; decimal precision must be at least one.
- `--tree` and `--details` must display implicit nodes and derived percentages.
- Invalid paths, extensions, options, modes, reads, and parser failures return a non-zero exit code with a clear stderr message.

## Verification gate

Run the following before handoff:

```bash
npm run typecheck
npm test
npm run test:bdd
npm run pack:check
```

`npm test` is the TDD gate. `npm run test:bdd` is the black-box behavior gate. `npm run test:all` runs typecheck, TDD, and BDD together.

The project has no separate lint or compiled build command: the runtime package
ships the TypeScript source and its execution shim. CI therefore runs the real
checks that exist—`npm ci`, typecheck, TDD, BDD, and `npm pack --dry-run`—without
adding no-op lint/build aliases. `.github/workflows/ci.yml` is reusable by the
tag-based release workflow; publishing is permitted only after that CI job
succeeds.

## Documentation ownership

- `README.md` is the npm-facing user quickstart: explain that HowDone is a CLI,
  how to install it, how to run it, and what its output/options mean. Keep
  internal architecture, test commands, CI matrices, release automation,
  dependency maintenance, and contribution rules out of the README.
- `LICENSE` records the Apache License 2.0 terms and 2026 copyright notice.
- `scripts/update-version-badge.mjs` generates `version_badge.json` from the
  package version used by the README badge.
- `docs/architecture.md` records stage contracts and dependency direction.
- `docs/api.md` records the public core/application API.
- `docs/development.md` records test-first workflow, development commands, CI,
  release automation, and maintenance details.
- `CONTRIBUTING.md` records commit, pull request, and handoff requirements.
- `AGENTS.md` records implementation constraints and test taxonomy.

When architecture, API, or development behavior changes, update the matching document in the same change.
