# Development workflow

HowDone is developed and published in two parts: the `howdone` npm package is
the framework-independent hexagonal core, and `howdone-cli` is the primary
product and command executor. The CLI command is named `howdone`.

## Test-first workflow

Use the smallest boundary that proves the change:

1. Update or add a `test/tdd` test for the affected source, token, AST, progress-tree, metric, or serializer contract.
2. Implement the change in the owning `core` stage or its `adapters` implementation.
3. Add/update a `test/bdd/features/*.feature` scenario when the command's final stdout, JSON, exit status, or path behavior changes.
4. Add/update a `test/package` consumer test when the public package contract
   changes.
5. Update `README.md`, `docs/syntax.md`, `docs/api.md`, `docs/architecture.md`,
   `AGENTS.md`, `CONTRIBUTING.md`, `test/AGENTS.md`, `LICENSE`, or the generated
   version badge when the corresponding
   user/API/architecture/development/metadata contract changes.
6. Run the full verification gate.

TDD tests must assert the intermediate result, not only the final percentage. This includes the separate Markdown body and YAML/TOML semantic frontmatter results, as well as merged weighting arithmetic. BDD tests must exercise the real source launcher and the compiled package entry; injecting a fake parser is not a substitute for a BDD scenario.

## Commands

```bash
npm install
npm run build:cli
npm run install:local
npm run typecheck
npm test              # Node test runner: regression + TDD pipeline tests
npm run test:bdd      # unchanged Cucumber behavior through the source runtime
npm run test:package   # public core package consumer in an isolated sandbox
npm run test:compiled # Compiled TDD, package consumer, and BDD feature suites
npm run test:local-install # Local-path npm installation in an isolated sandbox
npm run test:all
npm run typecheck:maintenance
npm run typecheck:release # Release workflow only
npm run check:platform
npm run pack:check
npm audit --omit=dev --audit-level=moderate
npm audit --audit-level=moderate
npm outdated --include=dev
npm run verify:precommit
```

`npm run badge:version` is a separate release-maintenance command. Run it only
when `packages/core/package.json` changes the version shown by the README badge; it is not an
installation or verification step.

`npm run verify:precommit` is the mandatory final harness before a commit. It
re-runs the source and compiled application gates, checks the typed CommonJS/ES
module maintenance boundaries, rejects unreviewed runtime platform API access,
audits both dependency scopes, verifies the compiled npm package contents,
checks both staged and unstaged Git diffs for whitespace errors, and never runs
the separate version-badge generator. Its hard-boundary rules and the
commit-message contract are defined in
[`CONTRIBUTING.md`](../CONTRIBUTING.md).

`npm run build` emits the dependency-free core and application JavaScript and
declarations under `packages/core/dist/`. `npm run build:cli` then emits the
CLI adapters and compiled `packages/cli/dist/boot/cli-main.js`. Relative
`.ts` imports are rewritten to `.js` imports. The original source checkout
preserves the native Node.js TypeScript path on Node.js 23+ and the bundled
`tsx` path on Node.js 18.18–22. Both published packages run compiled
JavaScript directly through Node.
`npm run install:local` builds both packages and installs the local `howdone`
Core and `howdone-cli` package globally from this checkout. It does not run a
root `npm install` as part of the local package installation.
`npm run build:tests` compiles the same TDD files and source modules into the
ignored `.test-build/` directory and copies their JSON fixtures. The compiled
test commands use `scripts/run-compiled-tests.mjs`: it builds the release
artifacts, stages the compiled `howdone` and `howdone-cli` packages in an
isolated project, copies only the CLI's resolved production dependency
closure, copies the compiled tests, and runs the compiled TDD and BDD suites.
The package consumer stages the compiled core as `node_modules/howdone` and
supplies test-owned port implementations, proving that a consumer can use the
public hexagonal API without repository adapters. No test step installs from
the network for the direct compiled/package checks or relies on `tsx`,
TypeScript, or Cucumber as an application runtime dependency. The separate
`test:local-install` mode uses npm local package paths in a temporary project,
installs the matching Core and CLI plus the CLI's production dependencies, and
executes the installed package entries and both CLI bin aliases. It does not
install repository development dependencies. CI uses deterministic `npm ci`,
dependency audits, application and maintenance typechecks, the
platform-neutral source check, source TDD/BDD/package tests, compiled
TDD/package/BDD tests, the local-install sandbox, and both package content
checks.
The typed maintenance script under `scripts/` is executed through `tsx` and is
kept outside the application `tsconfig.json` boundary.
The release-only validator is statically typechecked by
`npm run typecheck:release` in the tag-based Release workflow; its version and
npm registry checks are not part of the ordinary pre-commit harness.

