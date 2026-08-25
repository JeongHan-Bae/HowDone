# HowDone CLI

HowDone CLI is the primary product. It reads a local Markdown file and reports
hierarchical task-list progress through the `howdone` command.

```bash
npm install --global howdone-cli
howdone tasks.md
howdone-cli tasks.md
npx howdone-cli tasks.md
npx howdone tasks.md
howdone --help
howdone --version
howdone --dependencies
```

Run `npx howdone-cli tasks.md` once first so npx registers the CLI package;
after that, `npx howdone tasks.md` is also valid. The `howdone-cli` package is
the command executor and depends on the dependency-free `howdone` hexagonal
core package. Only the Markdown-path form reads a document; help, version, and
dependency display are standalone commands. The complete command syntax is documented in
[`docs/syntax.md`](docs/syntax.md).

For the complete project installation guide, Core overview, and CLI quickstart,
see the [HowDone root README on GitHub](https://github.com/JeongHan-Bae/HowDone/blob/main/README.md).
