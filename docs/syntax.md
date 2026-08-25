# HowDone CLI syntax contract

This document defines the HowDone source syntax according to the general
conventions of Markdown, the GFM Task List extension, YAML, and TOML. Its
purpose is to remove ambiguity about composition, recognition, rejection, and
display. It does not replace or redefine those underlying format standards.

The contract is organized in this order:

1. source composition and the Markdown body channel;
2. YAML syntax and YAML semantic recognition;
3. TOML syntax and TOML semantic recognition;
4. formatter-only output, meaning frontmatter without a Markdown body;
5. mixed output, meaning frontmatter and a Markdown body together.

The semantic terms below have distinct meanings:

- A `checkbox` is one recognized leaf checklist item with a boolean state. In
  Markdown its state comes from `[ ]`, `[x]`, or `[X]`; in YAML/TOML it comes
  from a boolean value or a leaf record's boolean `done` field.
- A `leaf checklist item` has no statistical children. Its checkbox state is
  either complete or incomplete and contributes `1` or `0`.
- A `Markdown branch` is a Markdown list item with statistical task-list
  children. Its children may be other Markdown branches or leaf checklist
  items, and the two child kinds may be mixed:
  `Markdown branch -> { branch | leaf }`. Its progress is derived from its
  children, so its own checkbox marker is ignored. This term applies to
  Markdown list items only.
- The output's generic `branch node` count means any statistical node with
  children. For YAML/TOML output, that node came from a frontmatter container;
  it is not a Markdown branch item.
- A `frontmatter checklist container` is a YAML/TOML mapping, table, sequence,
  or array-of-tables recognized as progress data. A non-empty mapping/table
  below a named property is a boolean container only when every direct value is
  boolean. A mapping/table with a string `name` and boolean `done` is instead
  one named leaf; extra fields, including nested mappings/tables, are ignored.
  A mapping/table that is neither form is ordinary at that level, and nested
  candidates are evaluated independently.
- A sequence below a named property has exactly one of two frontmatter roles:
  an unnamed boolean sequence, whose leaves are booleans and whose child
  containers are unnamed nested sequences, or a named-record sequence, whose
  every item has a string `name` and boolean `done`. In the unnamed form YAML
  may mix direct boolean leaves with nested unnamed sequence containers:
  `YAML container -> { container | leaf }`. A named record cannot be inserted
  into that unnamed sequence. TOML arrays must keep one direct element kind:
  `TOML container -> { container } | { leaf }`. These are frontmatter
  relationships, not Markdown branches.

The JSON field `checklists` names recognized frontmatter containers; its
`entries` are the items inside those containers. A syntactically valid YAML or
TOML value is not necessarily a checklist container or a checkbox. A boolean
becomes a checkbox only when it occurs in a recognized container; a root
boolean field is intentionally ignored.

## CLI command forms

The CLI exposes four independent command forms:

```text
howdone <markdown-path> [options]
howdone --help
howdone --version
howdone --dependencies
```

Only the Markdown-path form enters the source pipeline. The help, version, and
dependency forms cannot be combined with a Markdown path or analysis options.
`--dependencies` prints the CLI's direct runtime dependencies as one
`name@version` entry per line. `-h` aliases `--help`, and `-v` aliases
`--version`.

## 1. Source composition

### 1.1 Two optional channels

A HowDone source has two independent channels:

- the Markdown body channel;
- the frontmatter channel, made from YAML and/or TOML sections.

Each channel is optional. These source shapes are valid:

| Source shape | Body | Frontmatter | Meaning |
| --- | --- | --- | --- |
| Empty | absent | absent | Valid source with zero progress nodes |
| Body-only | present | absent | Base Markdown behavior |
| Formatter-only | absent | present | YAML/TOML progress without Markdown |
| Mixed | present | present | Separate channels with optional merging |

The complete source order is always:

````text
frontmatter section 1   (optional)
frontmatter section 2   (optional)
...
frontmatter section N   (optional)
Markdown body            (optional)
````

Formally, the source layout is:

````text
Document ::= FrontmatterSection^N MarkdownBody?
N >= 0
````

`FrontmatterSection` is one complete YAML or TOML section, and all `N` sections
are a contiguous prefix. `MarkdownBody` is one optional Markdown channel that
may contain any number of Markdown blocks. Therefore a document has zero or
more frontmatter sections followed by at most one body position; it does not
have a second frontmatter position after that body.

Frontmatter is a prefix: it belongs at the top of the document, before the
Markdown body. Only a top-level block in that prefix is a frontmatter section.
After Markdown body content has started, a matching `---` or `+++` block is
ordinary Markdown, even when the lines inside it are valid YAML or TOML. This
is a defined ambiguity rule, not undefined behavior. The delimiter has a
Markdown meaning of its own, especially as a thematic break, so the grammar
resolves an ambiguous middle-of-document block in favor of the ordinary
Markdown meaning. It is not a frontmatter section and does not create a
separate progress channel. Move the block to the document prefix when it is
intended to be metadata.

### 1.2 Frontmatter section delimiters

A YAML section uses a matching pair of `---` lines. A TOML section uses a
matching pair of `+++` lines. The opening and closing delimiter must use the
same format:

````markdown
---
title: Release
---

+++
title = "Release"
+++
````

Blank lines may separate sections. Multiple sections may repeat a format or
alternate formats:

````markdown
---
title: YAML one
---

+++
title = "TOML"
+++

---
title: YAML two
---

# Body

- [x] Complete task
````

Every section is parsed as its own YAML or TOML value. A YAML string inside a
frontmatter section is data; it is not parsed again as Markdown.

The format sequence has no alternation restriction. All of these are valid
frontmatter prefixes when every section is otherwise valid:

| Section sequence | Syntax behavior | Calculation and display behavior |
| --- | --- | --- |
| YAML, YAML | Parse two independent YAML sections | Aggregate recognized roots; retain two YAML sections in source order |
| TOML, TOML | Parse two independent TOML sections | Aggregate recognized roots; retain two TOML sections in source order |
| YAML, TOML | Parse one section of each format | Aggregate recognized roots; retain YAML then TOML |
| TOML, YAML | Parse one section of each format | Aggregate recognized roots; retain TOML then YAML |
| YAML, TOML, TOML, YAML | Parse four independent sections | Aggregate recognized roots; retain all four sections in source order |

Repeated YAML sections do not become one YAML document, and repeated TOML
sections do not become one TOML document. A matching key or table name in two
sections does not cause their values to be merged. The report-level calculation
combines the recognized roots from all sections; tree, details, and JSON keep
each section separate unless `--merge-frontmatter` is explicitly requested to
merge the aggregated frontmatter result with the Markdown result.

The following source is valid Markdown. The YAML-shaped block is late, so the
two `---` lines and its contents remain in the Markdown body rather than
becoming frontmatter. The same rule applies even though the contents are valid
YAML: the Markdown thematic-break meaning wins the ambiguity:

````markdown
- [x] Body task

---
checks:
  build: true
  test: false
---
````

Invalid YAML or invalid TOML in a recognized prefix section produces a parser
error. Semantic recognition does not turn invalid source syntax into valid
data. A delimiter-shaped block after body content remains in the Markdown
channel and is not sent to the YAML or TOML value adapter.

### 1.3 Markdown body syntax

The body follows Markdown and GFM Task List syntax. HowDone recognizes a
checkbox marker only when it is part of a real list item:

