# HowDone development guide

## Project intent

HowDone is a local Node.js/TypeScript project published in two parts: the
`howdone` npm package is the framework-independent hexagonal core, and
`howdone-cli` is the primary product and command executor. Its installed
command-line names are `howdone` and `howdone-cli`, with `howdone` as the
primary command. It answers "How done is this Markdown?" by
analyzing hierarchical task-list progress. It must not edit or upload the input
file, require a browser, or require a network connection.

## Mandatory contribution boundary

[`CONTRIBUTING.md`](CONTRIBUTING.md) is the mandatory contribution contract.
Before changing or committing anything, read and follow its development,
verification, pre-commit harness, commit-message, review, and handoff rules.
The required final boundary before a commit is
`npm run verify:precommit`; a partial check or a bypassed harness is not
equivalent. The `Commit messages` section in `CONTRIBUTING.md` is authoritative
for commit wording, and its development and review sections are authoritative
for contribution procedure. Do not invent a second commit format here.

### Execution paths

The executable paths are intentionally small. Repository checks use the
original TypeScript runtime path, while the package bin points directly to the
compiled entry:

```text
bin/howdone.cjs      -> src/boot/main.ts -> src/application/analyze.ts
howdone-cli bins     -> packages/cli/dist/boot/cli-main.js -> howdone/application
```

### Source launcher

`bin/howdone.cjs` preserves the source checkout behavior: Node.js 23 or later
uses native TypeScript execution and Node.js 18.18 through 22 uses the bundled
`tsx` loader. The source launcher must not contain domain or parsing behavior.

### Published packages

The published `howdone` package is the hexagonal core and contains only the
compiled core/application API; it has no runtime dependencies or bin.

The published `howdone-cli` package is the primary product. It maps the
`howdone` command directly to the compiled artifact, depends on the matching
core package and adapter libraries, exposes both command names, and does not
ship the source tree.

### Maintenance script types

Every `.cjs` and `.mjs` file must declare its types at its own boundary: use
`// @ts-check` with JSDoc typedefs and annotations for JavaScript files, and
TypeScript interfaces or type aliases for `.ts` maintenance scripts. These
repository scripts remain outside the application `tsconfig.json` include
boundary; their file extension must not make them application source. The
`scripts/typecheck-maintenance.ts` checker accepts one folder, discovers the
TypeScript and JavaScript files in it through the TypeScript system API, and
checks them with the compiler API. `npm run typecheck:maintenance` passes the
repository root, including the release validator script.

### Public TypeScript documentation

New or changed public TypeScript interfaces, type definitions, and methods must
use Doxygen-style JSDoc comments that TypeScript can recognize. Use the common
tags `@brief`, `@details`, `@param`, and `@returns` (and `@deprecated` when it
applies). `@details` is optional and contains only explanatory prose; it is not
a container for `@param`, `@returns`, or `@deprecated` tags. Keep the core
behavior, implementation/provider responsibility, and the behavior when an
optional member is absent as separate plain-text paragraphs inside one
`@details` block, with blank lines between paragraphs. Omit `@details` when no
explanatory prose is needed.
Do not use unsupported section tags such as `@section` or `@par`, and do not
link type-only declarations as values or namespaces; use plain backtick names
when a TypeScript-safe link is unavailable.

### Compiled package contract

The published package contract is compiled JavaScript. The source runtime is
for repository development and source-path verification; do not make a second
domain implementation for it.

## Architecture ownership

Keep the `src` root free of loose business modules. New implementation files belong in one of these areas:

- `src/core/`: contracts and framework-independent behavior. Keep source token types under `core/source`, AST contracts
  and normalization under `core/ast`, YAML/TOML semantic classification under `core/frontmatter`, progress definitions
  and calculations under `core/progress`, display-option policy under `core/config`, and the public standard Port
  implementation entry under `core/std.ts`.
- `src/adapters/`: implementations of core ports. Unified/Remark, YAML/TOML value decoding, Node `path`/`fs` and runtime
  behavior, `Intl.Segmenter`, terminal output, and JSON output belong here.
- `src/application/`: CLI argument handling and the Markdown progress analysis use case. It composes ports but does not
  own external library parsing or filesystem details.
- `src/boot/`: the composition root. Construct the default adapters and call the application.

The source pipeline is a contract, not a shortcut:

```text
source text
  -> MarkdownLexer -> LexerToken[]
  -> MarkdownAstParser -> DocumentAst
  -> Markdown body RootAst -> progress tree builder -> Markdown ProgressResult
  -> YAML/TOML FrontmatterAst -> value adapter -> core classifier -> frontmatter ProgressResult
  -> separate or explicitly merged ProgressReport
  -> TerminalOutputPort.render(report) or JsonOutputPort.render(report)
```

