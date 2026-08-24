# Contributing

HowDone changes must follow the architecture and user-visible rules in
[`AGENTS.md`](AGENTS.md). Before changing behavior, also read the relevant
sections of [`README.md`](README.md), [`docs/architecture.md`](docs/architecture.md),
[`docs/api.md`](docs/api.md), and [`docs/development.md`](docs/development.md).

The project is a local Node.js/TypeScript CLI. It reads Markdown task lists,
calculates progress, and writes a result to the terminal or stdout. It must not
modify or upload the source file, require a browser, or require network access.

## Development principles

Start from the smallest behavior owned by one stage. Keep policy, parsing,
filesystem access, output formatting, and process startup in their respective
boundaries. A passing end-to-end result does not replace tests for the
intermediate contracts.

Keep implementation, tests, and documentation for one contract in the same
change. If a public option, output shape, error, or architecture rule changes,
update the matching documentation and behavior tests before handoff.

## Architecture ownership

The source tree is intentionally organized as a small hexagonal application:

- `src/core/` owns framework-independent contracts and policy. Source tokens,
  AST types, progress-tree construction, metrics, and display-option policy
  belong here.
- `src/adapters/` owns external implementations of core ports: Unified/Remark,
  Node `path`/`fs`, `Intl.Segmenter`, terminal output, and JSON output.
- `src/application/` owns CLI argument handling and the Markdown progress analysis use case. It
  receives ports and must not instantiate filesystem, parser, or renderer
  adapters.
- `src/boot/` is the composition root. It constructs the default adapters and
  calls the application.
- `bin/howdone.cjs` is an execution shim only. It selects native TypeScript
  execution on Node.js 23+ or the bundled `tsx` fallback on Node.js 18.18–22.

The dependency direction is inward:

```text
adapters ──implements──> core ports
application ────────────> core policy and ports
boot ───────────────────> adapters + application
bin ─────────────────────> boot
```

Do not add loose business modules to the `src` root. Core modules must not
import adapters, CLI code, Node filesystem APIs, or terminal libraries.
Default implementations are composed only in `src/boot/main.ts`.

## Source pipeline rules

The source pipeline is an explicit contract and must remain observable in
tests:

```text
source text
  -> MarkdownLexer -> LexerToken[]
  -> MarkdownAstParser -> RootAst
  -> progress tree builder -> CheckboxNode[]
  -> completion metrics -> ProgressResult
  -> TerminalOutputPort or JsonOutputPort
```

When changing Markdown behavior, keep these boundaries separate:

1. Test source recognition, token kinds, source spans, and local token data.
2. Test token-to-AST normalization, list-item state, and nested boundaries.
3. Test AST-to-progress-tree rules, including implicit ancestors, discarded
   branches, depth, and source order.
4. Test leaf and branch metrics, root weighting, counts, and numeric fields.
5. Test output adapters and their display-only transformations.
6. Add a BDD scenario when the command's final output, exit status, path, or
   option behavior changes.

The Remark adapter may delegate Markdown recognition to Unified/Remark/GFM,
but the rest of the application must use the local token and AST contracts.
Do not replace the library-backed Markdown parser with a hand-written regular
expression parser.

Path behavior must be delegated to the target runtime's native `node:path` and
`node:fs` implementations. Do not parse foreign operating-system path syntax
or translate Windows paths on POSIX, or POSIX paths on Windows.

## Test requirements

The project has three complementary evidence layers:

- `test/tdd/` proves each pipeline boundary and intermediate contract.
- `test/bdd/features/` and `test/bdd/steps/` exercise the real
  `bin/howdone.cjs -> src/boot/main.ts` path with Cucumber.
- `test/index.test.ts` holds the broad regression and edge-case matrix.

Use TDD for stage behavior and BDD for user-visible behavior. In particular,
mixed CLI options belong in BDD scenarios, not only in `parseArguments` unit
tests. Keep BDD coverage for combinations such as:

- `tree`, `details`, and `json` mode conflicts;
- decimal and explicit percentage formats;
- precision limits, trailing-zero display, and invalid precision;
- format, precision, truncation, and `--no-truncate` used together;
- JSON complete labels by default and explicit JSON label truncation;
- Unicode and space-containing paths, display options, and command errors.

BDD steps must invoke the executable in a temporary workspace. Do not replace
the real boot path with injected parsers or renderers in a behavior scenario.
TDD fixtures may inject ports when proving an individual boundary.

## User-visible contract

Keep these rules covered when modifying CLI behavior:

- With only a Markdown path, the default output is the overall percentage,
  such as `75%`.
- `--format decimal` and `--format percentage` select decimal or explicit
  percentage output. `--decimal` and `--percentage` are supported aliases.
- Percentage precision defaults to two places and may be zero. Decimal
  precision defaults to four places and must be at least one.
- Trailing zeroes are hidden by default and can be enabled with
  `--show-trailing-zeros`.
- `--tree`, `--details`, and `--json` are mutually exclusive.
- JSON preserves numeric progress fields and complete labels by default. An
  explicit `--max-label-clusters` may request grapheme-safe label truncation;
  `--no-truncate` must keep labels complete.
- Terminal and JSON output are in English, even when source labels are not.
- Invalid paths, extensions, options, modes, reads, and parser
  failures return a non-zero status and a clear stderr message.

## Local setup and checks

Node.js 23+ runs the TypeScript entry point with native type stripping. Node.js
18.18 through 22 uses the bundled `tsx` fallback. Earlier Node.js versions are
unsupported.

Install dependencies with:

```bash
npm install
npm run badge:version
```

Run the normal verification gate before handoff:

```bash
npm run typecheck
npm test
npm run test:bdd
npm run pack:check
```

The combined gate is:

```bash
npm run test:all
```

For a focused local CLI check:

```bash
node ./bin/howdone.cjs ./tasks.md
node ./bin/howdone.cjs ./tasks.md --format decimal
node ./bin/howdone.cjs ./tasks.md --tree
node ./bin/howdone.cjs ./tasks.md --details
node ./bin/howdone.cjs ./tasks.md --json
```

Do not weaken an assertion, skip a failing scenario, or hide a known failure
to make the gate green. If an environment-specific check cannot run, record
the exact command, reason, and remaining risk in the change description.

## Documentation updates

Update documentation in the same change when the corresponding contract
changes:

- `README.md`: installation, usage, and user-visible behavior;
- `LICENSE`: the repository's Apache License 2.0 terms and copyright notice;
- `scripts/update-version-badge.mjs`: generates the package version shown by
  the README badge in `version_badge.json`;
- `docs/api.md`: programmatic types and output contracts;
- `docs/architecture.md`: stage ownership and dependency direction;
- `docs/development.md`: test-first workflow and development commands;
- `AGENTS.md`: implementation constraints and test taxonomy;
- `CONTRIBUTING.md`: contribution, review, and handoff rules.

The removed initial requirements document is not a project dependency. The
current source, tests, and maintained documentation are the authoritative
implementation contract.

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

A pull request description must state:

- what changed and which architecture boundary owns it;
- why the change is necessary;
- whether public CLI, JSON, or TypeScript API behavior changed;
- which TDD, BDD, typecheck, and packaging commands passed;
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
