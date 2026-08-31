# Development workflow

HowDone is developed and published in two parts: the `howdone` npm package is
the framework-independent hexagonal core, and `howdone-cli` is the primary
product and command executor. The CLI command is named `howdone`.

This document owns development commands, CI, maintenance, and release workflow
context. The authoritative release publication contract is in
[`AGENTS.md`](../AGENTS.md#release-publication-contract).
Commit-message, pull-request, review, and handoff rules are defined in
[`CONTRIBUTING.md`](../CONTRIBUTING.md) and are not repeated here.

## Test-first workflow

Use the smallest boundary that proves the change:

1. Update or add a `test/tdd` test for the affected Core contract, source, token, AST, progress-tree, metric, or serializer boundary.
2. Implement the change in the owning `core` stage or its `adapters` implementation.
3. Add/update a `test/bdd/features/*.feature` scenario when the command's final stdout, JSON, exit status, or path behavior changes.
4. Add/update a `test/package` consumer test when the public package contract
   changes.
5. Update the owning public, architecture, development, test, contribution, or
   release-metadata document when its contract changes.
6. Run the full verification gate.

### Evidence ownership

TDD tests assert the intermediate result, not only the final percentage. This
includes separate Markdown-body and YAML/TOML semantic-frontmatter results,
merged weighting arithmetic, and Core or Port behavior that is not a CLI option.

CLI BDD tests under `test/bdd/` exercise a real source or compiled executable.
Injecting a fake parser is not a substitute for a CLI behavior scenario.

The distinct `test/package/bdd/` suite is consumer BDD: it invokes the published
Core application entry with consumer-owned ports and fixtures, and must not be
coupled to the CLI BDD suite.

## Adding a pipeline stage

- Add the stage contract under `src/core/**/types.ts` or `src/core/ports.ts`.
- Keep the implementation in the owning `core` stage when it is pure policy.
- Put library/filesystem/terminal behavior in `src/adapters` behind the port.
- Compose the default CLI implementation only in `src/boot/cli-runtime.ts`.
  Keep `src/boot/main.ts` and `src/boot/cli-main.ts` as thin source-checkout
  and compiled-package wrappers that provide their artifact-specific paths.
- Add TDD tests for the new stage and its incoming/outgoing boundaries.
- Add a BDD feature only when the user-visible result changes.

The frontmatter stage is an adapter/core pair. The adapter decodes valid YAML or
TOML values and the core classifier emits semantic checklist contracts; the
core tree builder turns those contracts into progress nodes. Keep Markdown
task-list recognition independent from frontmatter classification.

Detailed fixture construction and coverage ownership are defined in
[`test/AGENTS.md`](../test/AGENTS.md). When a pipeline stage changes, update the
layer-owned fixtures and boundary assertions there instead of moving test
oracles into this development guide.

## Error and portability rules

- Return non-zero status for invalid CLI input, unreadable/non-Markdown paths, invalid option values, and parser errors.
- Use Node `node:path`/`node:fs` for platform-native path semantics; never hand-roll a Windows/POSIX path grammar.
- Prefer platform-neutral Node.js and npm interfaces; maintenance scripts invoke
  npm through Node with an argument array and no shell. `npm run check:static`
  runs the platform and code-ASCII policy checks.
- Keep business and parsing logic TypeScript. The CommonJS launcher is an execution shim only.
- Keep application and domain code free of network access, browser APIs, and
  dynamic code generation. The CommonJS launcher may use Node's `--eval` only
  as a loader bridge for importing the platform-safe `file://` TypeScript entry
  point; it must not contain application behavior.

## Commands

```bash
npm install
npm run clean
npm run build:cli
npm run install:local
npm test              # Node test runner: regression + TDD pipeline tests
npm run test:bdd      # unchanged Cucumber behavior through the source runtime
npm run test:package   # public core package consumer in an isolated sandbox
npm run test:compiled # Compiled TDD, package consumer, and BDD feature suites
npm run test:local-install # Local-path npm installation in an isolated sandbox
npm run test:all
npm run check:static # Typechecks, documentation/policy, and Git checks
npm run check:help
npm run pack:check
npm audit --omit=dev --audit-level=moderate
npm audit --audit-level=moderate
npm outdated --include=dev
npm run verify:precommit
```

`npm run check:help` runs the Help contract maintenance check. It verifies the
four CLI command forms, both installed CLI bin names, every primary-command
option, and every declared option alias in the rendered Help output.

`npm run clean` removes ignored generated package builds, compiled test output,
coverage/output directories, and TypeScript build-info files. It leaves
`node_modules`, the npm download cache, and source files untouched.

`npm run verify:precommit` is the only command required before a commit. It
aggregates the source and compiled application gates, the production and full
dependency audits, and compiled npm package contents. It finishes with the
static-check command, which owns the typechecks, policy checks, and staged and
unstaged Git whitespace checks. It starts by cleaning ignored artifacts and
never runs the separate version-badge generator. Do not repeat
its internal commands individually before committing.
Contribution formatting and review rules are defined in
[`CONTRIBUTING.md`](../CONTRIBUTING.md).

### Build and installation

`npm run build` emits the dependency-free core and application JavaScript and
declarations under `packages/core/dist/`. `npm run build:cli` then emits the
CLI adapters and compiled `packages/cli/dist/boot/cli-main.js`. Relative
`.ts` imports are rewritten to `.js` imports. The original source checkout
preserves the native Node.js TypeScript path on Node.js 23+ and the bundled
`tsx` path on Node.js 18.18-22. Both published packages run compiled
JavaScript directly through Node.

`npm run install:local` builds both packages and installs the local `howdone`
Core and `howdone-cli` package globally from this checkout. It does not run a
root `npm install` as part of the local package installation.

### Compiled and consumer test sandboxes

`npm run build:tests` compiles the same TDD files and source modules into the
ignored `.test-build/` directory and copies their JSON fixtures. The compiled
test commands use `scripts/run-compiled-tests.mjs`: it builds the release
artifacts, stages the compiled `howdone` and `howdone-cli` packages in an
isolated project, copies only the CLI's resolved production dependency
closure, copies the compiled tests, and runs the compiled TDD and BDD suites.
The package consumer stages the compiled core as `node_modules/howdone` and
supplies test-owned implementations for replaceable Ports, while exercising
the published `howdone/std` implementations where they exist. This proves that
a consumer can use the public hexagonal API without repository adapters. Its
consumer TDD and BDD checks include the 64-case terminal/JSON capability and
request matrix.

The CLI BDD suite is a separate real-process check and shares no consumer
adapter or step implementation. No test step installs from
the network for the direct compiled/package checks or relies on `tsx`,
TypeScript, or Cucumber as an application runtime dependency.

The separate `test:local-install` mode uses npm local package paths in a
temporary project,
installs the matching Core and CLI plus the CLI's production dependencies, and
executes the installed package entries and both CLI bin aliases. It does not
install repository development dependencies.

### Maintenance checks

`npm run typecheck:maintenance` executes the typed maintenance checker through
`tsx` with the repository root as its folder argument. The checker discovers
TypeScript and JavaScript maintenance files through the TypeScript compiler API,
including the release validator, and remains outside the application
`tsconfig.json` boundary. The release validator's version and npm registry
checks are not part of the ordinary pre-commit harness.

## Terminal output design

The terminal feature design keeps one `TerminalOutputPort` for four document
kinds: progress reports, the CLI-owned Help document, warnings, and errors.
`render`, `renderDocument`, `renderWarning`, and `renderError` all return one exact
concrete `TOutput` type. Its optional `print` member receives that same value
plus independent color, Pager, and target-stream modes. The hexagonal core
forwards `auto` or `never`; Core has no force mode because a Pager cannot be
obtained for a file or pipe and forced styling would change ordinary redirected
output. It does not inspect TTY state or
perform a shared capability check. A provider may declare terminal enhancement behavior only
when it can judge the TTY state of its own target stream. A provider may
support neither, one, or both features; an unsupported feature remains
ordinary output. If `print` is absent, the application writes the value's
`writeTo` representation to Core `TerminalIO.stdout` for reports/Help or
`TerminalIO.stderr` for warnings/errors.

The JSON Port is intentionally separate in data shape but follows the same
optional delivery rule. `render` returns the JSON object itself, without a
generic or `Streamable` wrapper. If present, its optional delivery member
receives that same object and may color JSON syntax or page it on its own TTY.
If absent, the application uses `JSON.stringify` and writes ordinary JSON.

The Help renderer lays out only Commands and Options; Pager receives its final
semantic output and does not own Help layout. Help section headings use
`accent`. The CLI Help document explicitly distinguishes code fragments and
CLI command/option/argument parts from file/dependency references. Non-styled
code uses backticks; references do not. TTY code uses a distinct magenta color
without bold or backticks, while references use that code color without
markers. These Help distinctions are CLI implementation details; Core only
forwards the CLI-owned document and the resulting terminal output.

### Selected terminal libraries

`chalk@5.6.2` is the color adapter. It provides cross-platform color
formatting, has no runtime dependency tree, and has no `preinstall`, `install`,
or `postinstall` script. The Core defines semantic values such as `complete`,
`partial`, `zero`, `accent`, `muted`, `success`, `warning`, `error`,
`deprecated`, and `silent`; the CLI adapter chooses their colors. CLI Help
adds its local code/reference presentation on top of the terminal semantic
parts. No ANSI
escape sequence is authored by Core or report formatting code.

`ink@5.2.1` with `react@18.3.1` is the Pager implementation. It is an
in-process renderer: the CLI imports and runs Ink in the current Node process,
does not spawn `less` or another child process, and does not invoke a shell,
editor, filesystem viewer, or clipboard API. The adapter uses only Ink's
rendering, input, stdout resize, and cleanup APIs, with console patching and
Ink's process Ctrl+C exit behavior disabled. Its optional React DevTools peer
and `ws` native acceleration peers are not used by this adapter; no network
connection is opened by HowDone. Ink owns cursor and terminal cleanup, while
the adapter supplies the visual rows, semantic colors, allowed keys, and
plain-output replay after `q`.

`string-width@7.2.0` is the one visual-cell measurement utility used by the
CLI Help and Pager width helpers. The same helper is reused for Unicode input,
ANSI-free semantic parts, and Help descriptions; no second width algorithm is
introduced. `react` is Ink's Node rendering peer, not a browser frontend
dependency.

## Runtime dependency review

### Production dependency tree

The resolved production dependency tree comes from `packages/cli/package.json`
and the lockfile. `howdone` is listed first; the remaining direct dependencies
are alphabetical. The tree shows every direct dependency and its immediate
children; deeper branches and deduped nodes are checked by the full command
below.

```text
howdone-cli@0.1.2
├── howdone@0.1.2
├── chalk@5.6.2
├── ink@5.2.1
│   ├── @alcalzone/ansi-tokenize@0.1.3
│   ├── @types/react@18.3.18
│   ├── ansi-escapes@7.3.0
│   ├── ansi-styles@6.2.3
│   ├── auto-bind@5.0.1
│   ├── chalk@5.6.2 (deduped)
│   ├── cli-boxes@3.0.0
│   ├── cli-cursor@4.0.0
│   │   └── restore-cursor@4.0.0
│   ├── cli-truncate@4.0.0
│   │   ├── slice-ansi@5.0.0
│   │   └── string-width@7.2.0 (deduped)
│   ├── code-excerpt@4.0.0
│   │   └── convert-to-spaces@2.0.1
│   ├── es-toolkit@1.51.0
│   ├── indent-string@5.0.0
│   ├── is-in-ci@1.0.0
│   ├── patch-console@2.0.0
│   ├── react-devtools-core@^4.19.1 (optional peer, not installed)
│   ├── react-reconciler@0.29.2
│   ├── react@18.3.1 (deduped)
│   ├── scheduler@0.23.2
│   ├── signal-exit@3.0.7
│   ├── slice-ansi@7.1.2
│   ├── stack-utils@2.0.6
│   ├── string-width@7.2.0 (deduped)
│   ├── type-fest@4.41.0
│   ├── widest-line@5.0.0
│   ├── wrap-ansi@9.0.2
│   ├── ws@8.21.3
│   └── yoga-layout@3.2.1
├── mdast-util-to-string@4.0.0
│   └── @types/mdast@4.0.4
├── react@18.3.1
│   └── loose-envify@1.4.0
│       └── js-tokens@4.0.0
├── remark-frontmatter@5.0.0
│   ├── @types/mdast@4.0.4 (deduped)
│   ├── mdast-util-frontmatter@2.0.1
│   ├── micromark-extension-frontmatter@2.0.0
│   └── unified@11.0.5 (deduped)
├── remark-gfm@4.0.1
│   ├── @types/mdast@4.0.4 (deduped)
│   ├── mdast-util-gfm@3.1.0
│   ├── micromark-extension-gfm@3.0.0
│   ├── remark-parse@11.0.0 (deduped)
│   ├── remark-stringify@11.0.0
│   └── unified@11.0.5 (deduped)
├── remark-parse@11.0.0
│   ├── @types/mdast@4.0.4 (deduped)
│   ├── mdast-util-from-markdown@2.0.3
│   ├── micromark-util-types@2.0.2
│   └── unified@11.0.5 (deduped)
├── smol-toml@1.8.0
├── string-width@7.2.0
│   ├── emoji-regex@10.6.0
│   ├── get-east-asian-width@1.6.0
│   └── strip-ansi@7.2.0
├── unified@11.0.5
│   ├── @types/unist@3.0.3
│   ├── bail@2.0.2
│   ├── devlop@1.1.0
│   ├── extend@3.0.2
│   ├── is-plain-obj@4.1.0
│   ├── trough@2.2.0
│   └── vfile@6.0.3
└── yaml@2.9.0
```

The full production graph, including the Markdown and data parser closure, is
checked with `npm ls --omit=dev --all`. The development graph is checked
separately because Cucumber and its tooling are not shipped by `howdone-cli`.
Every new runtime package is pinned to the reviewed exact version where this
feature depends on its behavior; the lockfile is committed with the result.

## Platform risk

The selected runtime floor is Node.js 18.18. Ink requires Node.js 18 or later,
and Chalk, React, and `string-width` support that floor. The adapter uses Node
streams, raw input, ANSI terminal conventions, and the target stream's resize
event; it contains no `process.platform` or OS command branch. On macOS and
common Linux terminals this uses the native TTY and raw-mode interfaces. On
Windows Terminal and ConPTY it uses the same Node stream contract and Ink
terminal rendering. When the target is not an interactive TTY, or raw input is
unavailable, the provider leaves the requested feature ordinary and emits no
Pager control sequence. This is the fallback that keeps files, pipes, and JSON
consumers machine-readable.

## CI workflow

`.github/workflows/ci.yml` runs through `actions/checkout@v5` and
`actions/setup-node@v5` on Ubuntu, macOS, and Windows. Push and pull-request
CI watches the main CI workflow, `bin/`, `scripts/`, `src/`, `test/`, the root
npm manifests, TypeScript configs, and only TypeScript and JSON files under
`packages/`. Package README and documentation changes, root README and
documentation changes, release-only changes, and version-badge automation do
not trigger normal CI. Manual dispatch and `workflow_call` remain available,
so the Release workflow can still invoke the reusable CI gate.

Workflow-level concurrency keeps only the newest run for a branch or pull
request: when a newer run starts, an unfinished older run for the same ref is
cancelled, including its matrix jobs. Runs for different refs continue
independently.

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

## Version badge maintenance

The README status badge follows the `main` branch CI workflow. Its two version
badges are generated from `packages/core/package.json` and
`packages/cli/package.json` by `npm run badge:version`, which updates
`version_badge.json` and `version_badge_cli.json`. The Core badge uses the
existing cyan color; the CLI badge uses the common light IndianRed color
`#CD5C5C`. The script is repository maintenance only; the runtime
package-version adapter reads the published package's own metadata.

The independent Update Version Badge workflow runs this script on `main`
pushes that change either package manifest and can also be started with
`workflow_dispatch`. It stages both generated files, checks whether either
changed, and commits only the changed badge files through the authorized SSH
identity. Its generated commit body includes a Core version line, a CLI version
line, or both as applicable; when neither badge changes, it does not commit.
The workflow uses the versions emitted by the badge generator and does not
perform a second package-version inspection.

The badge update does not retrigger the main CI workflow. The
workflow uses `SSH_SIGNING_KEY` for the signed commit and
`SSH_AUTH_KEY` for the GitHub push identity, and skips unauthorized actors.
`SSH_SIGNING_KEY` does not grant repository access. Because the `main` rules
require changes through a pull request and required status checks, the
`GITHUB_TOKEN` granted by `contents: write` cannot push this generated commit
by itself; `SSH_AUTH_KEY` must belong to the authorized account allowed by the
repository rules. Missing either secret fails the workflow before a push, so a
successful run cannot hide a rejected badge update.

## Release tags and package versions

Formal releases are tag-driven. `0.1.0` was the first formal public release.
Starting with `0.1.2`, every published npm release uses compiled packages:
`howdone` is the dependency-free hexagonal core/application API, while
`howdone-cli` is the primary product that exposes the `howdone` command and CLI
adapters. TypeScript source, the repository launcher, tests, development
documentation, and maintenance scripts are not part of either package.

The authoritative tag, validation, registry, and publication-order contract is
in [`AGENTS.md`](../AGENTS.md#release-publication-contract). In brief, the
validator checks the package versions, exact CLI-to-Core dependency, lockfile,
and npm state before CI. `both` and `core` publish Core first, every valid kind
confirms the exact Core version is visible, and every valid kind publishes the
CLI. This document provides workflow context; it does not duplicate the tag
matrix or release policy.

## Release package and dependency audit

### Package contents

`npm run pack:check` builds first, then runs `npm pack --dry-run --json` for
both workspaces and verifies each package's metadata and file allowlist. The
core package contains only its selected `dist/core` and `dist/application`
artifacts, `docs/api.md`, `README.md`, `LICENSE`, and `package.json`. The CLI
package contains its `dist/` artifacts, `docs/guide.md`, `docs/syntax.md`,
`README.md`, `LICENSE`, and `package.json`. Repository source, tests, development
documentation, maintenance scripts, CI configuration, lockfiles, and
version-badge data are excluded.

### Dependency and freshness audit

The runtime dependency graph is audited separately from development tooling.
`npm audit --omit=dev --audit-level=moderate` protects the installed CLI, while
the full `npm audit --audit-level=moderate` check covers the test graph as well.
Both commands must complete successfully before the change is accepted. The
package and lockfile review also checks lifecycle scripts and the output
adapter's absence of network, filesystem mutation, shell execution, and child
process execution.

`npm outdated --include=dev` is an informational freshness check and must be
reviewed before a release.

Runtime parsers must support the declared Node engine range; the YAML and TOML
adapters use `yaml` and `smol-toml`, and the TOML parser is intentionally kept
as a direct runtime dependency rather than delegated to a repository maintenance
script.

The `glob` override remains pinned to `13.0.6`, the version already exercised by
the project's CI. The Cucumber dependency graph requests an older `glob` 10.x
range; the override is
intentionally kept in the development-only graph and reviewed together with
Cucumber upgrades. It resolves that request to the audited `13.0.6` release.
The `uuid` override remains pinned to the audited fixed release.
