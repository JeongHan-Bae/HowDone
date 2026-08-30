# Test directory guide

This file defines the detailed test contracts for HowDone. It applies to
everything under `test/`. The repository-level `AGENTS.md` defines the product
architecture, runtime constraints, and the high-level test taxonomy. If a test
rule is specific to fixture construction, TDD, BDD, or test verification, use
this file as the detailed source of truth.

`test/README.md` is only the test-tree index. It deliberately does not repeat
the ownership, fixture, oracle, or verification rules in this file. Read this
file before adding or moving a test, fixture, feature, step, or consumer Port.

## Test purpose

The following names are fixed terms in this guide. They identify different
subjects and evidence boundaries; they are not interchangeable labels for the
same test suite.

| Layer | Location | What it verifies | Hard boundary |
|---|---|---|---|
| CLI TDD | `test/tdd/` | Source-checkout CLI application, adapter, and source-stage contracts through direct calls | It does not prove the published Core consumer contract. |
| CLI BDD | `test/bdd/` | Final CLI behavior through a real source or compiled executable: arguments, files, stdout, stderr, and status | It does not inject Core Ports or consumer implementations. |
| Package TDD | `test/package/tdd/` | The published compiled `howdone` Core/application API through direct consumer calls and consumer-owned Ports | It does not import CLI adapters, run a CLI child process, or use `docs/guide.md` as its contract. |
| Package BDD | `test/package/bdd/` | Published Core/application composition as a consumer BDD flow, including Port routing and output capability requests | It does not test CLI adapters or mirror CLI feature files; its contract is `docs/api.md`. |

In this guide, `Core` in Package TDD and Package BDD means the published
`howdone` public API. CLI TDD may contain direct tests for source-side Core
stages because the CLI source checkout composes those stages, but those tests
remain source-checkout evidence and cannot replace Package TDD. Likewise,
Package BDD uses Cucumber only as orchestration for consumer composition; it
does not become CLI BDD merely because an application call accepts `argv`.

Tests are executable evidence for the complete local pipeline:

```text
fixture intent
  -> Markdown source or direct contract
  -> MarkdownLexer -> LexerToken[]
  -> MarkdownAstParser -> DocumentAst
  -> Markdown body or semantic frontmatter tree -> CheckboxNode[]
  -> completion metrics -> separate ProgressResult values
  -> optional merge -> ProgressReport
  -> terminal or JSON output
```

The test suite must prove more than a final percentage. A final result can be
wrong in two compensating ways and still look correct. Every changed stage
therefore needs an assertion at its own boundary, and user-visible behavior
needs a separate black-box scenario when applicable.

Application behavior and ordinary TDD/BDD tests must remain local and
deterministic. They must not require a browser, a remote service, or mutation
of a user input file. `npm run test:local-install` is a separate installation
gate: its temporary project may resolve production dependencies from npm, but
it must install the compiled packages from local paths and must not use a
published package or remote fixture as its oracle. If the execution sandbox
blocks that dependency resolution, run the same gate with the approved network
permission; do not hide the network-dependent step inside another offline
sandbox or mark it complete without its exit status.

## Coverage audit workflow

Use the following order when auditing documented coverage. It keeps final
command behavior separate from intermediate contracts and makes completion
evidence explicit:

1. Read the owning contract first: `docs/guide.md` and `docs/syntax.md` for
   the CLI, or `docs/api.md` for the published Core/application API.
2. Complete the CLI BDD audit against the CLI documents. Exercise the real
   source and compiled executables and classify each scenario by its owning
   feature.
3. Complete the published Core consumer BDD audit against `docs/api.md`.
   Verify Core/application/Port composition with consumer-owned
   implementations; do not turn it into a CLI documentation mirror.
4. Only after both BDD audits are complete, inspect CLI TDD and Package TDD
   independently. Add the missing boundary or public-API oracles in their own
   layer; never use one layer as evidence for the other.
5. Run focused BDD and TDD checks, then run `npm run verify:precommit` after
   the final file change. A partial check does not replace the aggregate gate.

Coverage is complete only when every claimed branch has a named scenario or
test, an independent fixture or oracle where data is involved, and a passing
verification command. If a branch is incomplete or blocked, report the exact
missing evidence or blocker instead of describing it as covered.

Any documented parameter that is not explicitly a standalone command must be
tested in at least one relevant invocation with other parameters and source
components. Testing the parameter alone is not complete coverage. Where the
combination changes behavior, cover each applicable branch: successful output,
inapplicable-option warning, `--silent`, `--strict`, hard conflict, and any
documented value or `--name=value` spelling. The expected result of the
combination must be asserted, not merely that argument parsing accepted it.

## Evidence layers

### Source-checkout TDD

