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
  <a href="https://github.com/JeongHan-Bae/HowDone/tree/main/packages/core#readme">
    <img
      src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/JeongHan-Bae/HowDone/main/version_badge.json"
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
  <h2>Install HowDone Core</h2>
  <pre style="font-size: 1.35em;"><code>npm install howdone</code></pre>
</div>

HowDone Core is the reusable engine behind HowDone. It is a library for
projects that want to use the progress model and application contracts without
installing the command-line product.

## What you get

The package exports the framework-independent Core API from `howdone`, the
standard dependency-free AST parser implementation from `howdone/std`, and the
port-driven application from `howdone/application`. It has no CLI bin and no
runtime adapter dependencies.

## Use it in another project

```ts
import { run } from "howdone/application";

const status = await run(argv, io, dependencies);
```

The consumer supplies the external filesystem, Markdown, YAML/TOML, and output
Ports. It may use `TypedAstParser` from `howdone/std` for the parser Port or
replace that Port with its own implementation. Other external Ports are
provided by the composing application.

## Need the command line?

<h3>
  <a href="https://www.npmjs.com/package/howdone-cli">howdone-cli</a>
</h3>

This is the primary product. It provides the `howdone` and `howdone-cli`
commands.

## More information

For the complete project guide, read the [source README on GitHub](https://github.com/JeongHan-Bae/HowDone#readme).

The public port contract is documented in [`docs/api.md`](docs/api.md).
