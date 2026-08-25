# Contributing

HowDone changes must follow the architecture and user-visible rules in
[`AGENTS.md`](AGENTS.md). Before changing behavior, also read the relevant
sections of [`README.md`](README.md), [`docs/architecture.md`](docs/architecture.md),
[`docs/api.md`](docs/api.md), [`docs/development.md`](docs/development.md),
[`docs/syntax.md`](docs/syntax.md), and
[`test/AGENTS.md`](test/AGENTS.md) when tests are in scope.

HowDone is a local Node.js/TypeScript project published in two parts. The
`howdone` npm package is its framework-independent hexagonal core, while
`howdone-cli` is the primary product and command executor installed as the
`howdone` and `howdone-cli` commands. It reads Markdown task lists, calculates
progress, and writes a result to the terminal or stdout. It must not modify or
upload the source file, require a browser, or require network access.

## Pre-commit harness: mandatory hard boundary

`npm run verify:precommit` is the mandatory interception point before every
commit. A commit is not ready for review, merge, or release until this command
has completed successfully after the final file change. Running only a subset
of its checks is useful while iterating, but it is not a substitute for the
final harness run.

The harness is the repository's hard contribution boundary. It first runs
`npm run clean` to remove ignored generated build, test, coverage, and
TypeScript cache artifacts; this prevents stale compiled packages from
masking a clean-checkout failure. It then runs the
application typecheck, source TDD and source BDD suites, the published-package
consumer suite, compiled TDD and compiled BDD parity suites, typed
maintenance-file checks, the platform-neutral source check, the runtime and
full dependency audits, `scripts/check-package-contents.ts` through
`npm run pack:check`, the rendered CLI Help contract, and both staged and
unstaged Git whitespace checks. The compiled CLI parity suites build with
development tools but execute staged
compiled JavaScript packages from a temporary production-dependency sandbox, so
the CLI under test can resolve only its published `dependencies`. The separate
package consumer suite stages the compiled core as `node_modules/howdone` in an
isolated sandbox and uses the repository's resolved dependencies without an
installation step. The local-install suite creates another isolated sandbox,
installs the compiled Core and CLI from local package paths with npm, and runs
the installed package consumer, BDD, and both CLI bin aliases. Its runtime
installation contains production dependencies only; repository development
dependencies remain outside the application process. The test runner's
Cucumber and TypeScript tooling remains outside the application process. It
does not run `npm run badge:version`;
version-badge generation is a separate maintenance operation and is never a
pre-commit requirement. Do not bypass the harness with
`git commit --no-verify`, skip a failed command, weaken a failing assertion, or
replace the command with an unrecorded local alternative. If a check cannot run
in the current environment, the commit must wait until it can run or the exact
blocker and remaining risk must be recorded for explicit review.

The harness does not install a hidden Git hook. Its command is explicit so the
same boundary can be run locally, in review, and by release automation. CI is
the remote backstop; it must keep the equivalent checks enabled.

The final harness sequence is:

```bash
npm run clean
npm run test:all
npm run typecheck:maintenance
npm run check:help
npm run check:platform
npm audit --omit=dev --audit-level=moderate
npm audit --audit-level=moderate
npm run pack:check
git diff --check
git diff --cached --check
```

## Development principles

Start from the smallest behavior owned by one stage. Keep policy, parsing,
filesystem access, output formatting, and process startup in their respective
boundaries. A passing end-to-end result does not replace tests for the
intermediate contracts.

Keep implementation, tests, and documentation for one contract in the same
change. If a public option, output shape, error, or architecture rule changes,
update the matching documentation and behavior tests before handoff.

## Architecture ownership

The canonical architecture and dependency graph are maintained in
[`docs/architecture.md`](docs/architecture.md). Contributions must preserve
these ownership boundaries:

- `src/core/` owns framework-independent contracts and policy. Source tokens,
  AST types, semantic classification, progress calculation, report composition,
  and display-option policy belong here.
- `src/adapters/` owns external implementations of core ports: Unified/Remark,
  YAML/TOML value decoding, Node `path`/`fs` and runtime behavior,
  `Intl.Segmenter`, terminal output, and JSON output.
- `src/application/` owns CLI argument handling and the progress analysis use
  case; it receives ports and does not instantiate adapters.
- `src/boot/` is the composition root. It constructs the default adapters and
  calls the application.
- `bin/howdone.cjs` is the repository source execution shim only. It keeps the
  original native TypeScript path on Node.js 23+ and the bundled `tsx` path on
  Node.js 18.18–22. The `howdone-cli` bin points directly to the compiled
  `packages/cli/dist/boot/cli-main.js` entry and depends on the matching
  `howdone` core package.

Do not add loose business modules to the `src` root. Core modules must not
import adapters, CLI code, Node filesystem APIs, or terminal libraries; adapters
must not import application or boot code. Default implementations are composed
only in `src/boot/main.ts`.

## Source pipeline rules

The source pipeline must remain observable as separate stages from source
lexing through AST normalization, progress-tree construction, metrics, report
composition, and output. A final CLI result cannot replace a boundary test.
Update the owning TDD contract for every stage change and add BDD evidence when
the user-visible command behavior changes.