`test/tdd/` is the source-checkout TDD layer. It verifies the source pipeline,
source application, and source adapters through direct, deterministic calls.
It is not published-package consumer evidence and it must not import
`test/package/**`, staged `howdone` files, package consumer implementations, or
CLI BDD steps. Keep each test at the boundary it proves:

- `test/tdd/pipeline.test.ts` verifies the source-to-token, token-to-AST, and
  composed source-pipeline boundaries. It also verifies that the source text
  survives the pipeline unchanged.
- `test/tdd/pipeline-features.test.ts` loads JSON-defined positive and negative
  Markdown features. Positive fixtures can assert token kinds, lexemes, source
  spans, syntax node types, complete AST objects, progress roots, and metrics.
  Negative fixtures prove that task-looking text outside a valid root task
  structure does not enter the progress tree.
- `test/tdd/nested-contracts.test.ts` verifies nested implicit and explicit
  nodes, recursive metrics, the complete JSON report, and exact terminal tree
  and details output.
- `test/tdd/markdown-tree-contracts.test.ts` verifies ordered and unordered
  Markdown trees, explicit parent-state precedence, retained task ancestors,
  and discarded plain subtrees from
  `test/tdd/fixtures/markdown-tree-contracts.json`.
- `test/tdd/cli-paths.test.ts` verifies argument objects, invalid argument
  boundaries, current-platform paths, file access, and application composition.
- `test/tdd/application-contracts.test.ts` verifies representative mixed
  application arguments, report snapshots, output-port selection, and warning
  precedence from `test/tdd/fixtures/application-contracts.json`.
- `test/tdd/report-contracts.test.ts` verifies the complete serializable
  `ProgressReport` contract and merge/weight ignored flags from
  `test/tdd/fixtures/report-contracts.json`.
- `test/tdd/frontmatter-contracts.test.ts` verifies DocumentAst channel
  separation, YAML/TOML semantic checklist classification, independent
  expected metrics, and root-count versus explicit merge weighting.
- `test/tdd/frontmatter-layouts.test.ts` verifies empty, body-only,
  frontmatter-only, body-plus-frontmatter, repeated-format, alternating-format,
  source-order, and late YAML/TOML-shaped delimiter blocks remaining in the
  Markdown channel from
  `test/tdd/fixtures/frontmatter-layouts.json`.
- `test/tdd/help.test.ts` verifies that Help usage, option arguments, and
  explanatory sections are structured data rendered by the CLI Help document
  renderer. It
  also keeps CLI syntax parts (commands, options, and arguments) separate from
  file and dependency references: code parts keep non-TTY markers while
  references do not.
- `test/tdd/diagnostics.test.ts` verifies that Core preserves warning/error
  semantics through the shared terminal output port and that CLI adapters color
  the warning/error documents. JSON remains a data-only output path and does
  not receive human-readable diagnostics.
- Output-boundary TDD tests must verify both the original flat single-source
  shape and the grouped multi-source shape. The top-level report result and
  each channel result are separate assertions.
- `test/index.test.ts` is the broad regression matrix. It covers documented
  acceptance behavior, Unicode/display boundaries, CLI errors, filesystem
  errors, and focused adapter/application contracts.

The source TDD layer must assert the shape that the next stage consumes. Do not
replace a token assertion with a final progress assertion, or replace a tree
assertion with a renderer assertion. When a stage changes, update the test for
that stage and the incoming or outgoing contract as needed.

Source-checkout assertions for Core internals are useful implementation
evidence for the CLI path, but they are not published-package evidence. A
fixed Core operation that the CLI cannot replace through a Port must also be
verified in Package TDD against the staged compiled Core. Do not move that
requirement into CLI TDD merely because the source test can import the same
function.

### CLI BDD

CLI BDD tests live in `test/bdd/features/` and `test/bdd/steps/`. They verify
the user-visible command through the real executable path:

```text
source BDD    -> bin/howdone.cjs -> src/boot/main.ts -> src/application/analyze.ts
compiled BDD  -> howdone-cli bin -> dist/boot/cli-main.js -> howdone/application
```

BDD must start a real Node child process. It must not inject a fake lexer,
parser, file reader, or renderer. Each scenario creates an isolated temporary
workspace, invokes the executable, observes stdout/stderr and exit status, and
removes the workspace in an `After` hook.

BDD scenarios cover final behavior such as:

- default, tree, details, and JSON modes;
- output format, precision, trailing-zero, and label options;
- valid and invalid paths, extensions, directories, and file reads;
- relative, absolute, dot-relative, quoted, and space-containing native paths;
- option conflicts, missing values, invalid values, and end-of-options paths;
- nested progress behavior, separate/merged frontmatter behavior, warning and
  strict/silent merge and weight handling, JSON display-option warnings, and
  user-visible error messages.