````markdown
- [ ] Pending item
- [x] Completed item
- [X] Completed item
* [ ] Another pending item
1. [x] An ordered completed item
````

`[ ]` is incomplete. `[x]` and `[X]` are complete. The marker must have the
standard spacing and must belong to an ordered or unordered list item:

````markdown
The text `- [x]` is ordinary text.

The text "- [x]" is still ordinary text.

- [-] Unsupported checkbox spelling
- [ x] Wrong spacing inside the marker
````

### 1.4 Markdown tree behavior

A task item with no task descendants is a leaf checklist item. A checked leaf
contains one complete checkbox and contributes `1`; an unchecked leaf contains
one incomplete checkbox and contributes `0`.

An ordered or unordered list directly in the Markdown document is a statistical
root list. A list nested under a list item belongs to that item's subtree:

````markdown
- Release
  - [x] Build
  - [ ] Publish
````

This creates an implicit `Release` branch at `50%`, with `Build` at `100%` and
`Publish` at `0%`.

If a Markdown list item has statistical children, its own checkbox marker is
ignored and the item becomes a Markdown branch item:

````markdown
- [x] Release
  - [ ] Build
  - [x] Publish
````

`Release` is `50%`, not `100%`. A valid checkbox marker on a leaf item uses its
own state.

An ordinary list item with task descendants becomes an implicit branch. An
ordinary list item and its complete subtree are discarded when no descendant
contains a checkbox marker:

````markdown
- Release
  - Notes with no checkbox anywhere below
  - [x] Build
````

Only `Release` and `Build` are statistical nodes. The plain `Notes` subtree is
discarded. This rule applies to both ordered and unordered lists.

Headings organize the body but never create task nodes:

````markdown
# Release heading

- [x] A task below the heading
````

The heading is not a node. The list item is.

The following contexts do not create Markdown task nodes:

- ordinary paragraphs and inline text;
- headings;
- block quotes;
- tables;
- fenced or indented code blocks;
- HTML and HTML comments;
- frontmatter values;
- malformed or unsupported checkbox markers.

This example contains several checkbox-looking strings but no Markdown task:

````````markdown
The text `- [x]` is ordinary text.

> - [x] This is a quoted list.

| state |
| --- |
| [x] |

```text
- [x] This is code.
```
````````

### 1.5 Base body behavior

For this body:

````markdown
- Release
  - [x] Build
  - [ ] Publish
- [x] Archive
````

#### Default output

````text
75%
````

#### Tree output

````text
Overall completion: 75%

├─ [50%] Release
│  ├─ [100%] Build
│  └─ [0%] Publish
└─ [100%] Archive
````

#### Details output

````text
Overall completion: 75%

Overall statistics:
- Root nodes: 2
- Explicit checkboxes: 3
- Implicit nodes: 1
- Statistical nodes: 4
- Equivalent completed: 1.5 / 2

Level statistics:
- Level 1: 2 nodes, 1 leaf node, 1 branch node
- Level 2: 2 nodes, 2 leaf nodes, 0 branch nodes

Root statistics:
- Release: 50%, 2 child nodes
- Archive: 100%, 0 child nodes
````

#### JSON output

````json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 2,
    "explicitCheckboxCount": 3,
    "implicitNodeCount": 1,
    "nodeCount": 4,
    "completedEquivalent": 1.5,
    "progress": 0.75,
    "percentage": 75,
    "roots": [
      {
        "label": "Release",
        "checked": null,
        "implicit": true,
        "children": [
          {
            "label": "Build",
            "checked": true,
            "implicit": false,
            "children": [],
            "progress": 1,
            "depth": 1
          },
          {
            "label": "Publish",
            "checked": false,
            "implicit": false,
            "children": [],
            "progress": 0,
            "depth": 1
          }
        ],
        "progress": 0.5,
        "depth": 0
      },
      {
        "label": "Archive",
        "checked": true,
        "implicit": false,
        "children": [],
        "progress": 1,
        "depth": 0
      }
    ]
  }
}
````

## 2. YAML syntax and semantic recognition

### 2.1 YAML source syntax

YAML mappings use `name: value`. YAML sequences use `- value`. YAML allows
scalars, mappings, sequences, and nested combinations in one parsed value:

````yaml
title: Release
enabled: true
checks:
  build: true
  test: false
release_states:
  - [true, false]
  - [true, true]
````

HowDone parses the YAML value first. A YAML string such as `"- [x] text"`
remains a string and does not become a Markdown task.

### 2.2 YAML root boundary

The YAML document root is a conservative container:

- a root mapping made only of direct boolean fields does not produce a
  checklist container or any checkbox;
- a root YAML sequence does not produce a checklist container, even when all
  leaves are boolean;
- a root mapping whose own fields include a string `name` and boolean `done`
  produces one leaf checkbox; extra fields are ignored;
- a named root record written under an object name also produces one leaf
  checkbox and makes the object boundary explicit;
- nested properties are evaluated as separate candidates;
- an invalid candidate does not discard valid sibling candidates.

This root-level named record uses `release_item` as the object name. `name` is
the displayed label, and `done` is the state:

````yaml
release_item:
  name: Root named task
  details: root metadata
  done: true
````

The parser also accepts a root object whose own fields include a string `name`
and a boolean `done`; that object is one root leaf checkbox. The named-child
form is used here because it makes the root object boundary explicit. A root
scalar field such as `enable: true` is never a root checkbox by itself.

### 2.3 Valid YAML container and item forms

#### Named boolean mapping

A non-empty mapping below a property name is a named checklist container when
every direct value is boolean. Each direct boolean child is one leaf checkbox;
the mapping supplies one implicit container node in the progress tree. The
property names are the checkbox labels:

````yaml
release_checks:
  build: true
  test: true
  publish: false
````

The property name is a grouping path, not a reserved field name. `checklist`,
`tasks`, and `release_checks` have no special meaning.

#### Named record sequence

A sequence below a property name is a named record container when every item
has a string `name` and a boolean `done`. Each record becomes one leaf
checkbox:

````yaml
release_items:
  - name: Build documentation
    details: release documentation
    done: true
  - name: Publish documentation
    done: false
````

The displayed labels are `Build documentation` and `Publish documentation`.
Extra record fields such as `details` are allowed and do not affect checkbox
state. A single named record under a property is also one valid leaf checkbox.
Every item in this sequence must be a named record. A bare `true` or `false`
cannot appear beside named records; that would mix named and unnamed forms and
the complete sequence is rejected. The `name`/`done` record form is always a
leaf form. Extra record fields, including nested mappings, are ignored; they
do not become statistical children, and `done` remains the leaf state.

#### Unnamed boolean sequence

A non-empty sequence below a property name is an unnamed checklist container
when every leaf value is boolean and every non-leaf value is another sequence.
Each boolean is one leaf checkbox. Each nested sequence is a derived sequence
node whose progress is calculated from its child sequence entries:

````yaml
release_states:
  - [true, false]
  - [true, true]
````

The sequence entries have numeric dotted labels: `0`, `1`, `0.0`, `0.1`, `1.0`,
and `1.1`. A nested sequence is a child checklist container. Its progress is
calculated from its child sequence entries; it is not a checkbox.

#### Named container with separate child forms

A mapping below a named property may contain a named object and an unnamed
sequence as separate child candidates:

````yaml
checks:
  named:
    build: true
    test: false
  unnamed:
    - [true, false]
    - [true, true]
````

