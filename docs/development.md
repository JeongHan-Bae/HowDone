# Development workflow

## Test-first workflow

Use the smallest boundary that proves the change:

1. Update or add a `test/tdd` test for the affected source, token, AST, progress-tree, metric, or serializer contract.
2. Implement the change in the owning `core` stage or its `adapters` implementation.
3. Add/update a `test/bdd/features/*.feature` scenario when the command's final stdout, JSON, exit status, or path behavior changes.
4. Update `README.md`, `docs/syntax.md`, `docs/api.md`, `docs/architecture.md`,
   `AGENTS.md`, `CONTRIBUTING.md`, `test/AGENTS.md`, `LICENSE`, or the generated
   version badge when the corresponding
   user/API/architecture/development/metadata contract changes.
5. Run the full verification gate.

TDD tests must assert the intermediate result, not only the final percentage. This includes the separate Markdown body and YAML/TOML semantic frontmatter results, as well as merged weighting arithmetic. BDD tests must exercise the real source launcher and the compiled package entry; injecting a fake parser is not a substitute for a BDD scenario.

## Commands

```bash
npm install
npm run build
npm run typecheck
npm test              # Node test runner: regression + TDD pipeline tests
npm run test:bdd      # unchanged Cucumber behavior through the source runtime
npm run test:compiled # Compiled TDD and the same BDD feature suite
npm run test:all
npm run typecheck:maintenance
npm run check:platform
npm run pack:check
npm audit --omit=dev --audit-level=moderate
npm audit --audit-level=moderate
npm outdated --include=dev
npm run verify:precommit
```

`npm run badge:version` is a separate release-maintenance command. Run it only
when `package.json` changes the version shown by the README badge; it is not an
installation or verification step.

`npm run verify:precommit` is the mandatory final harness before a commit. It
re-runs the source and compiled application gates, checks the typed CommonJS/ES
module maintenance boundaries, rejects unreviewed runtime platform API access,
audits both dependency scopes, verifies the compiled npm package contents,
checks both staged and unstaged Git diffs for whitespace errors, and never runs
the separate version-badge generator. Its hard-boundary rules and the
commit-message contract are defined in
[`CONTRIBUTING.md`](../CONTRIBUTING.md).

`npm run build` emits the runtime TypeScript sources as platform-neutral
JavaScript and declarations under the ignored `dist/` directory. Relative
`.ts` imports are rewritten to `.js` imports. The original source checkout
preserves the native Node.js TypeScript path on Node.js 23+ and the bundled
`tsx` path on Node.js 18.18–22. The published package and CLI entrypoint run
the compiled JavaScript directly through Node.
`npm run build:tests` compiles the same TDD files and source modules into the
ignored `.test-build/` directory and copies their JSON fixtures. The compiled
test commands use `scripts/run-compiled-tests.mjs`: it builds the release
artifact, packs it, installs it into a temporary project with
`npm install --omit=dev`, copies the compiled TDD tests into that project, and
runs the compiled TDD suite and/or the BDD suite against the installed package.
This keeps development tools such as `tsx`, TypeScript, and Cucumber outside
the application runtime dependency graph being verified. CI uses deterministic
`npm ci`, dependency audits, application and maintenance typechecks, the
platform-neutral source check, source TDD/BDD tests, production-only compiled
TDD/BDD tests, and package verification.
The typed maintenance script under `scripts/` is executed through `tsx` and is
kept outside the application `tsconfig.json` boundary.

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
compiled TDD/BDD tests, and package checks.
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
badge is generated from `package.json` by `npm run badge:version`, which
updates `version_badge.json`. The script is repository maintenance only; the
runtime package-version adapter reads the published package's own metadata.
The independent Update Version Badge workflow runs this script on `main`
pushes that change `package.json` and can also be started with
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

Formal releases are tag-driven. `0.1.0` was the first formal public release.
Starting with `0.1.1`, every published npm release is a compiled release: both
the package API entry and the `howdone` CLI resolve to JavaScript under
`dist/`. TypeScript source, the repository launcher, tests, development
documentation, and maintenance scripts are not part of the published package.
Before creating `v0.1.1` or any later release, both `package.json` and
`package-lock.json` must already declare the tag's exact version. The Release
workflow validates npm SemVer and requires the `v`-stripped tag to match both
committed manifest versions; it does not rewrite the tested workspace before
publishing. Later releases follow the same rule: update the manifests in a
reviewed change, pass the full CI gate, and create the matching `v` tag. The
publish job uses the `latest` dist-tag after the reusable CI gate passes. It
installs the locked dependencies and rebuilds `dist/` in its fresh checkout
before `npm publish`, so the package and CLI published by the tag are the
tested compiled artifacts.

## Main branch policy

After `0.1.0` is released, direct commits to `main` are reserved for the
repository owner. Every other developer must work on a branch and submit a
pull request; direct commits to `main` by other developers are not permitted.
The owner may still require a pull request for any change at their discretion.

## Release package and dependency audit

`npm run pack:check` builds first, then runs `npm pack --dry-run --json` and
verifies the package metadata and file allowlist. The compiled package contains
`dist/`, `docs/syntax.md`, `README.md`, `LICENSE`, and the automatically included
`package.json`. Repository source, tests, development documentation,
maintenance scripts, CI configuration, lockfiles, and version-badge data are
excluded.

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
npm run test:compiled
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
source order, and rejection of a header after body content. Then cover the
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
