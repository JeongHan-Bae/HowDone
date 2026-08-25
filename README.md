<h1 align="center">
  <span>
    <img src="https://skillicons.dev/icons?i=ts"
         alt="TypeScript"
         width="72" valign="middle">
  </span>
  <span style="font-size: x-large;">&nbsp;</span>
  <span>
    <img src="https://raw.githubusercontent.com/cucumber/cucumber-js/46a5a78107be27e99c6e044c69b6e8f885ce456c/docs/images/logo.svg"
         alt="Cucumber"
         width="68" valign="middle">
  </span>
  <span style="font-size: x-large;">&nbsp;HowDone</span>
</h1>

<p align="center">
  <img
    src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/JeongHan-Bae/HowDone/main/version_badge.json"
    alt="Version"
    width="196"
  >
</p>

<div align="center">

[![CI](https://github.com/JeongHan-Bae/HowDone/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/JeongHan-Bae/HowDone/actions/workflows/ci.yml)

[![License](https://img.shields.io/github/license/JeongHan-Bae/HowDone)](LICENSE)

</div>

**HowDone** answers “How done is this Markdown?” It is a local, cross-platform
Node.js/TypeScript project published in two packages: `howdone` is the
framework-independent hexagonal core, and `howdone-cli` is the primary product
and command-line executor. Its command names are `howdone` and `howdone-cli`,
with `howdone` as the primary command. It analyzes
hierarchical Markdown task lists, calculates overall and per-level completion,
and never modifies or uploads the source file.

## Install and Run

### 1. Build and install the local Repo

Run this from the HowDone checkout. The command builds both packages and
installs the matching local Core and CLI:

```bash
npm run install:local
howdone task.md
howdone-cli task.md
```

Both packages come from the checkout. If your system does not expose global
commands directly, prefix the commands with `npx`:

```bash
npx howdone-cli task.md
npx howdone task.md
```

### 2. Install the published CLI in a project

Run this in the project where you want to use the published CLI:

The remote commands below apply to paired releases beginning with `0.1.2`;
the repository's `0.1.1` is not that paired remote release.

```bash
npm install howdone-cli
npx howdone-cli task.md
npx howdone task.md
```

npm downloads the published `howdone-cli` and its matching published Core.

### 3. Install the published CLI globally

```bash
npm install --global howdone-cli
howdone task.md
howdone-cli task.md
```

Use the commands directly when your system exposes global npm binaries.

### 4. Download and run the published CLI with npx

```bash
npx howdone-cli task.md
npx howdone task.md
```

Run `npx howdone-cli task.md` once first so npx registers the CLI package;
after that, both command names are valid. The published CLI automatically
installs its matching published Core dependency.

### 5. Install only the published Core

```bash
npm install howdone
```

This installs only the published Core for use as a library.

It does not install either CLI command. The CLI commands are `howdone` and
`howdone-cli`.

Node.js 18.18 or newer is required.

## HowDone Core

The `howdone` package is HowDone's framework-independent hexagonal Core. Its
source contracts and policies are in [`src/core/`](src/core/), its package
entry is [`packages/core/`](packages/core/), and the public API is defined in
[`docs/api.md`](docs/api.md). The Core does not construct the default CLI
adapters; another project supplies the ports when it uses the package.

The Core application can be composed from another project like this:

```ts
import { run } from "howdone/application";

const exitCode = await run(argv, io, dependencies);
```

The `io` and `dependencies` objects are supplied by the consuming project.
Their required contracts and the complete composition example are in the
[Core API](docs/api.md).

## CLI Usage

The CLI has four independent commands. Only the first command reads and
analyzes a Markdown file:

```text
howdone <markdown-path> [options]
howdone --help
howdone --version
howdone --dependencies
```

The Markdown analysis command accepts the output and display options below.
The help, version, and dependency commands cannot be combined with a Markdown
path or analysis options. `-h` is an alias for `--help`, and `-v` is an alias
for `--version`.

```text
howdone <markdown-path> --format decimal
howdone <markdown-path> --format percentage
howdone <markdown-path> --precision 3
howdone <markdown-path> --show-trailing-zeros
howdone <markdown-path> --tree
howdone <markdown-path> --details
howdone <markdown-path> --json
howdone <markdown-path> --max-label-clusters 15
howdone <markdown-path> --no-truncate
howdone <markdown-path> --silent
howdone <markdown-path> --merge-frontmatter
howdone <markdown-path> --merge-frontmatter --frontmatter-weight 0.5
howdone <markdown-path> --merge-frontmatter --strict
```

`howdone --dependencies` prints the published CLI's direct runtime
dependencies, one `name@version` per line. It does not read a Markdown file.

The complete CLI input, output, and frontmatter syntax is defined in the
[CLI syntax contract](docs/syntax.md).

With only a Markdown path, the CLI prints the overall percentage, for example `75%`. Use `--format decimal` for a
decimal value such as `0.75`, or `--format percentage`/`--percentage` for an explicit percentage. `--tree`, `--details`,
and `--json` are mutually exclusive. JSON output contains the complete numeric report; labels are complete by default
and can be truncated with an explicit label limit. `--no-truncate` and an explicit `--max-label-clusters` are
mutually exclusive.

`--json` writes a JSON object document, not a quoted JSON string, so it can be
used directly in a command-line pipeline. A complete pipeline example appears
under [Common commands](#common-commands).

The path is passed to Node's platform-native `node:path` and `node:fs` implementations. The CLI does not hand-write a
Windows-path parser or translate one operating system's path syntax on another operating system. Relative paths,
absolute paths, Unicode names, spaces, and the platform's native separators are therefore resolved by the runtime on the
system where the command runs.

## What you can do

HowDone can:

- measure GFM task-list completion in ordinary Markdown;
- keep Markdown branches, leaves, and implicit task-bearing ancestors in a statistical tree;
- ignore checkbox-looking text in paragraphs, quotes, tables, code blocks, and metadata strings;
- read YAML and TOML frontmatter as independent checklist sources;
- show a concise percentage, a tree, detailed statistics, or a machine-readable JSON object;
- keep frontmatter and Markdown separate, or explicitly merge their calculated results;
- preserve source order when several YAML and TOML headers are present; and
- provide output that is suitable for shell pipelines and tools such as `jq`.

## Options

The command accepts one Markdown path and the following options. Options may be
written before or after the path. A path containing spaces may be quoted by the
shell. Value options also accept `--option=value`. Use `--` before a path that
begins with `-`.

| Option | What it does |
| --- | --- |
| `<markdown-path>` | Reads one `.md` or `.markdown` file. Relative and absolute paths use the current Node platform's native rules. |
| `--format decimal` | Prints a value from `0` to `1`, such as `0.75`. |
| `--format percentage` | Prints a percentage, such as `75%`. This is the default. |
| `--decimal` | Alias for `--format decimal`. |
| `--percentage` | Alias for `--format percentage`. |
| `--precision N` | Selects decimal places. Percentages allow `0` through `100`; decimals allow `1` through `100`. |
| `--show-trailing-zeros` | Shows zeroes to the selected precision. `--keep-trailing-zeros` is an alias. |
| `--no-trailing-zeros` | Hides trailing zeroes. `--trim-trailing-zeros` is an alias and this is the default. |
| `--tree` | Shows the completion tree and derived percentage for every statistical node. |
| `--details` | Shows overall, per-level, and per-root statistics. |
| `--json` | Writes one real JSON object document. It can be passed directly to another command. |
| `--max-label-clusters N` | Truncates labels to `N` Unicode grapheme clusters, preserving user-perceived characters. |
| `--no-truncate` | Disables label truncation. It conflicts with `--max-label-clusters`. |
| `--merge-frontmatter` | Combines at least two source components for the selected output: every frontmatter section counts once and the Markdown body counts once. |
| `--frontmatter-weight N` | With a valid merge and a Markdown checklist side, gives all frontmatter the share `N`, where `0 < N < 1`. |
| `--strict` | Converts warnings into errors. |
| `--silent`, `-s` | Suppresses process warnings. Errors are still reported; `-s` is the npm-compatible short spelling. |
| `--` | Ends option parsing so the following value is treated as the path. |

Defaults are explicit and stable:

- format: percentage;
- percentage precision: `2` decimal places;
- decimal precision: `4` decimal places;
- trailing zeroes: hidden;
- terminal tree/details label limit: `10` Unicode grapheme clusters;
- JSON labels: complete, with no truncation unless `--max-label-clusters N` is supplied.

`--tree`, `--details`, and `--json` are mutually exclusive. JSON always emits
raw numeric fields, so `--format`, `--precision`, and the trailing-zero options
have no effect there. Supplying any of those options with `--json` emits a
warning and leaves the JSON values unchanged. `--json --no-truncate` is a
valid no-op and does not warn; `--json --max-label-clusters N` is meaningful
because it requests label truncation.

Hard errors include unknown options, invalid option values, invalid paths or
source syntax, mutually exclusive output modes, `--no-truncate` together with
`--max-label-clusters`, and both a show-trailing-zero option and a
no-trailing-zero option in one command. These always fail, including with
`--silent`.

Warnings cover ignored JSON display options and invalid merge/weight requests.
A valid frontmatter weight is meaningful only with `--merge-frontmatter`, at
least one frontmatter checklist root, and at least one Markdown checklist root.
A weight without that situation is invalid; `0`, `1`, a value outside the
interval, and a non-decimal value are illegal. Warnings are emitted through the
process warning channel and leave the ordinary result unchanged by default.
`--silent` suppresses them, while `--strict` reports them as errors.

The format aliases (`--format`, `--decimal`, and `--percentage`) cannot select
different formats in one command. The trailing-zero options are also
mutually exclusive: use either the show/keep form or the no/trim form.

The exact input rules, ignored and rejected forms, output layouts, JSON fields,
and merge examples are defined in the [syntax contract](docs/syntax.md).

## Common commands

```bash
# The default overall percentage
howdone tasks.md

# A detailed terminal view
howdone tasks.md --tree --no-truncate

# A machine-readable pipeline
howdone tasks.md --json | jq '.progress.percentage'

# Merge two or more frontmatter sections and/or a Markdown body
howdone tasks.md --merge-frontmatter

# Give the aggregated frontmatter side half of the merged result
howdone tasks.md --merge-frontmatter --frontmatter-weight 0.5
```

## Example

Create a file named `tasks.md`:

```markdown
- Plan the release
    - [x] Finish the implementation
    - [ ] Publish the package
```

Run:

```bash
howdone tasks.md
```

The default output is the overall completion percentage:

```text
50%
```

## Calculation model

Remark parses Markdown into mdast. The Remark adapter maps only the relevant list structure to a small
library-independent document model. The core then applies these rules:

- A task list item with no statistical children is a leaf: checked is `1`, unchecked is `0`.
- A list item in either an ordered or unordered Markdown list with statistical
  children is a Markdown branch. Its children may be Markdown branches or
  leaves; its own checkbox state is ignored, and its progress is the average of
  its children.
- A plain list item with task descendants becomes an implicit statistical node.
- A plain list item, and any plain subtree, with no task descendants is discarded.
- Root nodes have equal weight.
- Headings, ordinary paragraphs, code blocks, tables, HTML comments, and frontmatter strings do not create Markdown task nodes.

### YAML and TOML frontmatter

YAML and TOML frontmatter are optional sources in addition to the Markdown body.
HowDone recognizes boolean checklist values, named `name`/`done` records, and
child containers according to each format's own data model. The source format
remains authoritative: YAML may express heterogeneous collections, while TOML
uses its homogeneous-array rules. Frontmatter section names such as `checklist`
and `tasks` have no special meaning.

An empty document, a body-only document, and a document with exactly one
frontmatter section and no Markdown body keep the simple single-source
presentation. The default command prints one percentage; tree, details, and
JSON show that source directly. A document with both a body and frontmatter uses source-labelled
sections in tree/details and nested `frontmatter`/`markdown` results in JSON;
frontmatter is listed before Markdown because it is the source prefix.
Multiple frontmatter sections are also kept separate in their source order.
Frontmatter is recognized only as a top-level prefix. A `---` or `+++` block
inserted after Markdown body content stays ordinary Markdown, even when its
contents are valid YAML or TOML. This is the defined ambiguity rule: the
delimiter already has Markdown meaning, especially as a thematic break, so a
middle-of-document block is resolved as Markdown rather than frontmatter. Move
it to the beginning when it should be metadata.
Use `--merge-frontmatter` when you want the aggregated frontmatter result and
the Markdown result to become one calculated result. Multiple headers can be
merged without a body, but a frontmatter weight needs both sides to have
checklist roots. See the syntax contract for the complete legality and output
rules.

The complete user-facing source contract, including valid Markdown, YAML, and
TOML layouts and the exact JSON fields, is in [`docs/syntax.md`](docs/syntax.md)
and is included in the published `howdone-cli` package.

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

Labels are truncated only when a display mode has truncation enabled. The default limit is 10 Unicode grapheme clusters,
not JavaScript UTF-16 code units. This keeps emoji, flags, ZWJ sequences, combining marks, and CJK characters intact.
JSON keeps complete labels by default; `--json --max-label-clusters N` enables the same label truncation.

Percentage output uses 2 decimal places by default and decimal output uses 4.
Trailing zeroes are hidden by default, so `50.103%` is displayed as `50.1%`;
`--show-trailing-zeros` preserves the selected precision. `--precision N`
accepts 0 through 100 for percentages and 1 through 100 for decimal output.

The truncation suffix is `...`. Use the options above to change display
behavior for the current command; invalid option values produce a non-zero
exit code with a clear error.

## License

HowDone is licensed under the [Apache License 2.0](LICENSE).

Copyright 2026 JeongHan-Bae.

For architecture, development, testing, release, and contribution details,
see the [development guide](docs/development.md), [`AGENTS.md`](AGENTS.md), and
the [contribution guide](CONTRIBUTING.md).
The complete user-facing [syntax contract](docs/syntax.md) is included in the
published `howdone-cli` package.
