# HowDone CLI guide

This is the complete usage guide for `howdone-cli`. It describes installation,
command forms, option ownership, output modes, terminal behavior, diagnostics,
and frontmatter display. The source and result syntax, including the JSON
mapping, is in the [source and result syntax contract](syntax.md).

## Install and run

Install the primary CLI package in a project:

```bash
npm install howdone-cli
npx howdone-cli tasks.md
```

Install it globally when the command should be available directly:

```bash
npm install --global howdone-cli
howdone tasks.md
howdone-cli tasks.md
```

The package includes the matching `howdone` Core package. The two installed
command names use the same CLI implementation.

## Command forms

HowDone has four command forms. Only the Markdown-path form reads and analyzes
a file:

```text
howdone <markdown-path> [options]
howdone --help
howdone --version
howdone --dependencies
```

| Command form      | Behavior                                                                                                   | Output target                           |
|-------------------|------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| `<markdown-path>` | Reads the path, recognizes its source channels, calculates progress, and selects the requested report mode | Report on stdout; diagnostics on stderr |
| `--help`, `-h`    | Prints the CLI information document; does not read Markdown                                                | Terminal output on stdout               |
| `--version`, `-v` | Prints the CLI version information document; does not read Markdown                                        | Terminal output on stdout               |
| `--dependencies`  | Prints direct runtime dependencies; does not read Markdown                                                 | Terminal output on stdout               |

The three information commands are standalone. They may be combined with the
global options only. A Markdown path or a primary analysis option combined with
one of them is a hard argument error.

## Option ownership

The CLI has two option groups:

| Option group            | Applies to                               | Purpose                                                                                  |
|-------------------------|------------------------------------------|------------------------------------------------------------------------------------------|
| Primary command options | `howdone <markdown-path> [options]` only | Select analysis display, numeric formatting, label handling, and frontmatter composition |
| Global options          | All four command forms                   | Control diagnostics and terminal delivery                                                |

The help document presents these groups separately as `Options` and `Global
options`. The standalone information commands do not silently accept primary
analysis options.

Value options accept either separated or equals syntax:

```text
howdone tasks.md --precision 3
howdone tasks.md --precision=3
howdone tasks.md --frontmatter-weight 0.5
howdone tasks.md --frontmatter-weight=0.5
```

The next argument in a value position is validated as that option's value. An
absent or option-like invalid value is a hard argument error; it is not
reinterpreted as another option or as a path. Unknown options, invalid values,
and extra Markdown paths fail in the same way.

### Markdown path syntax

The `--` delimiter belongs to the Markdown-path form, not to the global
options. It ends option parsing, and the next value is used as the Markdown
path even when that value begins with `-`:

```text
howdone -- --notes.md
```

## Primary command options

These options belong only to the Markdown analysis command.

### Numeric format

| Option                                           | Behavior                                                                                                                                                 |
|--------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--format decimal\|percentage`                   | Selects the numeric format. The default is `percentage`. Both `--format decimal` and `--format=decimal` forms are accepted.                              |
| `--decimal`                                      | Alias for `--format decimal`.                                                                                                                            |
| `--percentage`                                   | Alias for `--format percentage`.                                                                                                                         |
| `--precision N`                                  | Selects the number of decimal places. `N` must be an integer from `0` through `100` for percentage output and from `1` through `100` for decimal output. |
| `--show-trailing-zeros`, `--keep-trailing-zeros` | Keeps zeroes through the selected precision.                                                                                                             |
| `--no-trailing-zeros`, `--trim-trailing-zeros`   | Hides trailing zeroes. This is the default.                                                                                                              |

The format aliases cannot select different formats in one invocation. The
show/keep and no/trim trailing-zero groups are also mutually exclusive. These
conflicts are hard errors.

With only a Markdown path, the default output is the overall percentage. The
terminal defaults are percentage precision `2`, decimal precision `4`, and
hidden trailing zeroes. For example, a progress value of `0.75` is displayed as
`75%` by default and as `0.75` with `--format decimal`.

### Report mode

| Option      | Behavior                                                   |
|-------------|------------------------------------------------------------|
| `--tree`    | Displays the statistical progress tree.                    |
| `--details` | Displays the overall, level, and root statistics.          |
| `--json`    | Selects the JSON data document for command-line pipelines. |

The three report modes are mutually exclusive. If none is supplied, a single
source component produces the concise percentage; two or more source
components produce expanded, source-labelled terminal sections.

### Labels and truncation

| Option                   | Behavior                                                                                       |
|--------------------------|------------------------------------------------------------------------------------------------|
| `--max-label-clusters N` | Limits displayed labels to `N` Unicode grapheme clusters. `N` must be a positive safe integer. |
| `--no-truncate`          | Disables label truncation.                                                                     |

Tree and details labels use a default limit of `10` grapheme clusters. JSON
labels are complete by default. `--no-truncate` and
`--max-label-clusters N` are mutually exclusive. Truncation changes a display
copy only; it does not mutate the progress report.

### Frontmatter composition

| Option                   | Behavior                                                                                                                                                    |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--merge-frontmatter`    | Combines all frontmatter sections into one frontmatter side and, when a body exists, combines that side with the body; it is valid whenever at least two source components exist. |
| `--frontmatter-weight N` | Assigns `N` of the combined progress to the aggregated frontmatter side when a valid merge has checklist roots on both sides. `N` must satisfy `0 < N < 1`. |

