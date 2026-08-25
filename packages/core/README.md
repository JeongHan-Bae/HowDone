# HowDone core

HowDone is a framework-independent hexagonal core package. It is the reusable
core of the two-part product and exports the core contracts from `howdone` and
the port-driven application from `howdone/application`.

```ts
import { run } from "howdone/application";

const status = await run(argv, io, dependencies);
```

The consumer supplies the filesystem, Markdown, YAML/TOML, warning, and output
ports. This package has no runtime adapter dependencies. The primary
command-line product and executor is published separately as
[`howdone-cli`](https://github.com/JeongHan-Bae/HowDone/tree/main/packages/cli), whose
executables are `howdone` and `howdone-cli`.

For the complete project installation guide and CLI quickstart, see the
[HowDone root README on GitHub](https://github.com/JeongHan-Bae/HowDone/blob/main/README.md).

The public port contract is documented in [`docs/api.md`](docs/api.md).