`checks.named` is a named boolean container. `checks.unnamed` is an unnamed
sequence container. The parent `checks` mapping is not itself a checklist
container because its direct values are not all boolean; its valid child
containers are evaluated independently.

Naming may transition downward into an unnamed sequence. Once an unnamed
sequence is entered, every descendant must remain boolean or another unnamed
sequence. A named record or named object inside that sequence is not a valid
checkbox or sequence node, so the complete unnamed-sequence container is
rejected.

A mapping with both boolean fields and nested objects/sequences is not a
boolean checklist container. A valid nested child with its own named path may
still be evaluated independently; the mixed parent itself contributes no
checkbox or container node.

### 2.4 Invalid or ignored YAML forms

YAML can parse all of the following values, but HowDone does not recognize them
as the stated checklist container or checkbox.

#### Root boolean mapping

````yaml
enable: true
publish: false
````

These are root scalar fields, not a root checklist container or checkbox. Put
the boolean mapping under a property such as `checks`.

#### Root sequence

````yaml
- true
- false
- [true, false]
````

This is valid YAML syntax but is ignored as progress data because it has no
containing property name.

#### Empty or mixed mapping

An empty mapping is not a checklist container. A mapping with a non-boolean
direct value is not a boolean checklist container at that level:

````yaml
release_checks: {}

release_metadata:
  build: true
  version: "1.0.0"
````

The invalid `release_metadata` object does not poison a valid sibling:

````yaml
valid_checks:
  build: true

invalid_checks:
  build: true
  version: "1.0.0"
````

`valid_checks` is still recognized independently.

#### Non-boolean or empty nested sequence

An unnamed boolean sequence is rejected as a whole when one leaf is not boolean
or when a nested sequence is empty:

````yaml
release_states:
  - [true, "unknown"]
````

````yaml
release_states:
  - [true, false]
  - []
````

HowDone does not extract a smaller checklist container or checkbox from the
valid-looking part.

#### Named record inside an unnamed sequence

An unnamed sequence cannot return to a named record:

````yaml
release_states:
  - [true, false]
  - name: Publish documentation
    done: false
````

The complete `release_states` candidate is rejected. The named record is not
extracted separately from inside the unnamed sequence.

#### Invalid named record sequence

If one record lacks a string `name` or a boolean `done`, the complete record
sequence is ordinary data:

````yaml
release_items:
  - name: Build documentation
    done: true
  - name: Publish documentation
    done: "pending"
````

The first record is not kept as a partial checklist or checkbox.

#### Checkbox-looking YAML strings

````yaml
notes: "- [x] This is a YAML string"
````

The value is YAML data. It is not a Markdown task because it is not in the
Markdown body channel.

## 3. TOML syntax and semantic recognition

### 3.1 TOML source syntax

TOML keys use `name = value`. Tables use `[table_name]`. Arrays use brackets,
and arrays of tables use double brackets:

````toml
title = "Release"

[checks]
build = true
test = false

[[release_items]]
name = "Build documentation"
done = true
````

TOML has a more constrained collection grammar than YAML. At one array level,
the supported TOML parser requires a consistent element kind. A TOML array is
not a YAML-style arbitrary mixture of scalars, nested arrays, and records.

TOML has no bare root array. An array is assigned to a key, and a table or
array-of-tables supplies its containing path.

### 3.2 TOML root boundary

The TOML root table follows the same conservative scalar rule as YAML:

- root direct boolean fields do not produce a checklist container or checkbox;
- a named table or named array below a key may be a checklist container;
- a root table whose own fields include a string `name` and boolean `done`
  produces one leaf checkbox; extra fields are ignored;
- a named root record written as a named table also produces one leaf checkbox;
- TOML arrays must satisfy TOML parsing before semantic recognition begins.

This is a valid named root record:

````toml
[release_item]
name = "Root named task"
details = "root metadata"
done = true
````

The TOML root may also contain `name = "..."` and `done = true` directly; that
root object is one leaf checkbox. The named-table form makes the object name
explicit.

This is not a root checklist container or checkbox:

````toml
enable = true
publish = false
````

### 3.3 Valid TOML container and item forms

#### Named boolean table

A non-empty table is a named boolean checklist container when every direct
value is boolean. Each direct boolean field is one leaf checkbox, and the table
supplies one implicit container node:

````toml
[release_checks]
build = true
test = true
publish = false
````

The table name is a path label. It does not need to be `checklist` or `tasks`.

#### Unnamed boolean sequence below a key

A TOML array below a key is an unnamed sequence checklist container when every
leaf is boolean and the array parses successfully. Each boolean is one leaf
checkbox and each nested array is a derived sequence node. TOML arrays cannot
mix booleans, nested arrays, and records at one array level.

````toml
release_states = [[true, false], [true, true]]
````

The numeric labels are `0`, `1`, `0.0`, `0.1`, `1.0`, and `1.1`. A nested array
is a child checklist container, and its progress is averaged from its boolean
leaves.

#### Named record array

An array of tables is a named record checklist container when every table has a
string `name` and a boolean `done`. Each table becomes one leaf checkbox:

````toml
[[release_items]]
name = "Build documentation"
details = "release documentation"
done = true

[[release_items]]
name = "Publish documentation"
done = false
````

Extra fields are allowed. If one table has an invalid `name` or `done`, the
complete `release_items` container is ordinary data. Every item in this array
must be a named record; a bare boolean cannot appear beside a record. The
`name`/`done` record form is always a leaf form. Extra fields, including nested
tables, are ignored; they do not become statistical children, and `done`
remains the leaf state.

#### Named container with separate child forms

A TOML table may contain a named table and an unnamed sequence as separate
child candidates:

````toml
[checks]
unnamed = [[true, false], [true, true]]

[checks.named]
build = true
test = false
````

`checks.named` is the named boolean container. `checks.unnamed` is the unnamed
sequence container. Once an unnamed sequence is entered, its descendants must
remain boolean or unnamed nested arrays; a named record cannot be inserted.

A TOML table with both boolean fields and nested tables/arrays is not a boolean
checklist container. Its valid named child containers are evaluated
independently.

### 3.4 Invalid or ignored TOML forms

#### Root boolean table

````toml
enable = true
publish = false
````

The root scalar fields are ignored as progress data; they do not become
checkboxes.

#### Bare root array

TOML has no bare root array. An array must be assigned to a key:

````toml
[true, false]
````

This is invalid TOML before checklist recognition.

#### Mixed array element kinds

These arrays are parser errors in the supported TOML grammar:

````toml
release_states = [true, "unknown"]
````

````toml
release_states = [true, [false, true]]
````

The parser rejects them before HowDone can classify them as checklist
containers or ordinary data.

#### Non-boolean leaves in a valid array shape

An array can parse and still fail checklist-container recognition:

````toml
release_states = [["unknown"]]
````

The candidate is ordinary TOML data because its leaf is not boolean.

#### Invalid record array

````toml
[[release_items]]
name = "Build documentation"
done = true

[[release_items]]
name = "Publish documentation"
done = "pending"
````

The complete `release_items` container is rejected. The valid first record is
not extracted separately as a checkbox.

#### Checkbox-looking TOML strings

````toml
notes = "- [x] This is a TOML string"
````

This is TOML data, not a Markdown task.

## 4. Formatter-only output

Formatter-only means that one or more YAML/TOML frontmatter sections exist and
the Markdown body is absent. The YAML and TOML rules in sections 2 and 3 decide
which values become progress nodes.

### 4.1 One YAML or TOML section

Use this YAML source:

````markdown
---
checks:
  build: true
  test: false
---
````

There is no Markdown body. The `checks` mapping becomes one implicit
container node with two explicit checkbox children.

#### Default output

````text
50%
````

#### Tree output

````text
Overall completion: 50%

└─ [50%] checks
   ├─ [100%] build
   └─ [0%] test
````

#### Details output

````text
Overall completion: 50%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 2
- Implicit nodes: 1
- Statistical nodes: 3
- Equivalent completed: 0.5 / 1

Level statistics:
- Level 1: 1 node, 0 leaf nodes, 1 branch node
- Level 2: 2 nodes, 2 leaf nodes, 0 branch nodes

Root statistics:
- checks: 50%, 2 child nodes
````

#### JSON output

````json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 1,
    "explicitCheckboxCount": 2,
    "implicitNodeCount": 1,
    "nodeCount": 3,
    "completedEquivalent": 0.5,
    "progress": 0.5,
    "percentage": 50,
    "roots": [
      {
        "label": "checks",
        "checked": null,
        "implicit": true,
        "children": [
          {
            "label": "build",
            "checked": true,
            "implicit": false,
            "children": [],
            "progress": 1,
            "depth": 1
          },
          {
            "label": "test",
            "checked": false,
            "implicit": false,
            "children": [],
            "progress": 0,
            "depth": 1
          }
        ],
        "progress": 0.5,
        "depth": 0
      }
    ]
  }
}
````

The equivalent TOML source is:

````markdown
+++
[checks]
build = true
test = false
+++
````

It produces the same numeric result and the same flat output shape. With only
one source channel, tree and details do not add a source wrapper, and JSON does
not add a `frontmatter` array.

### 4.2 Multiple frontmatter sections without a body

Use this source:

````markdown
---
checks:
  build: true
---

+++
[checks]
test = false
+++
````

Each header is parsed independently. The two `checks` names do not merge: the
YAML section produces one frontmatter result and the TOML section produces a
second frontmatter result. Their recognized roots are aggregated for the
report-level percentage, while tree/details/JSON retain one section per header
in source order. This example has one root in each section, so its aggregated
percentage is `50%`; that does not mean sections are always weighted equally.

#### Separate tree output

````text
Frontmatter (YAML):

Overall completion: 100%

└─ [100%] checks
   └─ [100%] build

Frontmatter (TOML):

Overall completion: 0%

└─ [0%] checks
   └─ [0%] test
````

#### Separate details output

````text
Frontmatter (YAML):

Overall completion: 100%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 1
- Implicit nodes: 1
- Statistical nodes: 2
- Equivalent completed: 1 / 1

Level statistics:
- Level 1: 1 node, 0 leaf nodes, 1 branch node
- Level 2: 1 node, 1 leaf node, 0 branch nodes

Root statistics:
- checks: 100%, 1 child node

Frontmatter (TOML):

Overall completion: 0%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 1
- Implicit nodes: 1
- Statistical nodes: 2
- Equivalent completed: 0 / 1

Level statistics:
- Level 1: 1 node, 0 leaf nodes, 1 branch node
- Level 2: 1 node, 1 leaf node, 0 branch nodes

Root statistics:
- checks: 0%, 1 child node
````

#### Separate JSON shape

The report has no `markdown` member. It has a report-level `progress`, a
`presentation` value of `"separate"`, and one entry per header in
`frontmatter`:

