# Test layout

This file is the directory index for `test/`. The detailed rules live in
[`AGENTS.md`](AGENTS.md); read that file before adding, moving, or reviewing a
test, fixture, feature, step, or consumer implementation. It owns the
evidence-layer boundaries, CLI/Core ownership, combination coverage, fixture
and oracle rules, TDD/BDD separation, and verification procedure.

The tree below records repository order and file ownership only. It does not
repeat those detailed rules.

```text
test/
├── bdd/
│   ├── features/
│   │   ├── audit-combinations.feature
│   │   ├── cli-basics.feature
│   │   ├── diagnostics.feature
│   │   ├── errors.feature
│   │   ├── frontmatter-composition.feature
│   │   ├── frontmatter-output.feature
│   │   ├── frontmatter-semantics.feature
│   │   ├── markdown-complex.feature
│   │   ├── markdown-display.feature
│   │   ├── markdown-output.feature
│   │   ├── markdown-semantics.feature
│   │   ├── paths.feature
│   │   ├── warnings-frontmatter.feature
│   │   └── warnings-json.feature
│   ├── fixtures/
│   │   ├── audit-cases.json
│   │   ├── display-sources.json
│   │   ├── frontmatter-layout-sources.json
│   │   ├── frontmatter-sources.json
│   │   ├── json-output-cases.json
│   │   ├── nested-sources.json
│   │   └── path-variants.json
│   ├── steps/
│   │   ├── audit.steps.ts
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
│   │   │   ├── compositions.json
│   │   │   ├── core-contracts.json
│   │   │   ├── frontmatter-output.json
│   │   │   ├── json-input.json
│   │   │   ├── json-output.json
│   │   │   ├── lexer-input.json
│   │   │   ├── lexer-output.json
│   │   │   ├── output-capabilities-input.json
│   │   │   ├── output-capabilities-output.json
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
│   │   ├── failures.ts
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
│   │   ├── application-contracts.json
│   │   ├── cli-paths.json
│   │   ├── frontmatter-contracts.json
│   │   ├── frontmatter-layouts.json
│   │   ├── markdown-samples.json
│   │   ├── markdown-tree-contracts.json
│   │   ├── nested-contracts.json
│   │   ├── output-contracts.json
│   │   ├── pipeline-features.json
│   │   └── report-contracts.json
│   ├── application-contracts.test.ts
│   ├── cli-paths.test.ts
│   ├── diagnostics.test.ts
│   ├── frontmatter-assertions.ts
│   ├── frontmatter-contracts.test.ts
│   ├── frontmatter-layouts.test.ts
│   ├── help.test.ts
│   ├── index.test.ts
│   ├── json-output.test.ts
│   ├── markdown-tree-contracts.test.ts
│   ├── nested-contracts.test.ts
│   ├── output-contracts.test.ts
│   ├── output-streams.ts
│   ├── pager-state.test.ts
│   ├── pipeline-features.test.ts
│   ├── pipeline.test.ts
│   ├── report-contracts.test.ts
│   └── terminal-output.test.ts
├── AGENTS.md                          detailed test construction and verification rules
├── index.test.ts                      broad acceptance/regression matrix
└── README.md test layout summary
```

For the complete feature ownership map, fixture policy, JSON-oracle rule,
combination matrix, and separate source/package TDD responsibilities, see
[`AGENTS.md`](AGENTS.md).
