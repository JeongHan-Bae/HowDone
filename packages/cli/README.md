<h1 align="center">
  <span>
    <img src="https://skillicons.dev/icons?i=ts"
         alt="TypeScript"
         width="72" valign="middle">
  </span>
  <span style="font-size: x-large;">&nbsp;</span>
  <span>
    <img src="https://raw.githubusercontent.com/cucumber/cucumber-js/46a5a78107be27e99c6e044c69b6e8f885ce456c/docs/images/logo.svg"
         alt="Cucumber"
         width="68" valign="middle">
  </span>
  <span style="font-size: x-large;">&nbsp;HowDone</span>
</h1>

<p align="center">
  <a href="https://github.com/JeongHan-Bae/HowDone/tree/main/packages/cli#readme">
    <img
      src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/JeongHan-Bae/HowDone/main/version_badge_cli.json"
      alt="Version"
      width="196"
    >
  </a>
</p>

<p align="center">
  <a href="https://github.com/JeongHan-Bae/HowDone/actions/workflows/ci.yml">
    <img
      src="https://github.com/JeongHan-Bae/HowDone/actions/workflows/ci.yml/badge.svg"
      alt="CI"
      width="96"
    >
  </a>
  <br>
  <a href="https://github.com/JeongHan-Bae/HowDone/tree/main?tab=Apache-2.0-1-ov-file#readme">
    <img
      src="https://img.shields.io/github/license/JeongHan-Bae/HowDone"
      alt="CLI Version"
      width="144"
    >
  </a>
</p>

<div align="center">
  <h2>Install HowDone CLI</h2>
  <pre style="font-size: 1.35em;"><code>npm install --global howdone-cli</code></pre>
</div>

HowDone CLI is the primary product. It reads a local Markdown file and tells
you how much of its task list is complete.

## Run it

After the global install, run either command:

```bash
howdone tasks.md
howdone-cli tasks.md
```

The package includes the matching HowDone Core automatically.

## Install it in a project

```bash
npm install howdone-cli
npx howdone-cli tasks.md
npx howdone tasks.md
```

For a one-time run without adding it to a project, use npx directly:

```bash
npx howdone-cli tasks.md
```

Run `npx howdone-cli tasks.md` once first so npx registers the CLI package;
after that, `npx howdone tasks.md` is also valid.

## Commands

The CLI has four independent commands:

```text
howdone <markdown-path> [options]
howdone --help
howdone --version
howdone --dependencies
```

Only the Markdown-path command reads a document. Help, version, and dependency
display are standalone commands. The complete CLI usage, including command and
option ownership, is documented in the [CLI guide](docs/guide.md). The source
language rules are documented in the [source syntax contract](docs/syntax.md).

## HowDone in action

<p align="center">
  <a href="https://raw.githubusercontent.com/JeongHan-Bae/HowDone/main/docs/assets/task-editor.svg">
    <img
      src="https://raw.githubusercontent.com/JeongHan-Bae/HowDone/main/docs/assets/task-editor.svg"
      alt="Illustrative Markdown task list"
    >
  </a>
  <br>
  <a href="https://raw.githubusercontent.com/JeongHan-Bae/HowDone/main/docs/assets/howdone-terminal.svg">
    <img
      src="https://raw.githubusercontent.com/JeongHan-Bae/HowDone/main/docs/assets/howdone-terminal.svg"
      alt="Illustrative HowDone terminal report"
    >
  </a>
</p>

Write or update a Markdown checklist, run HowDone, and see its completion state
as a structured terminal report. HowDone reads the local file and leaves **the
source unchanged**.

## More information

For complete CLI usage, read the [CLI guide](docs/guide.md). For the complete
project context, read the [source README on GitHub](https://github.com/JeongHan-Bae/HowDone#readme).
