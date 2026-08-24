# API contract

The supported programmatic API is intentionally small. A published package
consumer imports the compiled core entry from `howdone`; repository tests may
still import individual source modules when a precise stage boundary is under
test. The package does not expose adapters as a second implementation of the
core API.

## Pipeline

The core pipeline accepts a `MarkdownLexer` port. The adapter import below is
the repository composition example; the published package exposes the
compiled core contracts, not the repository's default adapter assembly.

```ts
import { runMarkdownPipeline, TypedAstParser } from "howdone";
import { defaultRemarkLexer } from "./src/adapters/markdown/remark-lexer.ts";

const document = runMarkdownPipeline(
  source,
  defaultRemarkLexer,
  new TypedAstParser(),
  "tasks.md",
);
```

`SourceDocument` contains the original source, local `LexerToken[]`, and local `DocumentAst`. The source text is preserved for diagnostics; later display adapters must not mutate it. `DocumentAst.body` is the Markdown `RootAst`; `DocumentAst.frontmatter` contains separate YAML/TOML sections.

## Progress API

```ts
import { calculateProgress } from "./src/core/index.ts";

const markdown = calculateProgress(document.ast.body);
```

The YAML/TOML value parser decodes each section, and the core classifier turns
the parsed value into semantic checklist containers and their entries before
they reach the progress tree:

```ts
interface FrontmatterChecklistEntry {
  label: string;
  checked: boolean | null;
  children?: FrontmatterChecklistEntry[];
}

interface FrontmatterChecklist {
  type: "checklist";
  path: string[];
  entries: FrontmatterChecklistEntry[];
}

interface FrontmatterProgress {
  format: "yaml" | "toml";
  checklists: FrontmatterChecklist[];
  progress: ProgressResult;
}
```

A `FrontmatterChecklist` is a recognized container, not one checkbox. Its
`entries` are leaf checkboxes when `checked` is boolean and derived child
containers when `checked` is `null` with `children`; these are frontmatter
nodes, not Markdown branch items. The complete recognition rules, including
root boundaries, named records, unnamed sequences, YAML/TOML differences, and
rejection behavior, are defined in [`docs/syntax.md`](syntax.md). The API
guarantee is that the decoded value has already passed the format-specific
parser and the core classifier has returned only recognized checklist shapes.

`ProgressResult` contains:

```ts
interface ProgressResult {
  rootCount: number;
  explicitCheckboxCount: number;
  implicitNodeCount: number;
  nodeCount: number;
  completedEquivalent: number;
  progress: number;   // 0..1
  percentage: number; // 0..100
  roots: CheckboxNode[];
}
```

`CheckboxNode.progress` is recursively calculated. Leaf states use `1`/`0`; branch states average statistical children and ignore the node's own `checked` value. `completedEquivalent` is the sum of root progress values and roots have equal weight.

## Output API

`ResolvedDisplayOptions` controls terminal formatting:

```ts
interface ResolvedDisplayOptions {
  maxLabelClusters: number;
  ellipsis: string;
  truncate: boolean;
  progressFormat: "decimal" | "percentage";
  precision: number;
  showTrailingZeros: boolean;
}
```

Percentage output defaults to two decimal places and decimal output defaults to
four. Trailing zeroes are omitted by default. Percentage precision may be `0`;
decimal precision must be at least `1`. Tree/details truncate labels to 10
grapheme clusters by default; JSON labels remain complete unless an explicit
limit is requested.

JSON contains raw numeric fields, so explicitly supplied format, precision, and
trailing-zero display options have no effect and produce a process warning.
`--json --no-truncate` is a valid no-op without a warning, while
`--json --max-label-clusters N` requests JSON label truncation. Output-mode,
truncation, and trailing-zero conflicts are hard errors. Warnings are
suppressed by `--silent` and upgraded to errors by `--strict`.

`JsonRenderer` serializes a `ProgressReport`. The presence fields are internal
layout signals used by the application and are not emitted by the JSON
renderer:

```ts
interface ProgressReport {
  source: { path: string };
  frontmatter?: FrontmatterProgress[];
  frontmatterPresent?: boolean;
  markdown?: ProgressResult;
  markdownPresent?: boolean;
  presentation?: "separate" | "merged";
  frontmatterWeight?: number;
  progress: ProgressResult;
}
```

For one source channel, the JSON result is intentionally flat:

```json
{
  "source": { "path": "tasks.md" },
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

This flat shape applies to a body-only document and to a frontmatter-only
document with exactly one section. It also applies when that channel has no
recognized checklist nodes. A document with both a body and frontmatter, or
with multiple frontmatter sections, uses the nested shape:

```json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 0,
    "explicitCheckboxCount": 0,
    "implicitNodeCount": 0,
    "nodeCount": 0,
    "completedEquivalent": 0,
    "progress": 0,
    "percentage": 0,
    "roots": []
  },
  "presentation": "separate",
  "frontmatter": [
    {
      "format": "yaml",
      "checklists": [],
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
  ],
  "markdown": {
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

In the nested shape, `progress` is the report-level root-count summary across
the available channels when presentation is `"separate"`. `frontmatter` is
listed before `markdown` because frontmatter is the source prefix. It contains
one entry per frontmatter section, in source order; `markdown` is present only
when a Markdown body exists. `--merge-frontmatter` changes
`presentation` to `"merged"` and makes `progress` the weighted merged result;
the channel results remain available for comparison. Sections are never merged
as YAML/TOML documents, even when adjacent sections use the same format or the
same key/table name. `--merge-frontmatter` requires at least two source
components; each frontmatter section and the Markdown body count as one. With
no `--frontmatter-weight`, all frontmatter roots form one side whose weight is
`frontmatter root count / (frontmatter root count + Markdown root count)`; roots
within that side retain root-count weighting. `--frontmatter-weight N` replaces
that derived weight for all frontmatter when `0 < N < 1`. A numeric weight
without merge is invalid, while a value outside `(0, 1)` or a non-decimal value
is illegal. Both cases emit a process warning and are ignored by default;
`--strict` returns an error and `--silent` suppresses the warnings. Multiple
frontmatter sections may be merged without Markdown, but a frontmatter weight
is invalid when Markdown has no checklist roots.

JSON labels remain complete when no display options are passed. The CLI passes
label options only when truncation was explicitly requested, so
`--json --max-label-clusters N` truncates labels without changing numeric
fields. `TerminalRenderer` applies `ResolvedDisplayOptions` to the concise,
tree, and details output values and labels.
