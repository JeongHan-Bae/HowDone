# Test layout

The detailed rules for test construction and verification are in
[`AGENTS.md`](AGENTS.md).

The project keeps separate evidence layers with separate ownership:

```text
test/
├── bdd/
│   ├── features/
│   │   ├── cli-basics.feature
│   │   ├── errors.feature
│   │   ├── frontmatter-composition.feature
│   │   ├── frontmatter-output.feature
│   │   ├── frontmatter-semantics.feature
│   │   ├── markdown-complex.feature
│   │   ├── markdown-display.feature
│   │   ├── markdown-output.feature
│   │   ├── paths.feature
│   │   ├── warnings-frontmatter.feature
│   │   └── warnings-json.feature
│   ├── fixtures/
│   │   ├── frontmatter-layout-sources.json
│   │   ├── frontmatter-sources.json
│   │   ├── nested-sources.json
│   │   └── path-variants.json
│   ├── steps/
│   │   ├── command.steps.ts
│   │   ├── json.steps.ts
│   │   ├── support.ts
│   │   └── workspace.steps.ts
│   └── cucumber.cjs
├── package/
│   ├── bdd/
│   │   ├── features/
│   │   │   └── consumer.feature
│   │   ├── steps/
│   │   │   └── consumer.steps.ts
│   │   └── cucumber.cjs
│   ├── implementations/
│   │   ├── data/
│   │   │   ├── json-input.json
│   │   │   ├── json-output.json
│   │   │   ├── lexer-input.json
│   │   │   ├── lexer-output.json
│   │   │   ├── parser-input.json
│   │   │   ├── parser-output.json
│   │   │   ├── reader-input.json
│   │   │   ├── reader-output.json
│   │   │   ├── segmenter-input.json
│   │   │   ├── segmenter-output.json
│   │   │   ├── terminal-input.json
│   │   │   ├── terminal-output.json
│   │   │   ├── toml-input.json
│   │   │   ├── toml-output.json
│   │   │   ├── warning-input.json
│   │   │   ├── warning-output.json
│   │   │   ├── yaml-input.json
│   │   │   └── yaml-output.json
│   │   ├── data.ts
│   │   ├── dependencies.ts
│   │   ├── filesystem.ts
│   │   ├── frontmatter.ts
│   │   ├── index.ts
│   │   ├── markdown.ts
│   │   ├── output.ts
│   │   └── runtime.ts
│   └── tdd/
│       ├── api.test.ts
│       ├── application.test.ts
│       ├── package-metadata.test.ts
│       └── pipeline.test.ts
├── tdd/
│   ├── fixtures/
│   │   ├── cli-paths.json
│   │   ├── frontmatter-contracts.json
│   │   ├── frontmatter-layouts.json
│   │   ├── markdown-samples.json
│   │   ├── markdown-tree-contracts.json
│   │   ├── nested-contracts.json
│   │   ├── output-contracts.json
│   │   └── pipeline-features.json
│   ├── cli-paths.test.ts
│   ├── frontmatter-assertions.ts
│   ├── frontmatter-contracts.test.ts
│   ├── frontmatter-layouts.test.ts
│   ├── help.test.ts
│   ├── index.test.ts
│   ├── markdown-tree-contracts.test.ts
│   ├── nested-contracts.test.ts
│   ├── output-contracts.test.ts
│   ├── pipeline-features.test.ts
│   └── pipeline.test.ts
├── AGENTS.md                          detailed test construction and verification rules
├── index.test.ts                      broad acceptance/regression matrix
└── README.md test layout summary
```

The architecture document folds the complete `test/` subtree into the summary
entry above; this file is the authoritative test-directory tree.

TDD tests prove `source -> tokens -> DocumentAst -> separate Markdown/frontmatter progress -> metrics -> output` one boundary at a time. Complex stage inputs and expected nested objects live in `test/tdd/fixtures/`, so TDD code only loads data and asserts contracts. BDD scenarios prove what a user sees and the exit status returned by `howdone`; their source-only inputs live in `test/bdd/fixtures/`. Published-package consumer tests in `test/package/` provide test-owned port implementations for the public hexagonal API. Their TDD layer verifies intermediate mappings, application output, API documentation, and core/CLI version and dependency metadata; their BDD layer composes every data-driven fixture. The package suite stages compiled files locally; it does not download a package from npm. `npm test` and `npm run test:bdd` explicitly use the original source runtime, `npm run test:package` runs the staged Core consumer, and `npm run test:compiled` stages both compiled packages plus the CLI's production dependency closure before running compiled TDD, package-consumer, and BDD checks. `npm run test:local-install` separately installs the compiled Core and CLI from local paths into a temporary sandbox and runs the installed package consumer, BDD, and both CLI bin aliases. Development dependencies cannot satisfy the compiled or locally installed runtime proofs.

`test/tdd/fixtures/frontmatter-contracts.json` is the semantic YAML/TOML TDD
fixture set. It covers
named boolean mappings/tables, root-level boolean-map and sequence rejection,
named properties leading to unnamed sequences, recursively boolean sequences,
all-or-nothing invalid sequences,
`name`/`done` records, extra record fields, nested objects, separate progress,
and weighted merging. `test/tdd/fixtures/frontmatter-layouts.json`
covers optional body and frontmatter channels, repeated and alternating
YAML/TOML prefix sections, source order, and late YAML/TOML-shaped delimiter
blocks remaining in the Markdown channel. A semantic failure must produce no partial checklist from that
failed sequence. `test/tdd/fixtures/markdown-tree-contracts.json` covers ordered and unordered
Markdown trees, explicit parent-state precedence, implicit ancestors, and
discarded plain subtrees. BDD uses the smaller source-only files under
`test/bdd/fixtures/`; it does not import TDD fixtures.

BDD feature files are split by behavior: CLI basics, Markdown display and
complex output, frontmatter layout/composition/semantics, JSON and frontmatter
warnings, native paths, and errors. Step definitions are split into workspace,
command, and JSON assertion modules, with `support.ts` reserved for helpers.

Pipeline fixtures declare required source-boundary coverage and exact token, span, AST, tree, metric, and negative-result expectations.

Path fixtures describe logical path segments. The tests generate relative and absolute forms with the current runtime's `node:path` implementation, including space-containing names; they do not parse foreign operating-system path syntax.