The Remark adapter may delegate Markdown recognition to Unified/Remark/GFM,
but the rest of the application must use the local token and AST contracts.
Do not replace the library-backed Markdown parser with a hand-written regular
expression parser.

Path behavior must be delegated to the target runtime's native `node:path` and
`node:fs` implementations. Do not parse foreign operating-system path syntax
or translate Windows paths on POSIX, or POSIX paths on Windows.

Prefer platform-neutral Node.js and npm interfaces over operating-system
branches. Do not select `npm.cmd`, `cmd.exe`, or another platform-specific
command name when Node's shell abstraction can invoke `npm`. Do not branch on
runtime platform or architecture unless a reproducible platform defect makes
the neutral interface insufficient. Such an exception requires a focused
platform test, written rationale, and explicit review. The
`npm run check:platform` harness check rejects unreviewed platform detection.

## Test requirements

The project separates these evidence layers:

- Source TDD and regression: `test/tdd/` proves each pipeline boundary and
  `test/index.test.ts` holds the broad acceptance and edge-case matrix.
- Source BDD: `test/bdd/features/` and `test/bdd/steps/` exercise the real
  source launcher. The runtime is selected explicitly by the test command.
- Published-package consumer: `test/package/` uses staged compiled package
  files and test-owned ports. It proves the public Core/application contract
  without downloading a package from npm.
- Compiled parity: `npm run test:compiled` stages compiled Core and CLI
  packages with only production dependencies, then runs compiled TDD, package
  consumer, and BDD checks.
- Local installation: `npm run test:local-install` installs the compiled Core
  and CLI from local package paths in a temporary sandbox, then runs the
  package consumer, BDD, and both installed bin aliases.

Use TDD for stage behavior and BDD for user-visible behavior. In particular,
mixed CLI options belong in BDD scenarios, not only in `parseArguments` unit
tests. Keep BDD coverage for combinations such as:

- `tree`, `details`, and `json` mode conflicts;
- decimal and explicit percentage formats;
- precision limits, trailing-zero display, and invalid precision;
- format, precision, truncation, and `--no-truncate` used together;
- JSON complete labels by default and explicit JSON label truncation;
- native paths with spaces, display options, and command errors;
- YAML/TOML semantic checklists, separate sections, explicit merging, root-count
  and explicit weighting, and one-sided warning/strict behavior.

BDD steps must invoke the executable in a temporary workspace. Do not replace
the real boot path with injected parsers or renderers in a behavior scenario.
TDD fixtures may inject ports when proving an individual boundary.

## User-visible contract

The user-facing details belong to [`README.md`](README.md), and the complete
input, output, warning, and error contract belongs to
[`docs/syntax.md`](docs/syntax.md). When a public behavior changes, update
those documents and its TDD or BDD evidence in the same change. Keep the stable
baseline intact: the default command prints one percentage, explicit output
modes remain mutually exclusive, JSON remains a real data document, and invalid
input returns a non-zero status.

## Local setup and checks

The source checkout keeps its original runtime choice: Node.js 23+ uses native
TypeScript and Node.js 18.18–22 uses the bundled `tsx` loader. The published
package and published CLI run compiled JavaScript from their package `dist/`
directories and do not
depend on Node's native TypeScript stripping. Earlier Node.js versions than
18.18 are unsupported.

`package-lock.json` is generated by npm from the root and workspace
`package.json` files. Do not edit it by hand. After a manifest or dependency
change, run `npm install --package-lock-only` and review the generated diff.

Install dependencies with:

```bash
npm install
npm run clean
npm run build:cli
```

`npm run clean` removes the repository's ignored generated package builds,
compiled test directory, coverage/output directories, and TypeScript build-info
files. It does not remove `node_modules`, the npm download cache, or source
files. Run it before isolated checks when stale generated output could affect
the result; the mandatory pre-commit harness runs it automatically.

The mandatory final pre-commit gate is the same harness described above:

```bash
npm run verify:precommit
```

Individual development commands and their purposes are documented in the
[development guide](docs/development.md).

For local behavior checks, use the maintained TDD and BDD fixtures:

```bash
npm test
npm run test:bdd
npm run test:package
npm run test:compiled
npm run test:local-install
npm run check:platform
```

The TDD suite owns intermediate contracts and the BDD suite creates temporary
workspaces for the real executable. Do not use an ad hoc source file as a
project check. Version-badge generation is separate maintenance work, as
described in the development guide.

Do not weaken an assertion, skip a failing scenario, or hide a known failure
to make the gate green. If an environment-specific check cannot run, record
the exact command, reason, and remaining risk in the change description.

## Release procedure

Final package releases are created by pushing a stable Git tag and allowing
the Release workflow to publish the selected package. The accepted forms are
`vX.Y.Z` for both packages, `vX.Y.Z-cli` for only `howdone-cli`, and
`vX.Y.Z-core` for only `howdone`. The selected package version must match the
numeric tag, the core and CLI manifests must always share their major and
minor versions, and `howdone-cli` must declare an exact dependency on the
current `howdone` version. The lockfile must agree with both manifests.

