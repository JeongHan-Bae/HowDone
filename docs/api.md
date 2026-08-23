# API contract

The supported programmatic API is intentionally small. Import from `src/core/index.ts` during local development or use the individual stage modules when a test needs a precise boundary.

## Pipeline

```ts
import { runMarkdownPipeline } from "./src/core/source/pipeline.ts";
import { TypedAstParser } from "./src/core/ast/parser.ts";
import { defaultRemarkLexer } from "./src/adapters/markdown/remark-lexer.ts";

const document = runMarkdownPipeline(
  source,
  defaultRemarkLexer,
  new TypedAstParser(),
  "tasks.md",
);
```

`SourceDocument` contains the original source, local `LexerToken[]`, and local `RootAst`. The source text is preserved for diagnostics; later display adapters must not mutate it.

## Progress API

```ts
import { calculateProgress } from "./src/core/progress/analyzer.ts";

const result = calculateProgress(document.ast);
```

`ProgressResult` contains:

```ts
interface ProgressResult {
  rootCount: number;
  explicitCheckboxCount: number;
  implicitNodeCount: number;
  nodeCount: number;
  completedEquivalent: number;
  progress: number;   // 0..1
  percentage: number; // 0..100
  roots: CheckboxNode[];
}
```

`CheckboxNode.progress` is recursively calculated. Leaf states use `1`/`0`; branch states average statistical children and ignore the node's own `checked` value. `completedEquivalent` is the sum of root progress values and roots have equal weight.

## Output API

`ResolvedDisplayOptions` controls terminal formatting:

```ts
interface ResolvedDisplayOptions {
  maxLabelClusters: number;
  ellipsis: string;
  truncate: boolean;
  progressFormat: "decimal" | "percentage";
  precision: number;
  showTrailingZeros: boolean;
}
```

Percentage output defaults to two decimal places and decimal output defaults to four. Trailing zeroes are omitted by default. Percentage precision may be `0`; decimal precision must be at least `1`.

`JsonRenderer` serializes a `ProgressReport`:

```json
{
  "source": { "path": "tasks.md" },
  "progress": {
    "rootCount": 1,
    "explicitCheckboxCount": 3,
    "implicitNodeCount": 2,
    "nodeCount": 5,
    "completedEquivalent": 0.75,
    "progress": 0.75,
    "percentage": 75,
    "roots": []
  }
}
```

The example abbreviates `roots`; the actual output includes the complete tree. JSON labels remain complete when no display options are passed. The CLI passes label options only when truncation was explicitly requested, so `--json --max-label-clusters N` truncates labels without changing numeric fields. `TerminalRenderer` applies `ResolvedDisplayOptions` to the concise, tree, and details output values and labels.