`.github/workflows/ci.yml` runs through `actions/checkout@v5` and
`actions/setup-node@v5` on Ubuntu, macOS, and Windows. Push and pull-request
CI is limited to changes in the main CI workflow, `bin/`, `scripts/`, `src/`,
`test/`, the npm manifests, and `tsconfig.json`; README, other documentation,
release-only changes, and version-badge automation do not trigger normal CI.
Manual dispatch
and `workflow_call` remain available, so the Release workflow can still invoke
the reusable CI gate.

Each operating-system job runs the same Node.js 18, 20, 22, 24, and 26
matrix, including dependency audit, typecheck, platform API checks, source and
compiled TDD/BDD tests, the local-install sandbox, and package checks.
The shared matrix and steps are declared once with YAML anchors and reused by
the three OS jobs. Cucumber 11.3.0 is declared once in `package.json` and
supports the project's Node.js matrix. npm `overrides` pin transitive `uuid`
and `glob` versions used by the development-only Cucumber graph; those
packages are not part of the published runtime package. The `glob` 13.x
override can produce a Node 18 engine notice during development installation,
but it is not resolved by the published CLI and has already passed the CI
matrix.
Every matrix row therefore runs the exact dependency graph produced by
`npm ci` from the committed manifest and lockfile. `.github/workflows/release.yml`
calls that same workflow first; its
`publish` job has `needs: ci`, so npm publishing cannot run when any CI check
fails.

The README status badge follows the `main` branch CI workflow. Its version
badge is generated from `packages/core/package.json` by `npm run badge:version`, which
updates `version_badge.json`. The script is repository maintenance only; the
runtime package-version adapter reads the published package's own metadata.
The independent Update Version Badge workflow runs this script on `main`
pushes that change `packages/core/package.json` and can also be started with
`workflow_dispatch`. It commits the generated file through the authorized SSH
identity; its badge update does not retrigger the main CI workflow. The
workflow uses `SSH_SIGNING_KEY` for the signed commit and
`SSH_AUTH_KEY` for the GitHub push identity, and skips unauthorized actors.
`SSH_SIGNING_KEY` does not grant repository access. Because the `main` rules
require changes through a pull request and required status checks, the
`GITHUB_TOKEN` granted by `contents: write` cannot push this generated commit
by itself; `SSH_AUTH_KEY` must belong to the authorized account allowed by the
repository rules. Missing either secret fails the workflow before a push, so a
successful run cannot hide a rejected badge update.
The package metadata and distribution are licensed under Apache License 2.0;
the copyright year for this repository is 2026.

## Release tags and package versions

Formal releases are tag-driven. `0.1.0` was the first formal public release.
Starting with `0.1.2`, every published npm release uses compiled packages:
`howdone` is the dependency-free hexagonal core/application API, while
`howdone-cli` is the primary product that exposes the `howdone` command and CLI
adapters. TypeScript source, the repository launcher, tests, development
documentation, and maintenance scripts are not part of either package.

The stable Release workflow accepts exactly these tag forms:

- `vX.Y.Z` publishes both packages. Both package versions and the CLI's exact
  `howdone` dependency must be `X.Y.Z`.
- `vX.Y.Z-cli` publishes only `howdone-cli`. The CLI version must be `X.Y.Z`,
  its exact core dependency must be the current `howdone` version, and the
  core and CLI versions must share `X.Y`.
- `vX.Y.Z-core` publishes only `howdone`. The core version must be `X.Y.Z`;
  the local CLI manifest must still point to that exact core version, and the
  two manifests must share `X.Y` even though the CLI is not published.

The workflow validates both workspace entries in `package-lock.json` and all
of these relationships before publishing. It also checks that every selected
`name@version` is absent from npm and refuses to continue if the GitHub Release
for the tag already exists. This prevents a repeated tag from starting a
second publish. After the selected packages publish under the `latest`
dist-tag, the workflow confirms immediately before the CLI step that the
exact Core dependency version is visible from npm, then creates the GitHub
Release marker. For a `-cli` tag this check is the guard that catches a Core
version that was forgotten or never published. npm versions cannot be
overwritten, so a partial publish is intentionally fail-closed on a later
retry rather than pretending the two package publishes are atomic.

The workflow is the only publisher for final stable releases. It does not
accept prerelease tags; a bootstrap alpha publish is a separate, explicitly
reviewed operation.

## Main branch policy

After `0.1.0` is released, direct commits to `main` are reserved for the
repository owner. Every other developer must work on a branch and submit a
pull request; direct commits to `main` by other developers are not permitted.
The owner may still require a pull request for any change at their discretion.

## Release package and dependency audit

