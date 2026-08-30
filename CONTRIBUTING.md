# Contributing

This document defines the commit-message format, pull-request format, review
expectations, and final handoff evidence for HowDone. It intentionally keeps
implementation, architecture, test, release, and documentation details in
their owning guides:

- [`AGENTS.md`](AGENTS.md): implementation constraints, architecture, runtime
  policy, documentation ownership, and high-level test taxonomy;
- [`test/AGENTS.md`](test/AGENTS.md): detailed TDD, BDD, fixture, combination,
  oracle, and test-verification rules;
- [`docs/development.md`](docs/development.md): development commands, CI,
  package maintenance, and release procedure;
- [`docs/guide.md`](docs/guide.md), [`docs/syntax.md`](docs/syntax.md), and
  [`docs/api.md`](docs/api.md): the CLI, source/result, and public Core
  contracts.

Read the owning guide before changing its contract. Keep implementation, tests,
and documentation for the same contract in one change.

## Final verification

Run the mandatory final contribution gate after the final file change:

```bash
npm run verify:precommit
```

Its scope and order are documented in [`docs/development.md`](docs/development.md).
A focused command or an earlier run is not a substitute. Do not bypass the gate
with `git commit --no-verify`, skip a failure, or weaken an assertion.

If the environment prevents a required check from running, report the exact
project command, error, and remaining risk; do not describe that check as
passed. Version-badge maintenance is separate from this gate.

## Change hygiene

Inspect the intended change with both `git diff` and `git diff --cached`. Stage
only files belonging to that change. Do not include `node_modules`, IDE state,
local npm configuration, build output, coverage, logs, package archives,
temporary reference material, generated package copies, or the independent
version-badge files in an ordinary change.

When a manifest or dependency changes, update `package-lock.json` through npm
and review the generated diff; do not edit the lockfile by hand. The detailed
generated-file and package-document rules are in [`AGENTS.md`](AGENTS.md).

## Commit messages

Every commit message uses this format:

```text
behavior(domain, domain): one-line summary

Detailed description paragraph.

* One-level bullet point.
* Another one-level bullet point.
```

The first line is required and contains:

- a lowercase change kind such as `init`, `fix`, `refactor`, or `docs`;
- one or more affected domains in parentheses, separated by an English comma
  and space;
- an English colon followed by one space;
- a concise one-line summary.

Examples:

```text
init(project): scaffold HowDone CLI
fix(cli, output): correct percentage formatting
refactor(adapters, core): preserve the dependency direction
docs(contributing): define commit and pull request rules
```

The body is optional. When present, use plain paragraphs and one-level `*`
bullets only. Do not use headings, tables, links, fenced code blocks,
blockquotes, emphasis, checkboxes, numbered lists, or nested bullets in the
commit body.

## Pull requests

After the `0.1.0` formal release, direct commits to `main` are reserved for the
repository owner. Other contributors must work on a branch and submit a pull
request.

A pull request description must state:

- what changed and why it is necessary;
- which architecture boundary owns the change;
- whether public CLI, JSON, or TypeScript API behavior changed;
- which final and focused project checks passed;
- whether the owning documentation agrees with the implementation;
- any unavailable check, its exact error, and its remaining risk.

Use this structure:

```markdown
## Summary

Describe what changed.

## Reason

Explain why the change is necessary.

## Breaking API Updates

State `None` or describe the breaking change.

## Checks

- `npm run verify:precommit`
- Other relevant focused or environment-specific project checks
```

Do not list a focused command as a replacement for the final gate. Keep the
commit format and pull-request format separate: Markdown headings and links
belong in the pull request, not in the commit message.

## Review and handoff

Reviewers should be able to identify the owning contract, the tests that prove
it, the documentation that describes it, and the final verification result.
Before handoff, report the relevant changed files and contracts, the exact
final gate result, any focused checks that add useful evidence, and any
intentionally uncommitted work. An unavailable or failed check remains
unverified until its blocker is resolved and the aggregate gate passes.

Stable release tags and publishing are workflow-owned; follow
[`docs/development.md`](docs/development.md) for that procedure rather than
adding release steps to a commit or pull-request description.
