# Development workflow

## Test-first workflow

Use the smallest boundary that proves the change:

1. Update or add a `test/tdd` test for the affected source, token, AST, progress-tree, metric, or serializer contract.
2. Implement the change in the owning `core` stage or its `adapters` implementation.
3. Add/update a `test/bdd/features/*.feature` scenario when the command's final stdout, JSON, exit status, or path behavior changes.
4. Update `README.md`, `docs/api.md`, `docs/architecture.md`, or `AGENTS.md` when the corresponding user/API/architecture/development contract changes.
5. Run the full verification gate.

TDD tests must assert the intermediate result, not only the final percentage. BDD tests must exercise the real executable path through `bin/howdone.cjs` and `src/boot/main.ts`; injecting a fake parser is not a substitute for a BDD scenario.

## Commands

```bash
npm install
npm run typecheck
npm test              # Node test runner: regression + TDD pipeline tests
npm run test:bdd      # Cucumber black-box CLI behavior
npm run test:all
npm run pack:check
```

The repository currently has no separate lint or compiled build script. The
runtime package ships the TypeScript source and the small `bin/howdone.cjs`
loader, so CI uses the real project checks: deterministic `npm ci`, typecheck,
TDD/regression tests, BDD tests, and `npm run pack:check`.

`.github/workflows/ci.yml` runs through `actions/checkout@v5` and
`actions/setup-node@v5` on Ubuntu, macOS, and Windows. Push and pull-request
CI is limited to changes in the CI workflow, `bin/`, `src/`, `test/`, the npm
manifests, and `tsconfig.json`; README, other documentation, and release-only
changes do not trigger normal CI. Manual dispatch and `workflow_call` remain
available, so the Release workflow can still invoke the reusable CI gate.

Each operating-system job runs the same Node.js 18, 20, 22, 24, and 26
matrix, including dependency audit, typecheck, TDD, BDD, and package checks.
The shared matrix and steps are declared once with YAML anchors and reused by
the three OS jobs. Cucumber 11.3.0 is declared once in `package.json` and
supports every Node.js line in the matrix; npm `overrides` pin the
vulnerable/deprecated transitive `uuid` and `glob` packages to fixed versions.
Every matrix row therefore runs the exact dependency graph produced by
`npm ci` from the committed manifest and lockfile. `.github/workflows/release.yml`
calls that same workflow first; its
`publish` job has `needs: ci`, so npm publishing cannot run when any CI check
fails.

Formal releases are tag-driven. A tag such as `v0.1.0` or
`v1.1.0-beta.1` is validated as npm SemVer, the leading `v` is removed, and
`npm version VERSION --no-git-tag-version` synchronizes the publish workspace
before `npm publish --tag latest`. This does not create a commit or a tag.

The first public package is a separate bootstrap operation. The repository
starts at `howdone@0.0.1`; after the local and CI gates pass, publish it with
`npm publish --tag alpha` so it does not become the `latest` dist-tag. Do not
use the formal tag Release workflow for this bootstrap publication.

For a local command check:

```bash
node ./bin/howdone.cjs ./tasks.md
node ./bin/howdone.cjs ./tasks.md --format decimal
node ./bin/howdone.cjs ./tasks.md --precision 3 --show-trailing-zeros
node ./bin/howdone.cjs ./tasks.md --tree
node ./bin/howdone.cjs ./tasks.md --details
node ./bin/howdone.cjs ./tasks.md --json
```

## Adding a pipeline stage

- Add the stage contract under `src/core/**/types.ts` or `src/core/ports.ts`.
- Keep the implementation in the owning `core` stage when it is pure policy.
- Put library/filesystem/terminal behavior in `src/adapters` behind the port.
- Compose the default implementation only in `src/boot/main.ts`.
- Add TDD tests for the new stage and its incoming/outgoing boundaries.
- Add a BDD feature only when the user-visible result changes.

## Error and portability rules

- Return non-zero status for invalid CLI input, unreadable/non-Markdown paths, invalid option values, and parser errors.
- Use Node `node:path`/`node:fs` for platform-native path semantics; never hand-roll a Windows/POSIX path grammar.
- Keep business and parsing logic TypeScript. The CommonJS launcher is an execution shim only.
- Do not use network access, browser APIs, `eval`, or dynamic code generation.
