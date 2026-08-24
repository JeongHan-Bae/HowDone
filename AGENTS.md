# HowDone development guide

## Project intent

HowDone is a local Node.js/TypeScript command-line application that answers “How done is this Markdown?” by analyzing hierarchical task-list progress. It must not edit or upload the input file, require a browser, or require a network connection.

## Mandatory contribution boundary

[`CONTRIBUTING.md`](CONTRIBUTING.md) is the mandatory contribution contract.
Before changing or committing anything, read and follow its development,
verification, pre-commit harness, commit-message, review, and handoff rules.
The required final boundary before a commit is
`npm run verify:precommit`; a partial check or a bypassed harness is not
equivalent. The `Commit messages` section in `CONTRIBUTING.md` is authoritative
for commit wording, and its development and review sections are authoritative
for contribution procedure. Do not invent a second commit format here.

The executable path is intentionally small:

```text
bin/howdone.cjs -> src/boot/main.ts -> src/application/analyze.ts
```

`bin/howdone.cjs` may only select native TypeScript execution on Node.js 23+ or the bundled `tsx` loader on Node.js 18.18–22. It must not contain domain or parsing behavior.
Every `.cjs` and `.mjs` file must declare its types at its own boundary: use
`// @ts-check` with JSDoc typedefs and annotations for JavaScript files, and
TypeScript interfaces or type aliases for `.ts` maintenance scripts. These
repository scripts remain outside the application `tsconfig.json` include
boundary; their file extension must not make them application source.
Modules loaded through the native Node.js TypeScript path must use erasable
TypeScript syntax. Do not use parameter properties, enums, namespaces, or
other TypeScript constructs that require a transform at runtime.

## Architecture ownership

Keep the `src` root free of loose business modules. New implementation files belong in one of these areas:

- `src/core/`: contracts and framework-independent behavior. Keep source token types under `core/source`, AST contracts and normalization under `core/ast`, YAML/TOML semantic classification under `core/frontmatter`, progress definitions and calculations under `core/progress`, and display-option policy under `core/config`.
- `src/adapters/`: implementations of core ports. Unified/Remark, YAML/TOML value decoding, Node `path`/`fs` and runtime behavior, `Intl.Segmenter`, terminal output, and JSON output belong here.
- `src/application/`: CLI argument handling and the Markdown progress analysis use case. It composes ports but does not own external library parsing or filesystem details.
- `src/boot/`: the composition root. Construct the default adapters and call the application.

The source pipeline is a contract, not a shortcut:

```text
source text
  -> MarkdownLexer -> LexerToken[]
  -> MarkdownAstParser -> DocumentAst
       -> Markdown body RootAst -> progress tree builder -> Markdown ProgressResult
       -> YAML/TOML FrontmatterAst -> value adapter -> core classifier -> frontmatter ProgressResult
  -> separate or explicitly merged ProgressReport
  -> TerminalOutputPort or JsonOutputPort
```

Contracts belong in `src/core/**/types.ts` and `src/core/ports.ts`. Contract modules must not import adapters, CLI code, Node filesystem APIs, or terminal libraries. Adapters must not import application or boot code. The default Markdown adapter delegates syntax recognition to Unified/Remark and maps its result into local typed tokens; the YAML/TOML adapter only decodes syntax; the core classifier owns semantic recognition. Do not replace the Markdown adapter with regular-expression parsing.

Path handling must be delegated to Node's platform-native `node:path` and `node:fs` APIs. Do not write a foreign-OS path parser or translate Windows syntax on POSIX (or POSIX syntax on Windows). The adapter resolves the string using the runtime on the target system.

## Platform-neutral runtime rules

Prefer platform-neutral Node.js and npm interfaces whenever they express the
required behavior. Do not branch on `process.platform`, `process.arch`, the
Node `os` platform APIs, Windows command shims, or shell-specific environment
variables when Node can delegate the behavior to the runtime. For example,
invoke npm as `npm` through Node's shell option instead of selecting
`npm.cmd`, `cmd.exe`, or another operating-system command name in application
or maintenance code.

The default assumption is that the current runtime provides the correct
platform behavior. A platform-specific branch is permitted only when a
reproducible platform defect makes the neutral interface insufficient; such a
branch requires a focused test on the affected platform, an explanation in
the change documentation, and explicit review. Do not add a silent fallback or
an untested operating-system branch.

