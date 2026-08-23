# Test layout

The project keeps two complementary test layers, following the reference projects' behavior rather than their architectures:

```text
test/
├── tdd/     deterministic stage-contract tests
├── bdd/     Cucumber scenarios through the real CLI boot path
└── index.test.ts
         broad acceptance/regression matrix
```

TDD tests prove `source -> tokens -> AST -> progress tree -> metrics -> output` one boundary at a time. BDD scenarios prove what a user sees and the exit status returned by `howdone`. The broad matrix protects Unicode, display options, path, error, and fixed-sample behavior.