The combination rule from the coverage audit is mandatory here: a parameter
that is not documented as standalone-only needs a real CLI scenario in a
non-isolated invocation. Combine it with every relevant option family and
source component needed to expose its documented behavior. Do not count an
isolated option test, a parser-only test, or a path-only test as proof of the
combined output. Use compact fixture case identifiers and assert the status,
diagnostics, output mode, and resulting output for the combination.

For both source and compiled CLI BDD runs, all expected JSON data is fixture
data. A feature may
name a case and say that stdout is valid JSON, while a TypeScript helper loads
the fixture and compares the complete parsed object. Do not put JSON values,
field lists, or partial JSON oracles in Gherkin or step definitions. Expected
human-readable terminal text and stderr diagnostics may remain Cucumber
assertions when that is the clearest contract.

The BDD suite is intentionally divided by behavior. Do not put every scenario
in one feature file or every definition in one step module. The current
feature ownership is:

- `test/bdd/features/cli-basics.feature` covers entrypoint basics, the four
  independent CLI commands, standalone-command validation, and the ordinary
  Markdown task-tree contract, including the exact `--version` value sourced
  from the package's `package.json`. It also owns Help presentation details;
  Help is not a diagnostic scenario.
- `test/bdd/features/markdown-display.feature` covers default, decimal,
  percentage, tree, and details display composition.
- `test/bdd/features/markdown-output.feature` covers output shape, JSON label
  policy, and terminal truncation behavior. Invalid option values and
  option conflicts belong to `errors.feature`, even when they select an
  output mode.
- `test/bdd/features/markdown-complex.feature` covers a combined Markdown
  tree with nested progress and display controls. Standalone truncation
  examples belong to `markdown-output.feature`.
- `test/bdd/features/markdown-semantics.feature` covers Markdown task-marker
  recognition and exclusions for code, HTML, comments, quotes, and tables.
- `test/bdd/features/frontmatter-output.feature` covers optional channels and
  single-source versus grouped output.
- `test/bdd/features/frontmatter-composition.feature` covers repeated and
  alternating YAML/TOML sections, source order, separate output, and explicit
  merging. Semantic recognition belongs to `frontmatter-semantics.feature`,
  and warning-policy branches belong to `warnings-frontmatter.feature`.
- `test/bdd/features/frontmatter-semantics.feature` covers recognized and
  rejected YAML/TOML checklist shapes.
- `test/bdd/features/warnings-json.feature` and
  `test/bdd/features/warnings-frontmatter.feature` cover warning, silent, and
  strict branches, including safe extra options.
- `test/bdd/features/paths.feature` covers current-platform path construction
  and round trips.
- `test/bdd/features/errors.feature` covers filesystem, argument, and hard
  option errors.
- `test/bdd/features/diagnostics.feature` covers stderr diagnostic placement,
  JSON stdout preservation, strict warning-to-error conversion, and plain
  redirected or `--no-color` diagnostics.
- `test/bdd/features/audit-combinations.feature` is the compact
  fixture-driven cross-contract matrix for combinations that span these
  feature owners. Its TypeScript steps only map fixture case identifiers to
  real CLI execution and fixture-owned assertions; it is not a replacement
  for the focused feature ownership above.

The ownership audit keeps each focused CLI scenario in the block for the
contract it proves: command entrypoints and Help in `cli-basics`, source syntax
in `markdown-semantics` and `frontmatter-semantics`, report presentation in
`markdown-display`, `markdown-output`, and `frontmatter-output`, source-channel
composition in `frontmatter-composition`, hard validation in `errors`,
diagnostic rendering in `diagnostics`, and warning policy in the two warning
features. The fixture-driven `audit-combinations.feature` is the only
intentional cross-contract matrix; it is an explicit exception to single-block
ownership and references compact case identifiers instead of duplicating
option combinations and expected outputs in Gherkin.

CLI step ownership is equally explicit:

- `workspace.steps.ts` selects a loaded source/path fixture, owns temporary
  files and directories, and cleans up each workspace.
- `command.steps.ts` owns real process invocation and plain
  stdout/stderr/status assertions.
- `json.steps.ts` owns fixture-driven complete parsed JSON assertions; it does
  not expose field-level Gherkin steps.
- `audit.steps.ts` owns audit-case selection, argument/source mapping, and the
  cross-contract result assertions; it delegates complete JSON comparison to
  fixture helpers.
- `support.ts` owns fixture-file loading and shared process/workspace helpers
  only; it must not register Cucumber steps.

Every feature must have one focused `Feature:` declaration. A scenario belongs
in the feature that owns the behavior it proves, even when its steps are
shared. A new scenario should not be appended to a catch-all feature.

BDD is not a substitute for TDD. A scenario that sees `75%` does not prove
that the lexer emitted the right tokens or that the tree contained the right
implicit nodes. Conversely, a TDD test does not prove that the executable,
argument parsing, filesystem adapter, and output stream work together.