`npm run check:platform` is part of the pre-commit harness. It parses source,
test, launcher, and maintenance files with the TypeScript AST and rejects
access to runtime platform APIs such as `process.platform`, `process.arch`,
`os.platform()`, and `os.arch()`, including escaped property names and import
aliases. Ordinary strings and labels are not platform API evidence. A finding
is a hard failure until the code is rewritten through a platform-neutral
interface or the exceptional case is explicitly reviewed.

## Test taxonomy

TDD and BDD are separate evidence layers. Detailed fixture construction,
independent-oracle rules, semantic Markdown generation, native path testing,
step design, and test verification live in [`test/AGENTS.md`](test/AGENTS.md).
This section only records the repository-level taxonomy:

- `test/tdd/` verifies each pipeline boundary and intermediate contract: source to lexer tokens, lexer tokens to AST, AST to statistical tree, tree to completion metrics, and metrics to terminal/JSON output.
- `test/bdd/features/` and `test/bdd/steps/` verify user-visible command behavior through the real `bin/howdone.cjs -> boot` path. These scenarios cover final stdout, JSON, exit status, paths, options, and errors.
- TDD inputs and independent intermediate oracles belong under
  `test/tdd/fixtures/`; BDD source-only inputs belong under
  `test/bdd/fixtures/`. Do not create a shared fixture merely because two
  layers happen to use similar source text. The detailed BDD feature and step
  ownership is documented in [`test/AGENTS.md`](test/AGENTS.md).
- `test/index.test.ts` is the broad regression suite containing the fixed acceptance matrix and Unicode/display-option edge cases.

A final result test cannot replace a stage test. When changing a stage, update that stage's TDD test and add or update a BDD scenario if the user-visible behavior changes. Keep assertions on intermediate token/AST/result shapes explicit. Follow [`test/AGENTS.md`](test/AGENTS.md) for the detailed implementation rules.

## User-visible contract

The detailed user contract belongs to [`README.md`](README.md), and the
complete source and output contract belongs to [`docs/syntax.md`](docs/syntax.md).
Preserve these implementation invariants:

- CLI output and diagnostics are English, even when source labels are not.
- The default mode is the overall percentage; `--tree`, `--details`, and
  `--json` are explicit mutually exclusive alternatives.
- JSON is a real data document with raw numeric fields and complete labels by
  default; display-only truncation must not mutate core progress results.
- Terminal defaults are percentage precision `2`, decimal precision `4`,
  hidden trailing zeroes, and 10-grapheme tree/details labels.
- Warnings use the process warning port; `--silent` suppresses them and
  `--strict` upgrades them to errors. Hard option conflicts remain errors.
- Invalid paths, extensions, options, modes, reads, and parser failures return
  a non-zero status with a clear stderr message.

## Verification gate

The mandatory pre-commit boundary is `npm run verify:precommit`, as defined in
[`CONTRIBUTING.md`](CONTRIBUTING.md). It covers the application and maintenance
typechecks, TDD and BDD suites, runtime and full dependency audits, package
contents, platform-neutral source checks, and staged/unstaged Git checks. Do
not reproduce the command sequence here; CONTRIBUTING owns that detail.

`npm test` is the TDD gate. `npm run test:bdd` is the black-box behavior gate. `npm run test:all` runs typecheck, TDD, and BDD together.

The project has no separate lint or compiled build command: the runtime package
ships the TypeScript source and its execution shim. CI therefore runs the real
checks that exist—`npm ci`, application and maintenance typechecks, the
platform API check, TDD, BDD, audits, and `npm pack --dry-run`—without
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
  package version used by the README badge. `scripts/check-package-contents.ts`
  verifies the npm dry-run file allowlist, and
  `scripts/check-platform-neutral.ts` rejects unreviewed platform API access.
  These are repository maintenance scripts and are not part of the published
  package.
- `docs/architecture.md` records stage contracts and dependency direction.
- `docs/api.md` records the public core/application API.
- `docs/development.md` records test-first workflow, development commands, CI,
  release automation, and maintenance details.
- `docs/syntax.md` is the standalone user-facing syntax contract and is included
  in the published package. It may not link to repository or developer docs.
- `CONTRIBUTING.md` records the mandatory pre-commit harness, development
  procedure, commit-message format, pull request, and handoff requirements.
- `AGENTS.md` records implementation constraints and test taxonomy.
- `test/AGENTS.md` records detailed TDD, BDD, fixture, path, output, and test
  verification rules.

Any repository tree shown in architecture or test documentation must preserve
the repository's GitHub directory order. A documentation tree may omit a
subtree when the document does not own it, but it must not reorder the entries
it does show.

When architecture, API, or development behavior changes, update the matching document in the same change.