Each frontmatter section is a source component, and the Markdown body is one
source component. Repeated YAML/TOML sections are parsed independently and
aggregated in source order before a merge. Without an explicit weight, the
frontmatter share is based on its root count relative to the Markdown root
count.

`--frontmatter-weight` without `--merge-frontmatter`, or a valid weight that
cannot affect the selected source shape, is a warning-level ignored option by
default. `--silent` suppresses that warning and `--strict` turns it into an
error. A missing, non-decimal, zero, one, or out-of-range value is an invalid
value and is always a hard error; `--silent` and `--strict` do not downgrade it.

## Global options

These options are accepted by the Markdown command and by `--help`,
`--version`, and `--dependencies`.

| Option           | Behavior                                                                                              |
|------------------|-------------------------------------------------------------------------------------------------------|
| `--silent`, `-s` | Suppresses warning diagnostics. Errors remain visible on stderr.                                      |
| `--strict`       | Converts warning conditions into errors and returns status `1`. It does not make invalid input valid. |
| `--no-color`     | Requests plain output from terminal and JSON delivery.                                                |
| `--no-pager`     | Requests direct output without the in-process Pager.                                                  |

`--silent`, `--strict`, `--no-color`, and `--no-pager` are not primary analysis
options. They do not read Markdown or change the progress calculation when
used with an information command.

When `--strict` and `--silent` are both present, strict handling takes
precedence: a warning condition becomes an error instead of being suppressed.

## Input source behavior

The input syntax is documented completely in the [source and result syntax
contract](syntax.md). The CLI accepts relative and absolute paths using the
current platform's native `node:path` and `node:fs` behavior. It reads only
`.md` and `.markdown` files. Unicode names, spaces, and native path separators
are passed to the runtime without a hand-written foreign-platform parser.

A source can contain a Markdown body, a prefix of YAML/TOML frontmatter
sections, or both. Markdown and each frontmatter section are calculated as
separate channels first. A body-only or one-section frontmatter-only document
uses the concise single-source presentation. Two or more source components use
expanded source-labelled sections for terminal output and grouped fields for
JSON. An explicit merge aggregates all frontmatter sections first, then merges
that side with the body when present.

Checkbox-looking text in ordinary paragraphs, quotes, tables, code blocks, and
frontmatter strings is not a Markdown task. Only the source forms recognized
by the [source and result syntax contract](syntax.md) contribute progress
nodes.

## Output modes

### Terminal report output

The terminal renderer receives a semantic progress report. Its default output
is a percentage for one source component and source-labelled percentages for
multiple components. Tree output shows statistical roots and descendants.
Details output shows counts by level and root. Multiple source channels are
labelled and preserve source order.

The terminal output model keeps text roles separate. Headings use the terminal
`accent` semantic. CLI commands, options, and arguments use `code`; in a
non-TTY representation the CLI adds backticks around code, while a TTY uses a
distinct code color and font style without backticks or bold. File and
dependency names use `reference`; they do not receive code backticks. The code
semantic is intentionally distinct from `accent`.

