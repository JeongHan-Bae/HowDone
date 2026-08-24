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

[![License](https://img.shields.io/github/license/JeongHan-Bae/HowDone)](https://github.com/JeongHan-Bae/HowDone?tab=Apache-2.0-1-ov-file#readme)

</div>

**HowDone** answers “How done is this Markdown?” It is a local, cross-platform CLI that analyzes hierarchical Markdown task
lists, calculates overall and per-level completion, and never modifies or uploads the source file.

## Install and run

From this project directory:

```bash
npm install
npm link
howdone ./tasks.md
```

The package can also be installed from a local package path:

```bash
npm install /path/to/HowDone
npx howdone ./tasks.md
```

The package is published as `howdone`; install it globally or run it through `npx`:

```bash
npm install --global howdone
howdone README.md
npx howdone README.md
```

The npm package is `howdone` and the executable is `howdone`. Node.js 18.18 or newer is required.

## Usage

```text
howdone <markdown-path>
howdone <markdown-path> --format decimal
howdone <markdown-path> --format percentage
howdone <markdown-path> --precision 3
howdone <markdown-path> --show-trailing-zeros
howdone <markdown-path> --tree
howdone <markdown-path> --details
howdone <markdown-path> --json
howdone <markdown-path> --max-label-clusters 15
howdone <markdown-path> --no-truncate
howdone --help
howdone --version
```

With only a Markdown path, the CLI prints the overall percentage, for example `75%`. Use `--format decimal` for a
decimal value such as `0.75`, or `--format percentage`/`--percentage` for an explicit percentage. `--tree`, `--details`,
and `--json` are mutually exclusive. JSON output contains the complete numeric report; labels are complete by default
and can be truncated with an explicit label limit.

The path is passed to Node's platform-native `node:path` and `node:fs` implementations. The CLI does not hand-write a
Windows-path parser or translate one operating system's path syntax on another operating system. Relative paths,
absolute paths, Unicode names, spaces, and the platform's native separators are therefore resolved by the runtime on the
system where the command runs.

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
- A list item with statistical children is a branch. Its own checkbox state is ignored, and its progress is the average
  of its children.
- A plain list item with task descendants becomes an implicit statistical node.
- A plain list item with no task descendants is discarded.
- Root nodes have equal weight.
- Headings, ordinary paragraphs, code blocks, tables, HTML comments, and frontmatter do not create task nodes.

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

Percentage output uses 2 decimal places by default and decimal output uses 4. Trailing zeroes are hidden by default, so
`50.103%` is displayed as `50.1%`; `--show-trailing-zeros` preserves the selected precision. `--precision N` accepts 0
through 100 for percentages and 1 through 100 for decimal output.

HowDone uses these fixed display defaults:

- maximum label length: 10 Unicode grapheme clusters;
- ellipsis: `...`;
- percentage precision: 2 decimal places;
- decimal precision: 4 decimal places;
- trailing zeroes: hidden.

Use the CLI options above to change display behavior for the current command.
Invalid option values produce a non-zero exit code with a clear error.

## License

HowDone is licensed under the [Apache License 2.0](LICENSE).

Copyright 2026 JeongHan-Bae.

For architecture, development, testing, release, and contribution details,
see the [development guide](https://github.com/JeongHan-Bae/HowDone/blob/main/docs/development.md),
[`AGENTS.md`](https://github.com/JeongHan-Bae/HowDone/blob/main/AGENTS.md), and
the [contribution guide](https://github.com/JeongHan-Bae/HowDone/blob/main/CONTRIBUTING.md).