### Published Core consumer tests

Published-package consumer tests live in `test/package/`. They run against the
staged compiled `howdone` Core entry and verify the public hexagonal API as a
consumer would use it. The staged files represent the compiled package that
would be published; this suite does not download a package from the npm
registry. The test supplies its own `MarkdownLexer` port and other replaceable
collaborators, and must not import repository adapters or rely on
development-only modules. When the published Core provides a standard
implementation, consumers exercise both that implementation and a replacement.
The `implementations/` directory owns the consumer Ports and their paired JSON
input/output fixtures.

The published Core consumer layer is independent from the CLI layer:
`test/package/tdd/` and `test/package/bdd/` must not import CLI adapters, CLI
BDD steps, CLI fixtures, or CLI output oracles. Conversely, `test/bdd/` and
source-checkout TDD must not use consumer Ports as a substitute for the real
CLI path. Similar source text is not a reason to share a fixture. The package
consumer suite runs with `npm run test:package`; `npm run test:compiled`
includes it in compiled staging.

#### Published Core TDD

`test/package/tdd/` is Core/application TDD only. It uses the public
`howdone`, `howdone/std`, and `howdone/application` entries plus
consumer-owned Ports. It verifies package metadata, every exposed pipeline
boundary, standard implementations, replacement implementations, failure and
fallback behavior, and complete fixture-owned output objects. It must not
prove a Core contract through a CLI adapter or a real CLI child process.
Source-checkout TDD under `test/tdd/` is a separate evidence layer and is
audited separately; neither suite may be used to mark the other complete.

Package TDD must cover Core-owned fixed behavior even when that behavior is not
customizable through CLI Ports. This includes the public tree, metric,
frontmatter-classification, report-composition, display-policy, and standard
parser operations documented by `docs/api.md`. A private helper does not need
to become a public testing export: observe it through its nearest public Core
operation and assert the complete fixture-owned result. Consumer Ports are for
replaceable syntax, filesystem, decoding, runtime, and output collaborators;
they are not a substitute for testing the fixed Core implementation.

Package TDD must also contain continuous pipeline evidence. At least one test
must run the published application from a consumer file reader through lexer,
parser, semantic frontmatter decoding, fixed Core progress/report composition,
and output delivery, with the stage order and resulting contract asserted.
Isolated operation tests, Port-call tests, or a final percentage alone do not
prove continuous pipeline behavior.

#### Published Core BDD

`test/package/bdd/` is consumer BDD. It composes the published Core application
with consumer-owned Ports and is classified by the Core/API boundary in
`docs/api.md`, not by the CLI feature names. It covers Port composition, the
standard parser entry, application and collaborator failures,
information/warning/error documents, merged `ProgressReport` values, and
terminal/JSON output capability requests. Command-shaped `argv` values here
exercise the published application contract; they do not make this suite a
`docs/guide.md` or CLI mirror.

All data-shaped JSON objects in package BDD come from implementation fixtures
and TypeScript lookup helpers. The step may identify a case and compare the
complete parsed or delivered object, but it must not assemble expected JSON in
Gherkin or in the step definition. Human-readable consumer terminal text may
use focused Cucumber assertions where appropriate.

`test/package/bdd/steps/consumer.steps.ts` is the package BDD orchestration
boundary. It maps a compact case or capability identifier to consumer-owned
fixture data, composes public Core Ports, invokes the published application,
and asserts the resulting Core/output contract. It must not import CLI BDD
steps or CLI adapters, and it must not reimplement Core calculations to form
an expected value.

The `output-capabilities-input.json` and
`output-capabilities-output.json` fixture pair defines 64 consumer output
cases. The first four bits of each case code describe terminal color,
terminal Pager, JSON color, and JSON Pager support in that order. The suffix
describes the requested color and Pager modes: `aa` is `auto/auto`, `na` is
`never/auto`, `an` is `auto/never`, and `nn` is `never/never`. Every case runs
both terminal and JSON ports, verifies distinct consumer port labels, and
verifies ordinary stream/object delivery or the optional feature hook with the
same output value.

## Fixture construction

### General rule

Large Markdown samples, expected output, nested objects, argument matrices,
and path cases belong in JSON fixtures. Gherkin should keep only a readable
scenario structure, a compact case identifier, and short text that is itself
the behavior under discussion. Test TypeScript should load fixture data,
construct the explicitly requested runtime objects, call the subject under
test, and assert contracts. It should not contain large inline domain
documents or generated expected values.

TDD and BDD fixtures are layer-owned. There is no general-purpose fixture
directory at present, and one layer must not import the other layer's fixture.
Similar source text does not make two tests share an oracle: TDD fixtures carry
intermediate expectations, while BDD fixtures carry executable inputs and the
complete JSON output oracles required by the black-box contract.

