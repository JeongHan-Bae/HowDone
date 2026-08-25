# HowDone core

HowDone is a framework-independent hexagonal progress-analysis package. It
exports the core contracts from `howdone` and the port-driven application from
`howdone/application`.

```ts
import { run } from "howdone/application";

const status = await run(argv, io, dependencies);
```

The consumer supplies the filesystem, Markdown, YAML/TOML, warning, and output
ports. This package has no runtime adapter dependencies. The command-line
implementation is published separately as [`howdone-cli`](https://www.npmjs.com/package/howdone-cli),
whose executable name remains `howdone`.

The public port contract is documented in [`docs/api.md`](docs/api.md).