````json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 2,
    "explicitCheckboxCount": 2,
    "implicitNodeCount": 2,
    "nodeCount": 4,
    "completedEquivalent": 1,
    "progress": 0.5,
    "percentage": 50,
    "roots": [
      {
        "label": "checks",
        "checked": null,
        "implicit": true,
        "children": [
          { "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }
        ],
        "progress": 1,
        "depth": 0
      },
      {
        "label": "checks",
        "checked": null,
        "implicit": true,
        "children": [
          { "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }
        ],
        "progress": 0,
        "depth": 0
      }
    ]
  },
  "presentation": "separate",
  "frontmatter": [
    {
      "format": "yaml",
      "checklists": [
        {
          "type": "checklist",
          "path": ["checks"],
          "entries": [{ "label": "build", "checked": true }]
        }
      ],
      "progress": {
        "rootCount": 1,
        "explicitCheckboxCount": 1,
        "implicitNodeCount": 1,
        "nodeCount": 2,
        "completedEquivalent": 1,
        "progress": 1,
        "percentage": 100,
        "roots": [
          {
            "label": "checks",
            "checked": null,
            "implicit": true,
            "children": [
              { "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }
            ],
            "progress": 1,
            "depth": 0
          }
        ]
      }
    },
    {
      "format": "toml",
      "checklists": [
        {
          "type": "checklist",
          "path": ["checks"],
          "entries": [{ "label": "test", "checked": false }]
        }
      ],
      "progress": {
        "rootCount": 1,
        "explicitCheckboxCount": 1,
        "implicitNodeCount": 1,
        "nodeCount": 2,
        "completedEquivalent": 0,
        "progress": 0,
        "percentage": 0,
        "roots": [
          {
            "label": "checks",
            "checked": null,
            "implicit": true,
            "children": [
              { "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }
            ],
            "progress": 0,
            "depth": 0
          }
        ]
      }
    }
  ]
}
````

`--merge-frontmatter` is valid here because the two headers are two source
components, even though both components are frontmatter. It aggregates the
two frontmatter results into one merged progress tree. There is no
`frontmatterWeight` because there is no Markdown side; a frontmatter weight is
valid only when both frontmatter and Markdown have checklist roots.

#### Merged tree output

````text
Overall completion: 50%

├─ [100%] checks
│  └─ [100%] build
└─ [0%] checks
   └─ [0%] test
````

#### Merged details output

````text
Overall completion: 50%

Overall statistics:
- Root nodes: 2
- Explicit checkboxes: 2
- Implicit nodes: 2
- Statistical nodes: 4
- Equivalent completed: 1 / 2

Level statistics:
- Level 1: 2 nodes, 0 leaf nodes, 2 branch nodes
- Level 2: 2 nodes, 2 leaf nodes, 0 branch nodes

Root statistics:
- checks: 100%, 1 child node
- checks: 0%, 1 child node
````

#### Merged JSON shape

The JSON object keeps `source`, the aggregated `progress`, the
`"presentation": "merged"` field, and the two source-ordered `frontmatter`
entries. It has neither `markdown` nor `frontmatterWeight`. The nested
`ProgressResult` and section objects are the same complete objects shown in
the separate JSON above. If this source had only one header, the merge request
would be invalid: the default behavior would emit a process warning and ignore
the merge, while `--strict` would return an error. `--silent` suppresses the
warning.

### 4.3 YAML, YAML, and TOML sections

Several formatter sections remain separate source documents even when their
format is repeated. A YAML section followed by another YAML section is not one
larger YAML mapping. A later TOML section is not merged into either YAML
section. HowDone parses and displays all three sections in this order:

1. the first YAML section;
2. the second YAML section;
3. the TOML section.

Use this formatter-only source:

````markdown
---
first:
  build: true
---

---
second:
  test: false
---

+++
[third]
publish = true
+++
````

The three sections each contribute one root. Their root progress is `100%`,
`0%`, and `100%`, so the formatter-only report has three roots and overall
progress of `2 / 3 = 66.67%`. The two YAML sections do not become one tree;
they remain two separate YAML sections with the same `format` value.

#### Default output

````text
66.67%
````

#### Tree output

````text
Frontmatter (YAML):

Overall completion: 100%

└─ [100%] first
   └─ [100%] build

Frontmatter (YAML):

Overall completion: 0%

└─ [0%] second
   └─ [0%] test

Frontmatter (TOML):

Overall completion: 100%

└─ [100%] third
   └─ [100%] publish
````

#### Details output

Each section has one implicit container and one explicit leaf. The repeated
YAML sections therefore have identical statistic shapes but remain separate
entries:

````text
Frontmatter (YAML):

Overall completion: 100%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 1
- Implicit nodes: 1
- Statistical nodes: 2
- Equivalent completed: 1 / 1

Level statistics:
- Level 1: 1 node, 0 leaf nodes, 1 branch node
- Level 2: 1 node, 1 leaf node, 0 branch nodes

Root statistics:
- first: 100%, 1 child node

Frontmatter (YAML):

Overall completion: 0%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 1
- Implicit nodes: 1
- Statistical nodes: 2
- Equivalent completed: 0 / 1

Level statistics:
- Level 1: 1 node, 0 leaf nodes, 1 branch node
- Level 2: 1 node, 1 leaf node, 0 branch nodes

Root statistics:
- second: 0%, 1 child node

Frontmatter (TOML):

Overall completion: 100%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 1
- Implicit nodes: 1
- Statistical nodes: 2
- Equivalent completed: 1 / 1

Level statistics:
- Level 1: 1 node, 0 leaf nodes, 1 branch node
- Level 2: 1 node, 1 leaf node, 0 branch nodes

Root statistics:
- third: 100%, 1 child node
````

#### JSON output

With formatter-only input there is no `markdown` member. The report-level
`progress` aggregates all three roots, while `frontmatter` has one entry per
source section and preserves the YAML, YAML, TOML order. This is a JSON object
document, not a quoted JSON string:

````json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 3,
    "explicitCheckboxCount": 3,
    "implicitNodeCount": 3,
    "nodeCount": 6,
    "completedEquivalent": 2,
    "progress": 0.6666666666666666,
    "percentage": 66.66666666666666,
    "roots": [
      {
        "label": "first",
        "checked": null,
        "implicit": true,
        "children": [{ "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }],
        "progress": 1,
        "depth": 0
      },
      {
        "label": "second",
        "checked": null,
        "implicit": true,
        "children": [{ "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }],
        "progress": 0,
        "depth": 0
      },
      {
        "label": "third",
        "checked": null,
        "implicit": true,
        "children": [{ "label": "publish", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }],
        "progress": 1,
        "depth": 0
      }
    ]
  },
  "presentation": "separate",
  "frontmatter": [
    {
      "format": "yaml",
      "checklists": [{ "type": "checklist", "path": ["first"], "entries": [{ "label": "build", "checked": true }] }],
      "progress": { "rootCount": 1, "explicitCheckboxCount": 1, "implicitNodeCount": 1, "nodeCount": 2, "completedEquivalent": 1, "progress": 1, "percentage": 100, "roots": [{ "label": "first", "checked": null, "implicit": true, "children": [{ "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }], "progress": 1, "depth": 0 }] }
    },
    {
      "format": "yaml",
      "checklists": [{ "type": "checklist", "path": ["second"], "entries": [{ "label": "test", "checked": false }] }],
      "progress": { "rootCount": 1, "explicitCheckboxCount": 1, "implicitNodeCount": 1, "nodeCount": 2, "completedEquivalent": 0, "progress": 0, "percentage": 0, "roots": [{ "label": "second", "checked": null, "implicit": true, "children": [{ "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }], "progress": 0, "depth": 0 }] }
    },
    {
      "format": "toml",
      "checklists": [{ "type": "checklist", "path": ["third"], "entries": [{ "label": "publish", "checked": true }] }],
      "progress": { "rootCount": 1, "explicitCheckboxCount": 1, "implicitNodeCount": 1, "nodeCount": 2, "completedEquivalent": 1, "progress": 1, "percentage": 100, "roots": [{ "label": "third", "checked": null, "implicit": true, "children": [{ "label": "publish", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }], "progress": 1, "depth": 0 }] }
    }
  ]
}
````

## 5. Mixed output

Mixed output has both a Markdown body and at least one frontmatter section.
The channels are calculated separately first. The default report keeps those
results available and computes an overall result from their statistical roots.

### 5.1 One frontmatter section and a body

Use this source:

````markdown
---
checks:
  build: true
  test: false
  publish: false
---

- [x] Publish
````

The frontmatter channel has one root and the Markdown channel has one root, so
the derived frontmatter weight is `1 / (1 + 1) = 0.5`. This is a root-count
calculation, not a fixed rule that every header always receives an equal share.
The report-level result is therefore `66.67%`.

#### Default output

````text
66.67%
````

#### Separate tree output

````text
Frontmatter (YAML):

Overall completion: 33.33%

└─ [33.33%] checks
   ├─ [100%] build
   ├─ [0%] test
   └─ [0%] publish

Markdown:

Overall completion: 100%

└─ [100%] Publish
````

#### Separate details output

````text
Frontmatter (YAML):

Overall completion: 33.33%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 3
- Implicit nodes: 1
- Statistical nodes: 4
- Equivalent completed: 0.333333 / 1

Level statistics:
- Level 1: 1 node, 0 leaf nodes, 1 branch node
- Level 2: 3 nodes, 3 leaf nodes, 0 branch nodes

Root statistics:
- checks: 33.33%, 3 child nodes

Markdown:

Overall completion: 100%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 1
- Implicit nodes: 0
- Statistical nodes: 1
- Equivalent completed: 1 / 1

Level statistics:
- Level 1: 1 node, 1 leaf node, 0 branch nodes

Root statistics:
- Publish: 100%, 0 child nodes
````

#### Separate JSON output

The report-level `progress` contains the combined roots, while `frontmatter`
and `markdown` retain their independent results. Frontmatter is listed first
because it precedes the Markdown body:

````json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 2,
    "explicitCheckboxCount": 4,
    "implicitNodeCount": 1,
    "nodeCount": 5,
    "completedEquivalent": 1.3333333333333333,
    "progress": 0.6666666666666666,
    "percentage": 66.66666666666666,
    "roots": [
      {
        "label": "checks",
        "checked": null,
        "implicit": true,
        "children": [
          { "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 },
          { "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 },
          { "label": "publish", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }
        ],
        "progress": 0.3333333333333333,
        "depth": 0
      },
      { "label": "Publish", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 0 }
    ]
  },
  "presentation": "separate",
  "frontmatter": [
    {
      "format": "yaml",
      "checklists": [
        {
          "type": "checklist",
          "path": ["checks"],
          "entries": [
            { "label": "build", "checked": true },
            { "label": "test", "checked": false },
            { "label": "publish", "checked": false }
          ]
        }
      ],
      "progress": {
        "rootCount": 1,
        "explicitCheckboxCount": 3,
        "implicitNodeCount": 1,
        "nodeCount": 4,
        "completedEquivalent": 0.3333333333333333,
        "progress": 0.3333333333333333,
        "percentage": 33.33333333333333,
        "roots": [
          {
            "label": "checks",
            "checked": null,
            "implicit": true,
            "children": [
              { "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 },
              { "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 },
              { "label": "publish", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }
            ],
            "progress": 0.3333333333333333,
            "depth": 0
          }
        ]
      }
    }
  ],
  "markdown": {
    "rootCount": 1,
    "explicitCheckboxCount": 1,
    "implicitNodeCount": 0,
    "nodeCount": 1,
    "completedEquivalent": 1,
    "progress": 1,
    "percentage": 100,
    "roots": [
      { "label": "Publish", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 0 }
    ]
  }
}
````

### 5.2 Merging frontmatter with the body

`--merge-frontmatter` is a presentation and calculation operation over at least
two source components. Every YAML/TOML section counts as one component, and a
Markdown body counts as one. It aggregates frontmatter sections before
combining the aggregated frontmatter side with Markdown when a body exists. It
does not merge repeated YAML sections, repeated TOML sections, or YAML sections
into TOML sections, and it does not alter the individual source-channel
results.

All frontmatter sections are aggregated first. The aggregation keeps every
recognized frontmatter root in source order. Only after that aggregation does
`--merge-frontmatter` combine the frontmatter side with the Markdown side.
Therefore these are distinct operations:

1. YAML plus YAML: parse two YAML documents independently, then aggregate their
   roots;
2. TOML plus YAML: parse one TOML document and one YAML document independently,
   then aggregate their roots;
3. frontmatter plus Markdown: combine the aggregated frontmatter result with
   the Markdown result.

The default frontmatter share is derived from root counts. If the frontmatter
sections contain `F` roots and the Markdown body contains `M` roots, the share
is `F / (F + M)`. A requested `--frontmatter-weight N` replaces that derived
share for the whole frontmatter side; it does not assign a separate share to
each header. A weight is valid only when Markdown has checklist roots as well as
frontmatter roots. A numeric weight without `--merge-frontmatter` is invalid;
`0`, `1`, a value below `0` or above `1`, and a non-decimal value are illegal.
Invalid and illegal weights emit process warnings and are ignored by default;
`--silent` suppresses the warning and `--strict` turns it into an error.

| Frontmatter order | Frontmatter roots | Markdown roots | Default frontmatter share | Example default result |
| --- | ---: | ---: | ---: | ---: |
| YAML, YAML | 2 | 1 | `2 / 3` | `66.67%` when the first YAML root and body root are complete |
| TOML, YAML | 2 | 1 | `2 / 3` | `33.33%` when the TOML root is complete and the YAML and body roots are incomplete |

#### 5.2.1 Two YAML sections and a body

Use this source:

````markdown
---
first:
  build: true
---

---
second:
  test: false
---

- [x] body
````

The separate channels are `100%` for the first YAML section, `0%` for the
second YAML section, and `100%` for Markdown. The default merged result has
three roots and `2 / 3 = 66.67%`. With
`--frontmatter-weight 0.5`, the frontmatter side is weighted as one side:
`0.5 * 0.5 + 0.5 * 1 = 0.75`, so the result becomes `75%`.

The merged tree keeps both YAML roots before the Markdown root:

````text
Overall completion: 66.67%

├─ [100%] first
│  └─ [100%] build
├─ [0%] second
│  └─ [0%] test
└─ [100%] body
````

The corresponding merged details are:

````text
Overall completion: 66.67%

Overall statistics:
- Root nodes: 3
- Explicit checkboxes: 3
- Implicit nodes: 2
- Statistical nodes: 5
- Equivalent completed: 2 / 3

Level statistics:
- Level 1: 3 nodes, 1 leaf node, 2 branch nodes
- Level 2: 2 nodes, 2 leaf nodes, 0 branch nodes

Root statistics:
- first: 100%, 1 child node
- second: 0%, 1 child node
- body: 100%, 0 child nodes
````

The merged JSON is still one JSON object document. It keeps two independent
`frontmatter` entries, followed by `markdown`; `progress` contains all three
roots:

````json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 3,
    "explicitCheckboxCount": 3,
    "implicitNodeCount": 2,
    "nodeCount": 5,
    "completedEquivalent": 2,
    "progress": 0.6666666666666666,
    "percentage": 66.66666666666666,
    "roots": [
      { "label": "first", "checked": null, "implicit": true, "children": [{ "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }], "progress": 1, "depth": 0 },
      { "label": "second", "checked": null, "implicit": true, "children": [{ "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }], "progress": 0, "depth": 0 },
      { "label": "body", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 0 }
    ]
  },
  "presentation": "merged",
  "frontmatterWeight": 0.6666666666666666,
  "frontmatter": [
    {
      "format": "yaml",
      "checklists": [{ "type": "checklist", "path": ["first"], "entries": [{ "label": "build", "checked": true }] }],
      "progress": { "rootCount": 1, "explicitCheckboxCount": 1, "implicitNodeCount": 1, "nodeCount": 2, "completedEquivalent": 1, "progress": 1, "percentage": 100, "roots": [{ "label": "first", "checked": null, "implicit": true, "children": [{ "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }], "progress": 1, "depth": 0 }] }
    },
    {
      "format": "yaml",
      "checklists": [{ "type": "checklist", "path": ["second"], "entries": [{ "label": "test", "checked": false }] }],
      "progress": { "rootCount": 1, "explicitCheckboxCount": 1, "implicitNodeCount": 1, "nodeCount": 2, "completedEquivalent": 0, "progress": 0, "percentage": 0, "roots": [{ "label": "second", "checked": null, "implicit": true, "children": [{ "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }], "progress": 0, "depth": 0 }] }
    }
  ],
  "markdown": {
    "rootCount": 1,
    "explicitCheckboxCount": 1,
    "implicitNodeCount": 0,
    "nodeCount": 1,
    "completedEquivalent": 1,
    "progress": 1,
    "percentage": 100,
    "roots": [{ "label": "body", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 0 }]
  }
}
````

#### 5.2.2 TOML, YAML, and a body

Use this source:

````markdown
+++
[first]
build = true
+++

---
second:
  test: false
---

- [ ] body
````

The source order is TOML, YAML, Markdown. The TOML root is complete and the
YAML and Markdown roots are incomplete. The default merged result is therefore
`1 / 3 = 33.33%`; its derived frontmatter share is still `2 / 3` because there
are two frontmatter roots.

````text
Overall completion: 33.33%

├─ [100%] first
│  └─ [100%] build
├─ [0%] second
│  └─ [0%] test
└─ [0%] body
````

Its merged details are:

````text
Overall completion: 33.33%

Overall statistics:
- Root nodes: 3
- Explicit checkboxes: 3
- Implicit nodes: 2
- Statistical nodes: 5
- Equivalent completed: 1 / 3

Level statistics:
- Level 1: 3 nodes, 1 leaf node, 2 branch nodes
- Level 2: 2 nodes, 2 leaf nodes, 0 branch nodes

Root statistics:
- first: 100%, 1 child node
- second: 0%, 1 child node
- body: 0%, 0 child nodes
````

The JSON changes only the source formats, root states, and resulting metrics;
the top-level order remains `source`, `progress`, `presentation`,
`frontmatterWeight`, `frontmatter`, `markdown`:

````json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 3,
    "explicitCheckboxCount": 3,
    "implicitNodeCount": 2,
    "nodeCount": 5,
    "completedEquivalent": 1,
    "progress": 0.3333333333333333,
    "percentage": 33.33333333333333,
    "roots": [
      { "label": "first", "checked": null, "implicit": true, "children": [{ "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }], "progress": 1, "depth": 0 },
      { "label": "second", "checked": null, "implicit": true, "children": [{ "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }], "progress": 0, "depth": 0 },
      { "label": "body", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 0 }
    ]
  },
  "presentation": "merged",
  "frontmatterWeight": 0.6666666666666666,
  "frontmatter": [
    {
      "format": "toml",
      "checklists": [{ "type": "checklist", "path": ["first"], "entries": [{ "label": "build", "checked": true }] }],
      "progress": { "rootCount": 1, "explicitCheckboxCount": 1, "implicitNodeCount": 1, "nodeCount": 2, "completedEquivalent": 1, "progress": 1, "percentage": 100, "roots": [{ "label": "first", "checked": null, "implicit": true, "children": [{ "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }], "progress": 1, "depth": 0 }] }
    },
    {
      "format": "yaml",
      "checklists": [{ "type": "checklist", "path": ["second"], "entries": [{ "label": "test", "checked": false }] }],
      "progress": { "rootCount": 1, "explicitCheckboxCount": 1, "implicitNodeCount": 1, "nodeCount": 2, "completedEquivalent": 0, "progress": 0, "percentage": 0, "roots": [{ "label": "second", "checked": null, "implicit": true, "children": [{ "label": "test", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }], "progress": 0, "depth": 0 }] }
    }
  ],
  "markdown": {
    "rootCount": 1,
    "explicitCheckboxCount": 1,
    "implicitNodeCount": 0,
    "nodeCount": 1,
    "completedEquivalent": 0,
    "progress": 0,
    "percentage": 0,
    "roots": [{ "label": "body", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 0 }]
  }
}
````

The order of the two frontmatter entries is TOML then YAML, matching the
source. Their labels are not combined merely because both are frontmatter.

#### 5.2.3 One frontmatter section and a body

For the source in section 5.1, the default merged tree is:

````text
Overall completion: 66.67%

├─ [33.33%] checks
│  ├─ [100%] build
│  ├─ [0%] test
│  └─ [0%] publish
└─ [100%] Publish
````

The merged result has `Root nodes: 2`, `Explicit checkboxes: 4`,
`Implicit nodes: 1`, `Statistical nodes: 5`, and
`Equivalent completed: 1.333333 / 2`. Its derived `frontmatterWeight` is `0.5`.

#### Merged details output

````text
Overall completion: 66.67%

Overall statistics:
- Root nodes: 2
- Explicit checkboxes: 4
- Implicit nodes: 1
- Statistical nodes: 5
- Equivalent completed: 1.333333 / 2

Level statistics:
- Level 1: 2 nodes, 1 leaf node, 1 branch node
- Level 2: 3 nodes, 3 leaf nodes, 0 branch nodes

Root statistics:
- checks: 33.33%, 3 child nodes
- Publish: 100%, 0 child nodes
````

#### Merged JSON fields

Merged JSON keeps the same `source`, `frontmatter`, and `markdown` members as
separate JSON. The report-level fields change as follows:

| Field | Merged value for this example |
| --- | --- |
| `progress` | The combined `ProgressResult` with the merged roots |
| `presentation` | `"merged"` |
| `frontmatterWeight` | `0.5` |

The complete nested `ProgressResult` and section shapes are the same as the
separate JSON example above; only the report-level calculation and presentation
selection change.

`--frontmatter-weight N` accepts a decimal strictly between `0` and `1`. For
this source, `--frontmatter-weight 0.5` produces the same `66.67%` result and
changes only the merge calculation. It does not change `markdown`,
`frontmatter`, or their individual trees.

If a requested frontmatter weight has no frontmatter checklist roots or no
Markdown checklist roots, the weight is invalid and is ignored with a warning.
The merge itself still follows the source-component rule; `--strict` turns the
weight warning into an error.

### 5.3 Multiple frontmatter sections and a body

Use this source:

````markdown
---
yaml_checks:
  build: true
---

+++
[build_checks]
test = true

[release_checks]
publish = false
+++

- [ ] Publish
````

The expanded tree and details examples below use `--no-truncate`; JSON labels
are complete by default.

This source has one YAML root, two TOML roots, and one Markdown root. The root
weights are therefore `1 / 4` (`25%`) for YAML, `2 / 4` (`50%`) for TOML, and
`1 / 4` (`25%`) for Markdown. These are root-count weights, not an equal split
by the number of sections. The YAML root is complete, one TOML root is
complete, and the Markdown root is incomplete, so the default concise output is
`50%`.

Separate tree/details output uses this source order:

1. Frontmatter (YAML);
2. Frontmatter (TOML);
3. Markdown.

The aggregated frontmatter side has three roots and `2 / 3` progress. With no
explicit weight, its derived share in a body merge is `3 / 4`, because the body
contributes one root. The merged result is therefore `50%`. An explicit
`--frontmatter-weight 0.5` replaces the derived share and produces `33.33%`.

Frontmatter aggregation and body merging are different operations:

- aggregation combines all frontmatter sections for calculation while keeping
  each section separate for display;
- merging combines that aggregated frontmatter result with the body result;
- `--merge-frontmatter` requests the second operation.

#### Separate tree output

````text
Frontmatter (YAML):

Overall completion: 100%

└─ [100%] yaml_checks
   └─ [100%] build

Frontmatter (TOML):

Overall completion: 50%

├─ [100%] build_checks
│  └─ [100%] test
└─ [0%] release_checks
   └─ [0%] publish

Markdown:

Overall completion: 0%

└─ [0%] Publish
````

#### Separate details output

````text
Frontmatter (YAML):

Overall completion: 100%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 1
- Implicit nodes: 1
- Statistical nodes: 2
- Equivalent completed: 1 / 1

Level statistics:
- Level 1: 1 node, 0 leaf nodes, 1 branch node
- Level 2: 1 node, 1 leaf node, 0 branch nodes

Root statistics:
- yaml_checks: 100%, 1 child node

Frontmatter (TOML):

Overall completion: 50%

Overall statistics:
- Root nodes: 2
- Explicit checkboxes: 2
- Implicit nodes: 2
- Statistical nodes: 4
- Equivalent completed: 1 / 2

Level statistics:
- Level 1: 2 nodes, 0 leaf nodes, 2 branch nodes
- Level 2: 2 nodes, 2 leaf nodes, 0 branch nodes

Root statistics:
- build_checks: 100%, 1 child node
- release_checks: 0%, 1 child node

Markdown:

Overall completion: 0%

Overall statistics:
- Root nodes: 1
- Explicit checkboxes: 1
- Implicit nodes: 0
- Statistical nodes: 1
- Equivalent completed: 0 / 1

Level statistics:
- Level 1: 1 node, 1 leaf node, 0 branch nodes

Root statistics:
- Publish: 0%, 0 child nodes
````

Separate JSON has one `frontmatter` entry per header and a report-level
`progress` that contains all four roots. The report-level fields are
`rootCount: 4`, `explicitCheckboxCount: 4`, `implicitNodeCount: 3`,
`nodeCount: 7`, `completedEquivalent: 2`, `progress: 0.5`, and
`percentage: 50`. Every root object uses `label`, `checked`, `implicit`,
`children`, `progress`, and `depth`:

````json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 4,
    "explicitCheckboxCount": 4,
    "implicitNodeCount": 3,
    "nodeCount": 7,
    "completedEquivalent": 2,
    "progress": 0.5,
    "percentage": 50,
    "roots": [
      {
        "label": "yaml_checks",
        "checked": null,
        "implicit": true,
        "children": [
          { "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }
        ],
        "progress": 1,
        "depth": 0
      },
      {
        "label": "build_checks",
        "checked": null,
        "implicit": true,
        "children": [
          { "label": "test", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }
        ],
        "progress": 1,
        "depth": 0
      },
      {
        "label": "release_checks",
        "checked": null,
        "implicit": true,
        "children": [
          { "label": "publish", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }
        ],
        "progress": 0,
        "depth": 0
      },
      {
        "label": "Publish",
        "checked": false,
        "implicit": false,
        "children": [],
        "progress": 0,
        "depth": 0
      }
    ]
  },
  "presentation": "separate",
  "frontmatter": [
    {
      "format": "yaml",
      "checklists": [
        { "type": "checklist", "path": ["yaml_checks"], "entries": [{ "label": "build", "checked": true }] }
      ],
      "progress": {
        "rootCount": 1,
        "explicitCheckboxCount": 1,
        "implicitNodeCount": 1,
        "nodeCount": 2,
        "completedEquivalent": 1,
        "progress": 1,
        "percentage": 100,
        "roots": [
          {
            "label": "yaml_checks",
            "checked": null,
            "implicit": true,
            "children": [{ "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }],
            "progress": 1,
            "depth": 0
          }
        ]
      }
    },
    {
      "format": "toml",
      "checklists": [
        { "type": "checklist", "path": ["build_checks"], "entries": [{ "label": "test", "checked": true }] },
        { "type": "checklist", "path": ["release_checks"], "entries": [{ "label": "publish", "checked": false }] }
      ],
      "progress": {
        "rootCount": 2,
        "explicitCheckboxCount": 2,
        "implicitNodeCount": 2,
        "nodeCount": 4,
        "completedEquivalent": 1,
        "progress": 0.5,
        "percentage": 50,
        "roots": [
          {
            "label": "build_checks",
            "checked": null,
            "implicit": true,
            "children": [{ "label": "test", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }],
            "progress": 1,
            "depth": 0
          },
          {
            "label": "release_checks",
            "checked": null,
            "implicit": true,
            "children": [{ "label": "publish", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }],
            "progress": 0,
            "depth": 0
          }
        ]
      }
    }
  ],
  "markdown": {
    "rootCount": 1,
    "explicitCheckboxCount": 1,
    "implicitNodeCount": 0,
    "nodeCount": 1,
    "completedEquivalent": 0,
    "progress": 0,
    "percentage": 0,
    "roots": [
      { "label": "Publish", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 0 }
    ]
  }
}
````

#### Merged tree output

````text
Overall completion: 50%

├─ [100%] yaml_checks
│  └─ [100%] build
├─ [100%] build_checks
│  └─ [100%] test
├─ [0%] release_checks
│  └─ [0%] publish
└─ [0%] Publish
````

#### Merged details output

````text
Overall completion: 50%

Overall statistics:
- Root nodes: 4
- Explicit checkboxes: 4
- Implicit nodes: 3
- Statistical nodes: 7
- Equivalent completed: 2 / 4

Level statistics:
- Level 1: 4 nodes, 1 leaf node, 3 branch nodes
- Level 2: 3 nodes, 3 leaf nodes, 0 branch nodes

Root statistics:
- yaml_checks: 100%, 1 child node
- build_checks: 100%, 1 child node
- release_checks: 0%, 1 child node
- Publish: 0%, 0 child nodes
````

#### Merged JSON fields

Merged JSON keeps the same `frontmatter` and `markdown` members and the same
root object fields. It changes the report-level presentation and adds the
derived weight:

````json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 4,
    "explicitCheckboxCount": 4,
    "implicitNodeCount": 3,
    "nodeCount": 7,
    "completedEquivalent": 2,
    "progress": 0.5,
    "percentage": 50,
    "roots": [
      { "label": "yaml_checks", "checked": null, "implicit": true, "children": [{ "label": "build", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }], "progress": 1, "depth": 0 },
      { "label": "build_checks", "checked": null, "implicit": true, "children": [{ "label": "test", "checked": true, "implicit": false, "children": [], "progress": 1, "depth": 1 }], "progress": 1, "depth": 0 },
      { "label": "release_checks", "checked": null, "implicit": true, "children": [{ "label": "publish", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 1 }], "progress": 0, "depth": 0 },
      { "label": "Publish", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 0 }
    ]
  },
  "presentation": "merged",
  "frontmatterWeight": 0.75,
  "frontmatter": [
    { "format": "yaml", "progress": { "rootCount": 1, "progress": 1, "percentage": 100 } },
    { "format": "toml", "progress": { "rootCount": 2, "progress": 0.5, "percentage": 50 } }
  ],
  "markdown": { "rootCount": 1, "progress": 0, "percentage": 0, "roots": [{ "label": "Publish", "checked": false, "implicit": false, "children": [], "progress": 0, "depth": 0 }] }
}
````

The abbreviated `frontmatter` entries above show the fields relevant to the
merge. The actual JSON includes each section's complete `checklists` and
`ProgressResult` fields as shown in the separate JSON example.

### 5.4 Output field contract

#### Display defaults and option policy

When no display option is supplied, the terminal defaults are:

| Setting | Default |
| --- | --- |
| Format | percentage |
| Percentage precision | `2` decimal places |
| Decimal precision | `4` decimal places |
| Trailing zeroes | hidden |
| Tree/details label limit | `10` Unicode grapheme clusters |
| JSON labels | complete; no truncation |

JSON output is a data document with raw numeric fields. Explicit
`--format`/`--decimal`/`--percentage`, `--precision`, and trailing-zero display
options have no effect on JSON and emit a process warning. `--json --no-truncate`
is a valid no-op and does not warn. `--json --max-label-clusters N` is
meaningful because it requests grapheme-safe label
truncation. `--strict` turns an ignored-option warning into an error and
`--silent` suppresses it.

The following are hard errors rather than warnings:

- two different output modes among `--tree`, `--details`, and `--json`;
- `--no-truncate` together with `--max-label-clusters`;
- a show-trailing-zero option together with a no-trailing-zero option; and
- unknown options, missing option values, invalid values, invalid paths, and
  invalid source syntax.

Merge and weight combinations use the warning policy described in section 5.2:
the relevant options must be combined with a valid source situation before they
have an effect. An unused or invalid merge/weight combination emits a process
warning, leaves the ordinary result in place, and is upgraded to an error by
`--strict` or suppressed by `--silent`.

Every `ProgressResult` contains:

| Field | Meaning |
| --- | --- |
| `rootCount` | Number of statistical roots |
| `explicitCheckboxCount` | Recognized leaf checkboxes with explicit boolean state |
| `implicitNodeCount` | Derived branch nodes |
| `nodeCount` | All statistical nodes |
| `completedEquivalent` | Completion expressed in root-equivalent units |
| `progress` | Completion from `0` through `1` |
| `percentage` | `progress * 100` |
| `roots` | Complete statistical tree |

One source channel keeps the flat JSON shape with only `source` and `progress`.
Multiple channels add:

- `frontmatter`, one result per YAML/TOML section in source order;
- `markdown`, when a Markdown body channel exists, after `frontmatter`;
- `presentation`, either `"separate"` or `"merged"`;
- `frontmatterWeight`, when frontmatter is merged with the body.

JSON labels are complete by default. `--max-label-clusters N` requests
grapheme-safe truncation, and `--no-truncate` keeps labels complete.
Truncation changes presentation only; it does not mutate core progress data.
The `--json` command writes one JSON object document to stdout. It is not a
JSON string containing escaped object text, so tools such as `jq` can parse and
reformat it directly.