Contracts belong in `src/core/**/types.ts` and `src/core/ports.ts`. Contract modules must not import adapters, CLI code,
Node filesystem APIs, or terminal libraries. Adapters must not import application or boot code. The default Markdown
adapter delegates syntax recognition to Unified/Remark and maps its result into local typed tokens; the YAML/TOML
adapter only decodes syntax; the core classifier owns semantic recognition. Do not replace the Markdown adapter with
regular-expression parsing.

The `core` subfolders contain framework-independent contracts and fixed policy,
plus implementations for replaceable Ports. The public `howdone/std` entry
exposes `TypedAstParser`, the standard implementation for the replaceable AST
parser Port; the root `howdone` entry exports the complete Core API. Ports
whose behavior depends on external syntax, host I/O, or terminal behavior
remain replaceable and are supplied by the application composition root.

Core exposes one `TerminalOutputPort` for progress reports, the application-
owned `InfoDocument`, and Core warning and error documents. All four render
methods return the port's one exact `TOutput` type, and the optional `print`
member accepts that same value. A Port implementation may provide terminal
enhancement behavior only when it supports TTY-aware output and can judge the
TTY state of its own target stream. The implementation owns report-to-output
conversion, Help presentation, color selection, and Pager behavior; Core
forwards the document and requested target/modes without inspecting TTY state.
If `print` is absent, Core writes the value's `writeTo` representation through
`TerminalIO.stdout` for reports and information documents, or `TerminalIO.stderr`
for warnings and errors. `InfoDocument` is an empty Core marker; the CLI
supplies its concrete information documents and provider. There is no separate
WarningPort; warning and error meanings use this same terminal output port.

Path handling must be delegated to Node's platform-native `node:path` and `node:fs` APIs. Do not write a foreign-OS path
parser or translate Windows syntax on POSIX (or POSIX syntax on Windows). The adapter resolves the string using the
runtime on the target system.

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

`npm run check:static` is the broad static-check aggregate. It runs the
application and maintenance typechecks together with the independent platform,
code-ASCII, and Git whitespace checks. `npm run check:platform`
parses source, test,
launcher, and maintenance files with the
TypeScript AST and rejects access to runtime platform APIs such as
`process.platform`, `process.arch`,
`os.platform()`, and `os.arch()`, including escaped property names and import
aliases. Ordinary strings and labels are not platform API evidence. A finding
is a hard failure until the code is rewritten through a platform-neutral
interface or the exceptional case is explicitly reviewed.

Code files, including generated JavaScript and TypeScript files, must remain
ASCII-only. Runtime Unicode output in code must therefore be represented by
ASCII escapes. The code-only checker excludes documentation, fixtures,
configuration, text assets, repository metadata, dependencies, IDE state, and
the ignored temporary workspace. It is an independent component of
`check:static`, not a nested platform check.

Documentation must not contain emoji or CJK text. Unicode Box Drawing
characters are allowed only when a documentation file presents a directory or
file tree; they are display notation, not source code.

## Test taxonomy

TDD, BDD, and published-package consumer tests are separate evidence layers.
Detailed fixture construction, independent-oracle rules, semantic Markdown
generation, native path testing, step design, and test verification live in
[`test/AGENTS.md`](test/AGENTS.md).
This section only records the repository-level taxonomy:

- `test/tdd/` verifies each pipeline boundary and intermediate contract: source to lexer tokens, lexer tokens to AST,
  AST to statistical tree, tree to completion metrics, and metrics to terminal/JSON output.
- `test/bdd/features/` and `test/bdd/steps/` verify CLI behavior through a real source or compiled executable. These
  scenarios cover final stdout, JSON, exit status, paths, options, and errors; they do not inject Core ports.
- `test/package/tdd/` verifies the published Core application as a consumer would use it. It stages the public entries,
  supplies test-owned implementations of replaceable ports, and exercises standard Core implementations where they
  exist; its metadata test also checks the CLI package relationship.
- `test/package/bdd/` verifies the published Core application as a consumer BDD suite. It uses the public Core and
  standard entries with consumer-owned fixture adapters, including the complete 64-case output capability/request matrix. It is
  separate from `test/bdd/` and must not share CLI step definitions or CLI adapters with it.
- `npm run test:local-install` verifies the compiled Core and CLI as locally installed npm packages in a temporary
  sandbox, including both `howdone` and `howdone-cli` bins.
- TDD inputs and independent intermediate oracles belong under
  `test/tdd/fixtures/`; BDD source-only inputs belong under
  `test/bdd/fixtures/`. Do not create a shared fixture merely because two
  layers happen to use similar source text. The detailed BDD feature and step
  ownership is documented in [`test/AGENTS.md`](test/AGENTS.md).
- `test/index.test.ts` is the broad regression suite containing the fixed acceptance matrix and Unicode/display-option
  edge cases.

