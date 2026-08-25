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

The executable paths are intentionally small. Repository checks use the
original TypeScript runtime path, while the package bin points directly to the
compiled entry:

```text
bin/howdone.cjs      -> src/boot/main.ts -> src/application/analyze.ts
howdone-cli bin      -> packages/cli/dist/boot/cli-main.js -> howdone/application
```

`bin/howdone.cjs` preserves the source checkout behavior: Node.js 23 or later
uses native TypeScript execution and Node.js 18.18 through 22 uses the bundled
`tsx` loader. The published `howdone` package contains only the compiled
core/application API and has no runtime dependencies or bin. The published
`howdone-cli` package maps its executable directly to the compiled artifact,
depends on the matching core package and adapter libraries, and does not ship
the source tree. The source launcher must not contain domain or parsing
behavior.
Every `.cjs` and `.mjs` file must declare its types at its own boundary: use
`// @ts-check` with JSDoc typedefs and annotations for JavaScript files, and
TypeScript interfaces or type aliases for `.ts` maintenance scripts. These
repository scripts remain outside the application `tsconfig.json` include
boundary; their file extension must not make them application source.
The published package contract is compiled JavaScript. The source runtime is
for repository development and source-path verification; do not make a second
domain implementation for it.

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

TDD, BDD, and published-package consumer tests are separate evidence layers.
Detailed fixture construction, independent-oracle rules, semantic Markdown
generation, native path testing, step design, and test verification live in
[`test/AGENTS.md`](test/AGENTS.md).
This section only records the repository-level taxonomy:

- `test/tdd/` verifies each pipeline boundary and intermediate contract: source to lexer tokens, lexer tokens to AST, AST to statistical tree, tree to completion metrics, and metrics to terminal/JSON output.
- `test/bdd/features/` and `test/bdd/steps/` verify user-visible command behavior through the real source launcher and, for compiled parity, the compiled package entry. These scenarios cover final stdout, JSON, exit status, paths, options, and errors.
- `test/package/` verifies the published core package as a consumer would use it. It stages the public entry and supplies test-owned implementations of the published ports; its metadata test also checks the CLI package relationship.
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
typechecks, TDD, BDD, and published-package consumer suites, runtime and full
dependency audits, package contents, platform-neutral source checks, and
staged/unstaged Git checks. Do not reproduce the command sequence here;
CONTRIBUTING owns that detail.

`npm test` is the unchanged source TDD gate. `npm run test:bdd` is the
unchanged source black-box behavior gate. `npm run test:compiled` runs the
compiled TDD, published-package consumer, and the same BDD features against
the compiled CLI.
`npm run test:all` runs both source and compiled gates together.

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
TypeScript execution; on Node.js 18.18–22 they use the bundled `tsx` loader.
The package BDD steps invoke the same staged compiled application entry. This
keeps the consumer test fast while proving that a user can compose the
published compiled package through its public ports. Cucumber remains test
orchestration infrastructure; it is not part of the CLI runtime dependency
proof.

The project has real TypeScript build commands. They emit the dependency-free
core under `packages/core/dist/`, the CLI under `packages/cli/dist/`, rewrite
relative TypeScript imports to `.js`, and emit declarations for the public
core API. CI runs the source checks, the compiled TDD and BDD checks, the
published-package consumer suite, and both package-content checks from the
same workspace. `.github/workflows/ci.yml` is reusable by the tag-based release
workflow; publishing is permitted only after that CI job succeeds.

Final releases use `vX.Y.Z`, `vX.Y.Z-cli`, or `vX.Y.Z-core` tags. The release
validator requires matching core/CLI major and minor versions, an exact CLI
dependency on the current core version, synchronized lockfile entries, and
unused npm versions for every selected target before any publish step. The
workflow statically typechecks this release-only validator, then records a
successful tag as a GitHub Release so an already completed release cannot be
reused. These version and registry checks run only for a release tag, not in
the ordinary pre-commit harness.

## Documentation ownership

- `README.md` is the npm-facing user quickstart: explain that HowDone is a CLI,
  how to install it, how to run it, and what its output/options mean. Keep
  internal architecture, test commands, CI matrices, release automation,
  dependency maintenance, and contribution rules out of the README.
- `LICENSE` records the Apache License 2.0 terms and 2026 copyright notice.
- `scripts/update-version-badge.mjs` generates `version_badge.json` from the
  core package version used by the README badge. `scripts/check-package-contents.ts`
  verifies the npm dry-run file allowlist, and
  `scripts/check-platform-neutral.ts` rejects unreviewed platform API access.
  These are repository maintenance scripts and are not part of the published
  package.
- `scripts/sync-package-artifacts.mjs` copies the root `LICENSE`, `docs/api.md`,
  and `docs/syntax.md` into the package staging directories before a build or
  package check. Those copies are generated and ignored; the root files remain
  the canonical documentation and license sources.
- `scripts/validate-release.mjs` validates stable release tags, package
  versions, exact core dependency metadata, lockfile synchronization, and npm
  duplicate targets before the release workflow publishes.
- `scripts/run-compiled-tests.mjs` builds the test artifacts, stages both
  compiled packages with production dependencies only, and runs compiled
  parity checks from that isolated installation.
- `tsconfig.build.json` defines the runtime JavaScript and declaration build;
  `tsconfig.test-build.json` defines the ignored compiled-test verification
  output. Build output is never committed.
- `docs/architecture.md` records stage contracts and dependency direction.
- `docs/api.md` records the public core/application API.
- `docs/development.md` records test-first workflow, development commands, CI,
  release automation, and maintenance details.
- `docs/syntax.md` is the standalone user-facing syntax contract and is included
  in the published `howdone-cli` package. It may not link to repository or
  developer docs.
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
