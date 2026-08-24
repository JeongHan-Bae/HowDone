# Test layout

The project keeps two complementary test layers, following the reference projects' behavior rather than their architectures:

```text
test/
├── tdd/     deterministic stage-contract tests
├── fixtures/ JSON-backed Markdown, argument, path, and nested-result cases
├── bdd/     Cucumber scenarios through the real CLI boot path
└── index.test.ts
         broad acceptance/regression matrix
```

TDD tests prove `source -> tokens -> AST -> progress tree -> metrics -> output` one boundary at a time. Complex stage inputs and expected nested objects live in JSON fixtures so test code only loads data and asserts contracts. BDD scenarios prove what a user sees and the exit status returned by `howdone`. The broad matrix protects Unicode, display options, path, error, and fixed-sample behavior.

Path fixtures describe logical path segments. The tests generate relative and absolute forms with the current runtime's `node:path` implementation, including space-containing names; they do not parse foreign operating-system path syntax.