For every BDD layer, every expected JSON output is fixture-owned. A TypeScript
helper may resolve a fixture by case ID, substitute a temporary path into the
fixture input, parse the actual stdout or delivered value, and compare the
complete object. It must not calculate, reconstruct, or partially assert the
JSON oracle. Non-JSON terminal output and stderr diagnostics may use Cucumber
text assertions when those assertions are clearer than a fixture.

The TDD fixture set is:

- `test/tdd/fixtures/pipeline-features.json` contains source-boundary cases and
  independent token, AST, tree, metric, and negative expectations.
- `test/tdd/fixtures/nested-contracts.json` contains one complex nested
  document and its pre-metric tree, complete metrics, JSON report, and terminal
  output.
- `test/tdd/fixtures/cli-paths.json` contains argument objects, invalid
  argument cases, and logical path segments. It does not contain foreign
  operating-system path syntax.
- `test/tdd/fixtures/frontmatter-contracts.json` contains YAML/TOML sources
  and independent semantic checklist, separate-progress, and merge arithmetic
  expectations.
- `test/tdd/fixtures/frontmatter-layouts.json` contains source-layout cases
  and lexer/AST expectations for optional, repeated, alternating, ordered,
  prefix, and late delimiter boundaries.
- `test/tdd/fixtures/markdown-tree-contracts.json` contains ordered and
  unordered Markdown trees, explicit parent-state behavior, and discarded
  plain subtrees.
- `test/tdd/fixtures/markdown-samples.json` contains the fixed acceptance
  sample and the pipeline sample.
- `test/tdd/fixtures/output-contracts.json` contains independent renderer
  input and output contracts.
- `test/tdd/fixtures/application-contracts.json` contains source application
  combinations and independent report, option, diagnostic, and JSON-port
  expectations.
- `test/tdd/fixtures/report-contracts.json` contains independent Core report
  inputs and complete serializable report expectations for merge branches.

Package Core TDD fixtures are consumer-layer owned:

- `test/package/implementations/data/core-contracts.json` contains an
  independent nested Core progress tree with complete pre-metric and metric
  results, layer statistics, flattened labels, and valid/invalid display-policy
  expectations.

The BDD fixture set is deliberately smaller and source-only:

- `test/bdd/fixtures/path-variants.json` contains logical path segments for
  current-platform path generation.
- `test/bdd/fixtures/nested-sources.json` contains the nested Markdown source
  used by CLI scenarios.
- `test/bdd/fixtures/frontmatter-sources.json` contains YAML/TOML source cases
  addressed by their behavior IDs.
- `test/bdd/fixtures/frontmatter-layout-sources.json` contains source-layout
  cases addressed by their behavior IDs.
- `test/bdd/fixtures/audit-cases.json` contains the cross-contract CLI
  combination cases, including complete JSON output oracles. It is the source
  for the JSON results asserted by `audit-combinations.feature`.
- `test/bdd/fixtures/json-output-cases.json` maps every successful JSON CLI
  input/argument case to a complete parsed output object. The shared JSON step
  resolves its input-path placeholder and compares the complete object; JSON
  values must not be authored in Gherkin steps.
- A CLI JSON scenario keeps only `stdout is valid JSON` for its data output.
  Do not add JSON key, field, label, or substring assertions to Gherkin; put
  the complete expected object in the fixture and retrieve it through the
  TypeScript helper. Human-readable terminal output and stderr diagnostics may
  remain as Cucumber assertions.
- Short DocStrings remain in Gherkin when the source is clearer beside the
  scenario, but they must not become a second large fixture or a JSON oracle.
  Large or deeply nested input belongs in the BDD fixture set, not in step
  TypeScript.

If a future value is genuinely an independent contract consumed unchanged by
both layers, it may live in `test/fixtures/` with an explicit ownership note.
That is an exception, not a default, and it must not be used to hide different
TDD and BDD oracles in one file.

Every expected value must be an independent oracle. Do not compute an
expected tree with `buildProgressRoots`, compute expected metrics with
`calculateProgress`, or create expected terminal text by calling the renderer
under test.

### Required coverage

`pipeline-features.json` has a root-level `requiredCoverage` list. Each
positive or negative feature declares the coverage labels it exercises. The
TDD fixture test fails when a required label is absent from all fixtures.

When adding a syntax or boundary category:

1. Add a positive or negative fixture with a descriptive `coverage` label.
2. Add the label to `requiredCoverage` if it represents a required contract.
3. Assert the smallest useful intermediate objects, including exact lexemes or
   spans when the boundary is lexical.
4. Add a BDD scenario only when the behavior is observable through the CLI.

The current source-boundary matrix includes YAML and TOML frontmatter,
headings, HTML, thematic breaks, blockquotes, fenced code, tables, ordered
and unordered lists, task marker variants, malformed markers, unsupported
blocks, multiple roots, explicit leaves, and implicit nodes.