The workflow checks the reusable CI gate, rejects an existing GitHub Release,
and checks npm for every selected package version before it publishes anything.
If a selected version is already published, the workflow exits without
publishing either selected target. A successful run creates the GitHub Release
marker after npm publication. When the CLI is selected, immediately before the
CLI step the workflow confirms that the exact required Core version is visible
from npm. This catches a forgotten or unpublished Core version, including for
`-cli` tags where the Core step is intentionally skipped. npm versions are
immutable, so a later retry after a partial external publish is deliberately
rejected and must be handled as a release repair rather than by reusing the
tag.
The release-only validator is statically typechecked in that workflow; its
version and registry checks are not run by the ordinary pre-commit harness.

The stable workflow does not publish prerelease tags. Any bootstrap alpha
publication is a separate manual operation and must not be confused with a
final tag release.

## Staging changes

Stage the complete change set before the final harness; do not select files
one by one:

```bash
git add -A
git restore --staged -- version_badge.json version_badge_cli.json
```

The second command removes only the two generated badges from the index while
leaving their working-tree copies intact. `version_badge.json` and
`version_badge_cli.json` are updated by the independent badge workflow and must
not be included in an ordinary code change.
After staging, inspect `git status --short`: every other staged path must be
intentional. If an unexpected untracked artifact is not part of the project,
add a narrow rule for that artifact to `.gitignore`, then repeat the staging
sequence. Do not use a broad ignore rule to hide source, tests, fixtures, or
documentation.

## Documentation updates

Update documentation in the same change when the corresponding contract
changes:

- `README.md`: installation, usage, and user-visible behavior;
- `docs/syntax.md`: standalone user-facing Markdown and YAML/TOML syntax;
- `LICENSE`: the repository's Apache License 2.0 terms and copyright notice;
- `scripts/update-version-badge.mjs`: generates the Core and CLI package
  versions shown by the README badges in `version_badge.json` and
  `version_badge_cli.json`; it is not a runtime dependency and is not included
  in the published package;
- `scripts/check-package-contents.ts`: verifies the published file allowlist;
  it is a typed repository maintenance script and is not included in the
  published package;
- `scripts/check-platform-neutral.ts`: uses the TypeScript AST to reject
  unreviewed runtime platform API access in source, tests, launchers, and
  maintenance files; it is not included in the published package;
- `docs/api.md`: programmatic types and output contracts;
- `docs/architecture.md`: stage ownership and dependency direction;
- `docs/development.md`: test-first workflow and development commands;
- `AGENTS.md`: implementation constraints and test taxonomy;
- `test/README.md`: test directory tree and layer summary;
- `test/AGENTS.md`: detailed test construction and verification rules;
- `CONTRIBUTING.md`: the mandatory development workflow, pre-commit harness,
  commit-message format, review, and handoff rules.

## Commit messages

Commit messages must use this universal format:

```text
behavior(domain, domain): one-line summary

Detailed description paragraph.

* One-level bullet point.
* Another one-level bullet point.
```

The first line is required and has four parts:

- `behavior`: the kind of change, written as a short lowercase verb or category.
- `(domain, domain)`: one or more affected domains, separated by an English comma and space.
- `:`: an English colon followed by one space.
- `one-line summary`: a concise summary of the change.

For this project, valid examples include:

```text
init(project): scaffold HowDone CLI
fix(cli, output): correct percentage formatting
refactor(adapters, core): preserve the dependency direction
docs(contributing): define commit and pull request rules
```

The detailed description after the first line is optional, but when present it
must be plain text only. Do not use Markdown headings, tables, links, fenced
code blocks, blockquotes, emphasis, checkboxes, or numbered lists. Use normal
paragraphs separated by blank lines and one-level `*` bullets when listing
details. Do not use nested bullets.

## Pull requests and review

Commit messages and pull request descriptions are separate formats. Do not put
the PR headings below into a commit message.

After the `0.1.0` formal release, direct commits to `main` are reserved for the
repository owner. Every other developer must work on a branch and submit a
pull request.

A pull request description must state:

- what changed and which architecture boundary owns it;
- why the change is necessary;
- whether public CLI, JSON, or TypeScript API behavior changed;
- which source, compiled, published-package consumer, local-install,
  typecheck, and packaging commands passed;
- whether the README, API, architecture, development, and contribution
  documents agree with the implementation;
- any environment-specific check that could not run and its remaining risk.

Use this structure for the description:

```markdown
## Summary

Describe what changed.

## Reason

Explain why the change is necessary.

## Breaking API Updates

State `None` or describe the breaking change.

## Checks

- `npm run test:all`
- `npm run pack:check`
- Other relevant manual or environment-specific checks
```

Keep implementation, tests, and documentation together when they describe the
same contract. Do not include `node_modules`, IDE state, local `.npmrc` files,
`.node-version`, `.nvmrc`, build output, coverage, logs, package archives, or
temporary reference material in a change.