The version value is an accent value. Dependency entries are references. Help,
version, and dependency documents all use the same terminal output path as
reports.

### JSON output

`--json` writes one JSON object document to stdout rather than a quoted JSON
string. The complete source-to-result mapping is defined in the [source and
result syntax contract](syntax.md). A minimal single-source document has this
shape:

```json
{
  "source": {
    "path": "tasks.md"
  },
  "progress": {
    "rootCount": 0,
    "explicitCheckboxCount": 0,
    "implicitNodeCount": 0,
    "nodeCount": 0,
    "completedEquivalent": 0,
    "progress": 0,
    "percentage": 0,
    "roots": []
  }
}
```

The `roots` array contains the complete statistical tree. The numeric fields
are raw values and are not affected by terminal format or precision.

For multiple source channels, JSON also preserves `frontmatter` sections in
source order, the `markdown` result when a body exists, `presentation` as
`"separate"` or `"merged"`, and `frontmatterWeight` when an explicit merge
weight is used. A merged report keeps the source results as metadata while its
top-level `progress` is the combined result.

JSON ignores explicit `--format`, `--decimal`, `--percentage`, `--precision`,
and trailing-zero options because those options describe text formatting. The
combined ignored groups produce one warning by default. `--strict` turns the warning into
an error, and `--silent` suppresses it. `--json --no-truncate` is a silent
no-op. `--json --max-label-clusters N` requests a truncated JSON copy.

JSON output contains data only. Warning and error documents are never inserted
into the JSON object or stdout, so the result remains directly usable by `jq`:

```bash
howdone tasks.md --json | jq '.progress.percentage'
```

If stderr is explicitly redirected into stdout with `2>&1`, the caller has
chosen to mix diagnostics into the pipeline.

## TTY, color, and Pager behavior

Terminal and JSON adapters receive independent `color` and `pager` requests.
Without a disabling option, each adapter uses `auto` and decides whether its
own target stream is a TTY. Redirected and piped output is plain and unpaged
by default. `--no-color` and `--no-pager` independently request `never`.

The built-in in-process Pager is used for long stdout output when the selected
adapter's target is an interactive TTY. It supports Up/k, Down/j, PageUp/b,
PageDown/Space, `q`, and Ctrl+C. It does not invoke `less`, a shell, an editor,
or a filesystem viewer. Normal `q` cleanup restores the terminal and leaves
the complete output in scrollback.

Help, version, dependency, terminal report, and JSON stdout use the same
default Pager policy. Diagnostics on stderr never enter the Pager. There is no
force mode: a Pager cannot be provided for a file or pipe.

## Diagnostics and status

Diagnostics are written to stderr. The application preserves warning versus
error meaning, and the terminal adapter selects the visible prefix, color, and
style. Interactive warning diagnostics are yellow and errors are red; redirected
stderr and `--no-color` are plain.

| Condition                                                                                                          | Result                                      |
|--------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| Valid command and report                                                                                           | Status `0`                                  |
| Unknown option, missing value, invalid value, invalid path, unsupported extension, read failure, or parser failure | Error document on stderr and status `1`     |
| Valid option with no effect, such as an unused merge/weight request or ignored JSON text-format option             | Warning on stderr and status `0` by default |
| The same warning with `--silent`                                                                                   | No diagnostic and status `0`                |
| The same warning with `--strict`                                                                                   | Error document on stderr and status `1`     |

Hard errors are never suppressed by `--silent` and are never downgraded by
`--strict`. Argument usage guidance is part of the same stderr error document.

## Common commands

```bash
# Default overall percentage
howdone tasks.md

# Explicit numeric format and precision
howdone tasks.md --format decimal --precision 3

# A tree report without the Pager
howdone tasks.md --tree --no-pager

# Detailed statistics with full labels
howdone tasks.md --details --no-truncate

# JSON for a pipeline
howdone tasks.md --json | jq '.progress'

# Merge frontmatter with the Markdown body
howdone tasks.md --merge-frontmatter --frontmatter-weight 0.5

# Information commands with global options
howdone --help --no-color --no-pager
howdone --version --no-color
howdone --dependencies --no-color
```