### Semantic Markdown fixtures

For complex task-tree cases, JSON should describe intent rather than repeat a
large hand-written Markdown document. A suitable semantic shape is similar to:

```json
{
  "document": {
    "blocks": [
      {
        "kind": "task-list",
        "items": [
          {
            "label": "Release",
            "checked": null,
            "children": []
          }
        ]
      }
    ]
  }
}
```

If a semantic fixture builder is introduced, place it under `test/support/`
and keep it independent from the production Markdown parser and AST adapter.
It should:

1. read a typed semantic fixture;
2. recursively render only the supported canonical task-list subset;
3. use stable indentation, markers, checkbox spelling, line endings, and
   final-newline behavior;
4. return Markdown source for the real production lexer and parser;
5. have its own small golden tests so the builder's source output is visible.

Do not construct a production `RootAst` and render it back to Markdown as the
main fixture strategy. That bypasses the source-to-token boundary and couples
the test generator to the parser contracts under test. A builder is a source
generator, not a replacement Markdown implementation.

Semantic generation is appropriate for nested progress, list-marker
combinations, checked states, and repeated scenario matrices. It is not a
replacement for raw lexical fixtures. Keep exact source fixtures for cases
where spacing, delimiters, malformed syntax, token lexemes, or source spans
are the behavior being tested.

The useful round-trip evidence is:

```text
semantic JSON -> independent canonical Markdown builder
               -> production lexer/parser -> expected AST/tree/metrics
```

An optional builder test may compare the generated source with a small
hand-authored `expectedSource` value. Do not use only
`production parse -> production render -> production parse` as evidence; two
shared assumptions can hide the same defect.

### Raw source fixtures

Raw source remains valid when the source spelling is the contract. Store it in
JSON or Gherkin, never as a large TypeScript literal. Use raw fixtures for:

- YAML/TOML delimiter recognition;
- marker spelling and uppercase/lowercase checkbox variants;
- indentation and nested list boundaries;
- source offsets, lines, columns, and token spans;
- escaped markers, malformed checkboxes, and unsupported blocks;
- code, table, HTML, blockquote, and other non-task Markdown contexts.

The parser must be the component that turns these sources into local tokens and
AST objects. Do not replace this evidence with a test-side regular expression.

### Frontmatter semantic fixtures

YAML/TOML frontmatter is not Markdown. Test each format through its own value
parser adapter, then pass the decoded value through the core classifier and
assert the resulting `FrontmatterChecklist[]` before asserting progress. The
contract is:

- a non-empty mapping/table below a property/table name whose direct values are
  all boolean is a checklist container; each direct boolean value is one leaf
  checkbox, the property names are labels, and the containing key is not
  reserved;
- a mapping/table with mixed direct booleans and nested objects is ordinary at
  that level; nested checklist candidates are evaluated independently;
- a root mapping of direct boolean fields and a root YAML sequence are ignored;
  an object with string `name` and boolean `done` is one root leaf, and a
  sequence below a key is either an unnamed boolean sequence with numeric
  dotted labels or a named-record sequence whose labels come from `name`;
- an empty or mixed mapping/table is ordinary data at that level;
- an unnamed non-empty sequence is a checklist container only when every leaf
  is boolean, including nested sequences; each boolean leaf is one checkbox;
- a named-record sequence is valid only when every item has string `name` and
  boolean `done`; each matching item is one leaf, and extra fields are ignored;
- a named property/table may contain an unnamed sequence, but an unnamed
  sequence cannot contain a named record or named object below it;
- YAML unnamed sequences may mix boolean leaves and nested unnamed sequences;
  TOML arrays must keep one direct element kind under TOML's homogeneous-array
  grammar;
- one non-boolean value or empty nested sequence invalidates the entire
  sequence, and the failed sequence is not searched for partial checklists;
- valid nested boolean sequences remain nested container items and therefore
  retain container weighting in the progress tree;
- boolean sequence labels are stable dotted indexes such as `2.0`, while
  record labels come from `name`;
- YAML and TOML are tested with their own legal syntax. TOML's native array
  syntax may reject mixed scalar/array element types before semantic
  classification, so legal nested TOML arrays are used for parity.

Markdown tree fixtures also assert that ordered and unordered list items with
task descendants belong to the task tree, that a branch ignores its own
checkbox state, and that a plain subtree with no checkbox descendants is
discarded.