A final result test cannot replace a stage test. When changing a stage, update that stage's TDD test and add or update a
BDD scenario if the user-visible behavior changes. Keep assertions on intermediate token/AST/result shapes explicit.
Follow [`test/AGENTS.md`](test/AGENTS.md) for the detailed implementation rules.

## User-visible contract

The detailed user contract belongs to [`README.md`](README.md). The complete
source and result language contract belongs to [`docs/syntax.md`](docs/syntax.md);
the CLI command and parameter contract belongs to [`docs/guide.md`](docs/guide.md).
Preserve these implementation invariants:

- CLI output and diagnostics are English, even when source labels are not.
- The CLI has four independent command forms: Markdown analysis,
  `--help`, `--version`, and `--dependencies`. The last three do not accept a
  Markdown path or primary analysis options; global output options remain
  valid for every command form. `--dependencies` lists the CLI runtime
  dependencies without entering the Markdown pipeline.
- The default mode is the overall percentage for one source component; two or
  more components are rendered as source-labelled sections. `--tree`,
  `--details`, and `--json` are explicit mutually exclusive alternatives.
- JSON is a real data document with raw numeric fields and complete labels by
  default; display-only truncation must not mutate core progress results.
- Terminal defaults are percentage precision `2`, decimal precision `4`,
  hidden trailing zeroes, and 10-grapheme tree/details labels. Information
  stdout (Help, version, and dependencies), report stdout, and JSON stdout use
  the default TTY Pager; stderr diagnostics do not page. Argument usage
  guidance, when present, is part of the same error document on stderr.
- Warnings use the semantic terminal stderr destination; interactive CLI stderr
  colors warnings yellow and errors red, while redirected stderr remains
  plain. Help and diagnostics use semantic `TerminalOutputLine` values, and
  JSON stdout remains data-only for pipelines.
  `--silent` suppresses warnings and `--strict` upgrades them to errors. Hard
  option conflicts remain errors.
- Invalid paths, extensions, options, modes, reads, and parser failures return
  a non-zero status with a clear stderr message.

## Verification gate

The mandatory pre-commit boundary is `npm run verify:precommit`, as defined in
[`CONTRIBUTING.md`](CONTRIBUTING.md). It covers TDD, BDD, and published-package
consumer suites, the production and full dependency audits, and package
contents. It finishes with the static-check aggregate, which owns the
typechecks, policy checks, and staged and unstaged Git checks.
It begins with `npm run clean`, which removes ignored generated build, test, coverage,
and TypeScript cache artifacts so stale package output cannot satisfy a check.
Run this one aggregate command before a commit; do not repeat its internal
steps separately.

CI runs the same check sequence on Ubuntu, macOS, and Windows across the Node.js
18.x, 20.x, 22.x, 24.x, and 26.x matrix. The matrix versions are compatibility
evidence, not alternate test contracts. Node test-runner TypeScript entrypoints
use native Node.js on 23+ and the bundled `tsx` loader on 18.18-22; compiled
JavaScript tests run directly with Node.js. Do not remove a high-version job or
hide a version-specific failure behind a different assertion or test
configuration. Workflow-level concurrency cancels an unfinished older run for
the same branch or pull-request ref when a newer run starts, so slow matrix
rows do not accumulate behind newer changes.

`npm test` is the source TDD gate. `npm run test:bdd` is the source black-box
behavior gate. `npm run test:compiled` runs the
compiled TDD, published-package consumer, and the same BDD features against
the compiled CLI. `npm run test:local-install` installs the two compiled
packages from local package paths into a separate temporary sandbox, then runs
the package consumer, BDD, and both installed CLI bin aliases from that
installation. `npm run test:all` runs the source, compiled, and local-install
gates together.

Compiled CLI verification first uses development tools to build the artifacts,
then stages both compiled packages and the CLI's resolved production dependency
closure in a temporary isolated project. The compiled TDD suite and compiled
CLI child processes run from that production-only staging, so a passing CLI
result cannot be supplied by `tsx`, Cucumber, TypeScript, or another
development dependency.

The published-package consumer suite is a separate sandbox test. It stages the
compiled core as `node_modules/howdone`, copies the repository's already-
resolved dependencies into that sandbox, and runs test-owned consumer code
without `npm install`. It also checks the core/CLI manifest version and
dependency relationship. On Node.js 23+ the consumer TDD files use native
TypeScript execution; on Node.js 18.18-22 they use the bundled `tsx` loader.
The package BDD steps invoke the same staged compiled application entry. This
keeps the consumer test fast while proving that a user can compose the
published compiled package through its public ports. Cucumber remains test
orchestration infrastructure; it is not part of the CLI runtime dependency
proof. The local-install suite is a different sandbox: npm installs the
compiled Core and CLI from local paths, resolves only the CLI's production
dependencies, and the tests execute the installed package entries rather than
the staged files.