`npm run pack:check` builds first, then runs `npm pack --dry-run --json` for
both workspaces and verifies each package's metadata and file allowlist. The
core package contains only its selected `dist/core` and `dist/application`
artifacts, `docs/api.md`, `README.md`, `LICENSE`, and `package.json`. The CLI
package contains its `dist/` artifacts, `docs/syntax.md`, `README.md`,
`LICENSE`, and `package.json`. Repository source, tests, development
documentation, maintenance scripts, CI configuration, lockfiles, and
version-badge data are excluded.

The runtime dependency graph is audited separately from development tooling.
`npm audit --omit=dev --audit-level=moderate` protects the installed CLI, while
the full `npm audit --audit-level=moderate` check covers the test graph as well.
`npm outdated --include=dev` is an informational freshness check and must be
reviewed before a release. Runtime parsers must support the declared Node
engine range; the YAML and TOML adapters use `yaml` and `smol-toml`, and the
TOML parser is intentionally kept as a direct runtime dependency rather than
delegated to a repository maintenance script. The `glob` override remains
pinned to `13.0.6`, the version already exercised by the project's CI. The
Cucumber dependency graph requests an older `glob` 10.x range; the override is
intentionally kept in the development-only graph and reviewed together with
Cucumber upgrades. It resolves that request to the audited `13.0.6` release.
The `uuid` override remains pinned to the audited fixed release.

For local behavior checks, use the maintained TDD and BDD fixtures:

```bash
npm test
npm run test:bdd
npm run test:package
npm run test:compiled
npm run test:local-install
```

The TDD suite owns intermediate contracts and the BDD suite creates temporary
workspaces for the real executable. Do not rely on an ad hoc source file or
command as a project check.

Terminal defaults are percentage format, precision `2`, hidden trailing zeroes,
and 10-grapheme label truncation for tree/details. Decimal output defaults to
precision `4`; JSON keeps raw numeric fields and complete labels. Explicit JSON
format, precision, or trailing-zero options are warning-level no-ops, while
`--json --no-truncate` is a quiet no-op and `--json --max-label-clusters N`
remains meaningful. Hard option conflicts fail before analysis. Warnings use
the process warning channel, `--silent` suppresses them, and `--strict` turns
them into errors.

## Adding a pipeline stage

- Add the stage contract under `src/core/**/types.ts` or `src/core/ports.ts`.
- Keep the implementation in the owning `core` stage when it is pure policy.
- Put library/filesystem/terminal behavior in `src/adapters` behind the port.
- Compose the default implementation only in `src/boot/main.ts`.
- Add TDD tests for the new stage and its incoming/outgoing boundaries.
- Add a BDD feature only when the user-visible result changes.

The frontmatter stage is an adapter/core pair. The adapter decodes valid YAML or
TOML values and the core classifier emits semantic checklist contracts; the
core tree builder turns those contracts into progress nodes. Keep Markdown
task-list recognition independent from frontmatter classification. For a
frontmatter change, cover flat boolean
mappings, unnamed recursively boolean sequences, root-level boolean-map and
sequence rejection, named properties leading to unnamed sequences,
all-or-nothing invalid sequences, `name`/`done` records with extra fields,
nested objects, and YAML/TOML parity in JSON fixtures.
`test/tdd/fixtures/markdown-tree-contracts.json` covers ordered and unordered
Markdown trees, explicit parent-state behavior, and discarded plain subtrees.
`test/tdd/fixtures/frontmatter-layouts.json` covers empty, body-only,
frontmatter-only, body-plus-frontmatter, repeated formats, alternating formats,
source order, and delimiter-shaped YAML/TOML blocks after body content staying
in the Markdown channel. Then cover the
single-source flat output contract, grouped multi-source output, explicit
merging, root-count weighting inside the aggregated frontmatter side, invalid
and illegal weight handling, two-header merging without a body, and warning,
silent, and strict behavior through BDD.

`docs/syntax.md` is the standalone user-facing source contract. Keep links to
developer material out of that file because it is shipped in the npm package.

## Error and portability rules

- Return non-zero status for invalid CLI input, unreadable/non-Markdown paths, invalid option values, and parser errors.
- Use Node `node:path`/`node:fs` for platform-native path semantics; never hand-roll a Windows/POSIX path grammar.
- Prefer platform-neutral Node.js and npm interfaces; avoid runtime platform
  branches. `npm run check:platform` uses the TypeScript AST to reject
  unreviewed runtime platform API access.
- Keep business and parsing logic TypeScript. The CommonJS launcher is an execution shim only.
- Keep application and domain code free of network access, browser APIs, and
  dynamic code generation. The CommonJS launcher may use Node's `--eval` only
  as a loader bridge for importing the platform-safe `file://` TypeScript entry
  point; it must not contain application behavior.