The Markdown body and every frontmatter section have separate progress
results. Tests must cover default separate output, explicit merged output,
root-count weighting, an explicit weight in the open interval `(0, 1)`, and a
merge request when there is only one source component. The last case warns and
discards the merge request by default; `--strict` makes it an error. Every
frontmatter section and the Markdown body count as one merge component, so two
frontmatter sections can be merged without a body. A syntactically valid weight
without a merge is an ignored-option warning; a valid weight is also warned
when the selected merge has no Markdown checklist side, even if multiple
frontmatter sections can otherwise be merged. A syntactically or numerically
illegal weight is a hard argument error and cannot be suppressed. A valid
weight that has no effect is a warning by default, can be suppressed by
`--silent`, and can be upgraded by `--strict`. Diagnostic delivery is separately
covered by Core consumer TDD and BDD: a terminal output port receives a
semantic warning/error document through `renderWarning` or `renderError`, and
the optional `print` member receives the same concrete output with the stderr
target. When `print` is absent, Core IO receives the output through `stderr`;
JSON output remains data-only. There is no dedicated warning port.
JSON format, precision, and trailing-zero options are warning-level no-ops when
combined with `--json`; JSON alone and JSON with `--no-truncate` do not warn,
while `--json --max-label-clusters N` remains meaningful. Hard option conflicts
remain errors even with `--silent`. BDD must assert both sides of each warning
boundary: the triggering combination warns, each option alone does not, and
adding a non-conflicting option does not change the warning behavior.
Repeated YAML/TOML sections are parsed independently rather than merged by
format or matching keys. Their recognized roots are aggregated for report-level
calculation, and the default frontmatter weight is
`frontmatter roots / (frontmatter roots + Markdown roots)`.
For output layout, a body-only document or a frontmatter-only document with
one section stays flat. A body plus frontmatter or multiple frontmatter
sections is expanded by source for default, tree, and details terminal output
and preserves frontmatter order; JSON uses the corresponding grouped shape.
An explicit merge produces one merged progress result after all frontmatter
sections have been aggregated.

## Output assertions

Output has separate data and text contracts:

- JSON output is a data contract. Parse it and compare the complete expected
  object. A single-source result has only `source` and `progress`; a body plus
  frontmatter or multiple frontmatter sections has top-level `progress`,
  `presentation`, source-specific `frontmatter`/`markdown` results, and an
  optional merge weight. In either shape, assert all numeric fields, node
  labels, checked state, implicit state, children, progress, and depth.
  Display truncation may change labels only when explicitly requested.
- In CLI BDD, every successful JSON result is loaded from the applicable
  `test/bdd/fixtures/json-output-cases.json` or
  `test/bdd/fixtures/audit-cases.json` case and compared as a complete object.
  Gherkin may describe terminal text and diagnostic fragments, but it must not
  become the JSON oracle.
- Terminal output is a text contract. Keep expected text in JSON or Gherkin,
  preferably as line-oriented data when line boundaries are important. Join
  lines in the test with the same explicitly documented final-newline rule.
  Do not generate expected text with `TerminalRenderer`.

Use exact equality when punctuation, indentation, ordering, or final newlines
are part of the contract. Use a focused `contains` assertion in BDD only when
the scenario is intentionally checking a stable fragment rather than the
whole rendering format.

The default CLI output and all diagnostic messages remain English. Source,
test code, maintenance scripts, and generated JavaScript or TypeScript are
ASCII-only. When test code needs a non-ASCII character, encode its code point
with the escape syntax supported by the language instead of writing the
character literally. The code-only checker excludes documentation, fixtures,
configuration, text assets, dependencies, IDE state, and the ignored temporary
workspace. It is a focused check, not a separate pre-commit command.

Test documentation must contain no emoji or CJK text. Unicode Box Drawing
characters are permitted only in documentation directory and file trees.

## Native path testing

Path tests verify the runtime platform, not a foreign path grammar. Fixtures
describe logical segments such as `fixtures`, `space tasks`, and `relative.md`.
The test code uses the current Node runtime's `node:path` functions to create
native relative, absolute, normalized, relative-with-dot, and
space-containing forms. It uses `node:fs` to create the corresponding files.

The path evidence must include the following relationships:

```text
logical segments
  -> path.join / path.resolve
  -> native path argument
  -> Node file reader
  -> path.relative / path.normalize round trip
```

