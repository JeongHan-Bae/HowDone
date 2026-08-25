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
  <img
    src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/JeongHan-Bae/HowDone/main/version_badge_cli.json"
    alt="CLI Version"
    width="216"
  >
</p>

<p align="center">
  <img
    src="https://github.com/JeongHan-Bae/HowDone/actions/workflows/ci.yml/badge.svg"
    alt="CI"
    width="96"
  >
  <br>
  <a href="LICENSE">
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
display are standalone commands. The complete command syntax is documented in
[`docs/syntax.md`](docs/syntax.md).

## More information

For the complete project guide, read the [source README on GitHub](https://github.com/JeongHan-Bae/HowDone/blob/main/README.md).