The project has real TypeScript build commands. They emit the dependency-free
core under `packages/core/dist/`, the CLI under `packages/cli/dist/`, rewrite
relative TypeScript imports to `.js`, and emit declarations for the public
core API. CI runs the source checks, the compiled TDD and BDD checks, the
published-package consumer suite, the local-install sandbox suite, and both
package-content checks from the same workspace. `.github/workflows/ci.yml` is
reusable by the tag-based release workflow; publishing is permitted only after
that CI job succeeds.

Final releases use `vX.Y.Z`, `vX.Y.Z-cli`, or `vX.Y.Z-core` tags. The release
validator requires matching core/CLI major and minor versions, an exact CLI
dependency on the current core version, synchronized lockfile entries, and
unused npm versions for every selected target before any publish step. The
workflow validates this release-only validator and publishes only unused npm
targets. GitHub Release pages are separate release content and do not gate
npm publication; the npm registry checks are authoritative. These
version and registry checks run only for a release tag or an explicitly
dispatched release run, not in the ordinary pre-commit harness.

## Documentation ownership

- `README.md`: npm-facing quickstart. Describe the two packages, installation,
  the four CLI commands, and user-visible output. Do not put architecture,
  tests, CI, release, or contribution procedure here.
- `LICENSE`: Apache License 2.0 and the 2026 copyright notice.
- Canonical package files are the root `LICENSE`, `docs/api.md`,
  `docs/guide.md`, and `docs/syntax.md`. `scripts/sync-package-artifacts.mjs`
  copies them to
  `packages/core/` and `packages/cli/` before builds and package checks:

  ```text
  docs/api.md    -> packages/core/docs/api.md
  docs/guide.md  -> packages/cli/docs/guide.md
  docs/syntax.md -> packages/cli/docs/syntax.md
  LICENSE        -> both package roots
  ```

  The package copies are generated and ignored; never edit them directly or
  allow them to differ from the root files.
- Published package docs (`docs/api.md`, `docs/guide.md`, and `docs/syntax.md`) must be
  self-contained and must not link to other repository files. This avoids
  broken links after npm publishes the copied document.
- The GitHub-versus-relative link rule applies only to
  `packages/core/README.md` and `packages/cli/README.md`:
  - Relative links may target files shipped in that package at the same path,
    such as its copied `docs/...` file or `LICENSE`.
  - Links to any other repository, project, or cross-package file must use its
    explicit GitHub URL, including the root `README.md`.
  npmjs.com resolves an allowed package-relative link to the repository's
  same-named path, so the shipped copied file must match the root source.
- The root `README.md` may link to any repository or external location. The
  `docs/architecture.md`, `docs/development.md`, `AGENTS.md`, `test/README.md`,
  `test/AGENTS.md`, and `CONTRIBUTING.md` are also not subject to the package
  README link rule.
- `scripts/node-test-runtime.mjs` and `scripts/run-source-tests.mjs` select the
  Node.js test runner for source and published-consumer TypeScript tests.
  `scripts/update-version-badge.mjs` generates `version_badge.json` from the
  Core version and `version_badge_cli.json` from the CLI version. These two
  generated badges are release metadata, not application or package code; the
  independent badge workflow owns their commits.
  `scripts/check-cli-help.ts`, `scripts/check-package-contents.ts`,
  `scripts/check-platform-neutral.ts`, `scripts/typecheck-maintenance.ts`,
  `scripts/node-test-runtime.mjs`, `scripts/run-source-tests.mjs`,
  `scripts/validate-release.mjs`, and
  `scripts/run-compiled-tests.mjs` are maintenance scripts; none is published
  as application runtime code. `scripts/clean.mjs` removes ignored generated
  build, test, coverage, and TypeScript cache artifacts before the pre-commit
  harness. The Help checker verifies the four CLI command forms, both CLI bin
  names, and every primary-command option and alias.
- `tsconfig.build.json` and `tsconfig.test-build.json` define ignored build
  outputs. Build output is never committed.
- Document ownership:
  - `docs/architecture.md`: architecture and dependency direction.
  - `docs/api.md`: public Core/application API.
  - `docs/development.md`: development, CI, release, and maintenance workflow.
  - `docs/guide.md`: standalone complete CLI usage, command ownership, and
    parameter behavior shipped with `howdone-cli`.
  - `docs/syntax.md`: standalone source and result language contract shipped
    with `howdone-cli`; it must remain self-contained.
  - `CONTRIBUTING.md`: contribution and pre-commit contract.
  - `AGENTS.md`: implementation constraints and test taxonomy.
  - `test/AGENTS.md`: detailed test rules.

Any repository tree shown in architecture or test documentation must preserve
the repository's GitHub directory order. A documentation tree may omit a
subtree when the document does not own it, but it must not reorder the entries
it does show.

When architecture, API, or development behavior changes, update the matching document in the same change.