Never hardcode `/` or `\` as a platform path separator in a path test. Never
feed a Windows path to a POSIX parser or a POSIX path to a Windows parser.
When a new runtime platform is supported, the same logical fixture should be
converted by that platform's Node path implementation.

## BDD step design

Step definitions are orchestration code, not a second application layer.

- `Given` steps create files, directories, or fixture-backed workspaces.
- `When` steps invoke the real executable and capture process results.
- `Then` steps assert status, stdout, stderr, or parsed JSON contracts.
- Steps must not calculate progress, parse Markdown independently, or recreate
  production formatting rules.
- Temporary workspaces must be cleaned up even after a failed scenario.
- Argument strings in feature files are split only to model the scenario's
  argv array. The production launcher still receives the resulting argv
  entries directly from the test process.

The Cucumber configuration loads only `test/bdd/steps/**/*.steps.ts`. Helper
modules use a name such as `support.ts` and are imported explicitly, so a
helper cannot silently become a step module.

### Compiled parity

Existing TDD entry files, fixtures, feature files, and assertions remain
unchanged. `npm test` and `npm run test:bdd`
explicitly select the source runtime, preserving native Node.js TypeScript on
Node.js 23+ and bundled `tsx` on Node.js 18.18-22. The command
`npm run test:tdd:compiled` compiles the same `src/` and `test/` modules into the
ignored `.test-build/` directory, stages both compiled packages and the CLI's
resolved production dependency closure into a temporary project, and runs the
same TDD entry files with Node from that production-only staging. The package
consumer test is compiled alongside those tests and imports the public
`howdone` entry while supplying test-owned ports. `npm run test:compiled`
explicitly selects the compiled runtime after the same staging, runs the
compiled TDD and package consumer suites, and runs the unchanged BDD feature
suite through the compiled CLI entry. The Cucumber process is development-only
test orchestration; it must not provide a module to the application or package
consumer process. Do not create
a second fixture set or change expected values for compiled verification;
parity means the same test files, feature files, fixtures, and assertions
exercise both paths. Each test command selects its runtime explicitly.

### Local package installation

`npm run test:local-install` creates a separate temporary project, installs the
compiled `howdone` and `howdone-cli` packages from local paths with npm, and
resolves only the CLI's production dependencies. It then runs the published-
package consumer, compiled BDD features, and both installed bin aliases. This
proves local npm installation behavior; it is not a download of an already
published npm registry version.

The test layout tree in `test/README.md` follows the repository tree order.
When adding a test directory or file to a documented tree, insert it in the
same order used by the repository view; do not group entries by test purpose
inside a filesystem tree.

Keep scenario names and step wording focused on user behavior. Prefer a
scenario outline for a small matrix of option or path variants. Use a JSON
fixture and a named step when a scenario needs a large or deeply nested input.

## Adding or changing a behavior

For a coverage audit or a user-visible behavior change, use this sequence:

1. Read the owning contract and identify the pipeline stage and user-visible
   consequence.
2. Add or update an independent JSON fixture. Keep Gherkin compact and add a
   required source-boundary coverage label when the category is new.
3. Complete and classify the real-executable CLI BDD and published Core
   consumer BDD cases independently. Verify the documented combinations before
   moving on to TDD.
4. Only after the BDD audit is complete, add the incoming and outgoing
   source-checkout TDD boundary assertions.
5. Separately add or update `test/package/tdd/` Core/application assertions
   when the published Core contract changes, including fixed Core operations
   and at least one continuous published-application pipeline case. Do not
   reuse CLI adapters, consumer Ports, or the other layer's fixtures as
   evidence.
6. Update `docs/syntax.md` for source/result language changes and
   `docs/guide.md` for CLI command or parameter changes. Update `docs/api.md`
   for public Core/application changes.
7. Update `test/README.md` only for the test-tree index, and update this file
   when fixture or test construction rules change.
8. Run focused BDD and TDD checks, followed by the complete verification gate.

Do not treat a passing BDD scenario as proof that the implementation is right
if its fixture or expected value was generated by the same implementation.
Prefer independent expected objects, exact boundary shapes, negative cases,
and combined scenarios that exercise several contracts at once.

## Verification commands

Use these focused commands while iterating on the test suite:

```bash
npm run typecheck
npm test
npm run test:bdd
npm run test:package
npm run test:compiled
npm run test:local-install
npm run check:static
npm run pack:check
```

`npm test` runs the broad regression suite and all files imported by
`test/tdd/index.test.ts`. `npm run test:bdd` runs the source Cucumber feature
suite, `npm run test:package` runs the published-package consumer, and
`npm run test:compiled` runs the same TDD, package-consumer, and BDD contracts
through the compiled entry. `npm run test:local-install` verifies the same
consumer and BDD contracts after local npm installation; it may download
production dependencies, but it installs the Core and CLI packages from local
paths and never uses a registry package as the Core oracle. For the final
repository boundary, run `npm run verify:precommit` as required by
[`CONTRIBUTING.md`](../CONTRIBUTING.md). That command also runs both dependency
audits through the aggregate boundary; the focused commands above are not a
substitute for it.

For the literal-CJK policy in source, test code, fixtures, or documentation,
use a read-only repository-wide scan such as:

```bash
rg -n --pcre2 '[\x{3400}-\x{4DBF}\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}]' \
 --glob '!node_modules/**' --glob '!.git/**' .
```

The scan should produce no matches in source, tests, fixtures, or test
documentation. A documentation file tree may still contain Box Drawing
characters, which are outside the CJK ranges in this scan.
