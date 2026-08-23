import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parseArguments } from "../src/application/cli/args.ts";
import { resolveDisplayOptions } from "../src/core/config/options.ts";
import {
  run,
  VERSION,
} from "../src/application/analyze.ts";
import type { CliDependencies, CliIO } from "../src/application/types.ts";
import { NodeMarkdownFileReader } from "../src/adapters/filesystem/node-file-reader.ts";
import { parseMarkdown } from "../src/boot/pipeline.ts";
import { defaultRemarkLexer } from "../src/adapters/markdown/remark-lexer.ts";
import { TypedAstParser } from "../src/core/ast/parser.ts";
import { runMarkdownPipeline } from "../src/core/source/pipeline.ts";
import { TokenKind } from "../src/core/source/types.ts";
import { JsonRenderer } from "../src/adapters/output/json-renderer.ts";
import { TerminalRenderer } from "../src/adapters/output/terminal-renderer.ts";
import {
  collectLayerStatistics,
  calculateProgress,
  flattenProgressNodes,
} from "../src/core/progress/analyzer.ts";
import {
  countGraphemeClusters,
  truncateLabel,
} from "../src/adapters/output/terminal-renderer.ts";
import {
  formatLabel,
  formatPercentage,
  formatProgress,
} from "../src/adapters/output/terminal-renderer.ts";
import type { RootAst } from "../src/core/ast/types.ts";

const fixedSample = `- A
  - B
    - [x] C1
    - [ ] C2
  - [x] D
`;

function resultOf(markdown: string) {
  return calculateProgress(parseMarkdown(markdown));
}

function labels(markdown: string): string[] {
  return flattenProgressNodes(resultOf(markdown)).map((node) => node.label);
}

function closeEnough(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 0.0000001, `${actual} ≠ ${expected}`);
}

function capture(): { io: CliIO; stdout: () => string; stderr: () => string } {
  let output = "";
  let errors = "";
  return {
    io: {
      stdout: { write: (chunk: string) => { output += chunk; } },
      stderr: { write: (chunk: string) => { errors += chunk; } },
    },
    stdout: () => output,
    stderr: () => errors,
  };
}

function dependenciesFor(markdown: string): CliDependencies {
  return {
    lexer: defaultRemarkLexer,
    parser: new TypedAstParser(),
    fileReader: { read: async () => markdown },
    terminalRenderer: new TerminalRenderer(),
    jsonRenderer: new JsonRenderer(),
  };
}

async function temporaryDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), "howdone-test-"));
}

test("01: recognizes a checked checkbox", () => {
  const result = resultOf("- [ ] pending\n- [x] done\n");
  assert.equal(result.explicitCheckboxCount, 2);
  assert.equal(result.roots[1]?.checked, true);
  closeEnough(result.progress, 0.5);
});

test("02: recognizes an unchecked checkbox", () => {
  const result = resultOf("- [ ] pending\n");
  assert.equal(result.roots[0]?.checked, false);
  closeEnough(result.roots[0]?.progress ?? -1, 0);
});

test("03: recognizes lowercase x", () => {
  assert.equal(resultOf("- [x] done\n").roots[0]?.checked, true);
});

test("04: recognizes uppercase X", () => {
  assert.equal(resultOf("- [X] done\n").roots[0]?.checked, true);
});

test("05: keeps multiple root checkboxes", () => {
  const result = resultOf("- [x] one\n- [ ] two\n- [x] three\n");
  assert.equal(result.rootCount, 3);
  assert.deepEqual(labels("- [x] one\n- [ ] two\n- [x] three\n"), [
    "one",
    "two",
    "three",
  ]);
});

test("06: returns zero for an empty document", () => {
  const result = resultOf("");
  assert.equal(result.nodeCount, 0);
  assert.equal(result.progress, 0);
});

test("07: returns zero when no checkbox exists", () => {
  const result = resultOf("- explanation\n  - more explanation\n");
  assert.equal(result.rootCount, 0);
  assert.equal(result.explicitCheckboxCount, 0);
});

test("08: counts mixed checked states", () => {
  const result = resultOf("- [x] one\n- [ ] two\n- [X] three\n");
  assert.equal(result.explicitCheckboxCount, 3);
  closeEnough(result.completedEquivalent, 2);
});

test("09: preserves task labels without checkbox markers", () => {
  assert.deepEqual(labels("- [x] Ship release\n"), ["Ship release"]);
});

test("10: uses AST list items rather than paragraph text", () => {
  const result = resultOf("A paragraph with [x] text.\n");
  assert.equal(result.nodeCount, 0);
});

test("11: creates an implicit node for one checkbox descendant", () => {
  const result = resultOf("- Group\n  - [x] Child\n");
  assert.equal(result.roots[0]?.implicit, true);
  assert.equal(result.implicitNodeCount, 1);
  assert.equal(result.roots[0]?.children[0]?.label, "Child");
});

test("12: creates an implicit node for multiple descendants", () => {
  const result = resultOf("- Group\n  - [x] A\n  - [ ] B\n");
  assert.equal(result.nodeCount, 3);
  closeEnough(result.roots[0]?.progress ?? -1, 0.5);
});

test("13: creates every implicit node in a deep chain", () => {
  const result = resultOf("- A\n  - B\n    - C\n      - [x] D\n");
  assert.equal(result.implicitNodeCount, 3);
  assert.deepEqual(labels("- A\n  - B\n    - C\n      - [x] D\n"), [
    "A",
    "B",
    "C",
    "D",
  ]);
});

test("14: discards a plain item without checkbox descendants", () => {
  const result = resultOf("- discarded\n  - still discarded\n");
  assert.equal(result.nodeCount, 0);
});

test("15: supports ordered and unordered lists together", () => {
  const result = resultOf("1. Group\n   - [x] child\n");
  assert.equal(result.rootCount, 1);
  assert.equal(result.roots[0]?.children[0]?.checked, true);
});

test("16: mixes explicit and implicit nodes", () => {
  const result = resultOf("- Group\n  - plain\n    - [x] nested\n  - [ ] direct\n");
  assert.equal(result.nodeCount, 4);
  assert.equal(result.explicitCheckboxCount, 2);
  assert.equal(result.implicitNodeCount, 2);
});

test("17: ignores discarded siblings in a statistical branch", () => {
  const result = resultOf("- Group\n  - [x] kept\n  - discarded\n");
  assert.equal(result.roots[0]?.children.length, 1);
  assert.equal(result.nodeCount, 2);
});

test("18: discards a root plain item whose descendants are all plain", () => {
  const result = resultOf("- root\n  - child\n    - grandchild\n");
  assert.equal(result.roots.length, 0);
});

test("19: preserves nested sibling order", () => {
  assert.deepEqual(labels("- A\n  - [x] B\n  - [ ] C\n"), ["A", "B", "C"]);
});

test("20: does not put descendant labels into the parent label", () => {
  assert.deepEqual(labels("- Parent\n  - [x] Child\n"), ["Parent", "Child"]);
});

test("21: supports multiple nested lists below one item", () => {
  const result = resultOf("- Parent\n  - [x] First\n\n  - [ ] Second\n");
  assert.equal(result.roots[0]?.children.length, 2);
});

test("22: ignores a checked parent when its child is unchecked", () => {
  const result = resultOf("- [x] Parent\n  - [ ] Child\n");
  closeEnough(result.roots[0]?.progress ?? -1, 0);
  closeEnough(result.progress, 0);
});

test("23: ignores an unchecked parent when its child is checked", () => {
  const result = resultOf("- [ ] Parent\n  - [x] Child\n");
  closeEnough(result.roots[0]?.progress ?? -1, 1);
  closeEnough(result.progress, 1);
});

test("24: averages a branch with one child", () => {
  const result = resultOf("- Parent\n  - [x] Child\n");
  closeEnough(result.roots[0]?.progress ?? -1, 1);
});

test("25: averages one completed and one pending child", () => {
  const result = resultOf("- Parent\n  - [x] Child A\n  - [ ] Child B\n");
  closeEnough(result.progress, 0.5);
});

test("26: averages three children", () => {
  const result = resultOf("- Parent\n  - [x] A\n  - [ ] B\n  - [x] C\n");
  closeEnough(result.progress, 2 / 3);
});

test("27: recursively averages the fixed acceptance sample", () => {
  const result = resultOf(fixedSample);
  closeEnough(result.roots[0]?.progress ?? -1, 0.75);
  closeEnough(result.roots[0]?.children[0]?.progress ?? -1, 0.5);
});

test("28: averages multiple roots equally", () => {
  const result = resultOf("- [x] done\n- [ ] pending\n");
  closeEnough(result.progress, 0.5);
  closeEnough(result.completedEquivalent, 1);
});

test("29: calculates an implicit root from its children", () => {
  const result = resultOf("- root\n  - [x] child\n");
  closeEnough(result.completedEquivalent, 1);
  assert.equal(result.roots[0]?.checked, null);
});

test("30: averages an implicit and explicit child", () => {
  const result = resultOf("- root\n  - branch\n    - [x] nested\n  - [ ] direct\n");
  closeEnough(result.progress, 0.5);
});

test("31: treats an explicit branch as a branch", () => {
  const result = resultOf("- [x] parent\n  - [ ] child A\n  - [x] child B\n");
  assert.equal(result.roots[0]?.implicit, false);
  closeEnough(result.roots[0]?.progress ?? -1, 0.5);
});

test("32: evaluates a checked leaf as one", () => {
  closeEnough(resultOf("- [x] done\n").roots[0]?.progress ?? -1, 1);
});

test("33: counts explicit checkboxes separately", () => {
  assert.equal(resultOf(fixedSample).explicitCheckboxCount, 3);
});

test("34: counts implicit nodes separately", () => {
  assert.equal(resultOf(fixedSample).implicitNodeCount, 2);
});

test("35: counts all statistical nodes", () => {
  assert.equal(resultOf(fixedSample).nodeCount, 5);
});

test("36: exposes the completed equivalent", () => {
  closeEnough(resultOf(fixedSample).completedEquivalent, 0.75);
});

test("37: exposes percentage as 0 through 100", () => {
  assert.equal(resultOf(fixedSample).percentage, 75);
});

test("38: gives an empty document no completed equivalent", () => {
  assert.equal(resultOf("").completedEquivalent, 0);
});

test("39: assigns zero-based core depths", () => {
  const nodes = flattenProgressNodes(resultOf(fixedSample));
  assert.deepEqual(nodes.map((node) => node.depth), [0, 1, 2, 2, 1]);
});

test("40: returns level statistics", () => {
  assert.deepEqual(collectLayerStatistics(resultOf(fixedSample)), [
    { depth: 0, nodeCount: 1, leafCount: 0, branchCount: 1 },
    { depth: 1, nodeCount: 2, leafCount: 1, branchCount: 1 },
    { depth: 2, nodeCount: 2, leafCount: 2, branchCount: 0 },
  ]);
});

test("41: classifies leaves and branches by statistical children", () => {
  const layers = collectLayerStatistics(resultOf("- root\n  - [x] leaf\n"));
  assert.equal(layers[0]?.branchCount, 1);
  assert.equal(layers[1]?.leafCount, 1);
});

test("42: exposes direct child counts through the tree", () => {
  assert.equal(resultOf(fixedSample).roots[0]?.children.length, 2);
});

test("43: retains source order in the statistics tree", () => {
  assert.deepEqual(labels(fixedSample), ["A", "B", "C1", "C2", "D"]);
});

test("44: ignores parent state in a deeper explicit branch", () => {
  const result = resultOf("- [ ] A\n  - [x] B\n    - [ ] C\n");
  closeEnough(result.progress, 0);
});

test("45: keeps an explicit checkbox with no children as a leaf", () => {
  const node = resultOf("- [x] leaf\n").roots[0];
  assert.equal(node?.children.length, 0);
  assert.equal(node?.implicit, false);
});

test("46: calculates a branch child before its parent", () => {
  const result = resultOf("- A\n  - B\n    - [x] C\n    - [ ] D\n  - [x] E\n");
  closeEnough(result.roots[0]?.children[0]?.progress ?? -1, 0.5);
  closeEnough(result.progress, 0.75);
});

test("47: ignores headings", () => {
  const result = resultOf("# [x] heading\n## title\n");
  assert.equal(result.nodeCount, 0);
});

test("48: ignores ordinary paragraphs", () => {
  const result = resultOf("This is not a task: [ ] no.\n");
  assert.equal(result.nodeCount, 0);
});

test("49: ignores fenced code blocks", () => {
  const result = resultOf("```markdown\n- [x] code\n```\n");
  assert.equal(result.nodeCount, 0);
});

test("50: ignores indented code blocks", () => {
  const result = resultOf("    - [x] indented code\n");
  assert.equal(result.nodeCount, 0);
});

test("51: ignores table text", () => {
  const result = resultOf("| Task | Done |\n| --- | --- |\n| [x] text | yes |\n");
  assert.equal(result.nodeCount, 0);
});

test("52: ignores HTML comments", () => {
  const result = resultOf("<!--\n- [x] hidden\n-->\n");
  assert.equal(result.nodeCount, 0);
});

test("53: ignores YAML frontmatter", () => {
  const result = resultOf("---\nexample: - [x] hidden\n---\n");
  assert.equal(result.nodeCount, 0);
});

test("54: ignores a task-looking inline paragraph", () => {
  const result = resultOf("Text [x] and [ ] are not list items.\n");
  assert.equal(result.explicitCheckboxCount, 0);
});

test("55: ignores a plain list without descendants", () => {
  assert.equal(resultOf("- ordinary\n").rootCount, 0);
});

test("56: keeps formatted text in labels", () => {
  assert.deepEqual(labels("- [x] **Important** task\n"), ["Important task"]);
});

test("57: keeps link text in labels", () => {
  assert.deepEqual(labels("- [x] Read [the docs](https://example.com)\n"), [
    "Read the docs",
  ]);
});

test("58: keeps inline code text in labels", () => {
  assert.deepEqual(labels("- [x] Run `npm test`\n"), ["Run npm test"]);
});

test("59: uses image alt text in labels", () => {
  assert.deepEqual(labels("- [x] See ![diagram](diagram.png)\n"), [
    "See diagram",
  ]);
});

test("60: ignores task markers inside HTML", () => {
  const result = resultOf("<div>- [x] not a Markdown list</div>\n");
  assert.equal(result.nodeCount, 0);
});

test("61: ignores escaped task markers", () => {
  const result = resultOf("- \\[x] escaped\n");
  assert.equal(result.nodeCount, 0);
});

test("62: ignores unsupported dash markers", () => {
  const result = resultOf("- [-] not checked\n");
  assert.equal(result.nodeCount, 0);
});

test("63: keeps a blockquote list outside the document root", () => {
  const result = resultOf("> - [x] this is a quoted list\n");
  assert.equal(result.explicitCheckboxCount, 0);
});

test("64: ignores task-looking text in a TOML-like paragraph", () => {
  const result = resultOf("+++\ntask = '[x] no list'\n+++\n");
  assert.equal(result.nodeCount, 0);
});

test("65: truncates exactly after ten ASCII graphemes", () => {
  assert.equal(truncateLabel("1234567890", 10), "1234567890");
});

test("66: truncates ASCII labels over the limit", () => {
  assert.equal(truncateLabel("12345678901", 10), "1234567890...");
});

test("67: counts Chinese characters as graphemes", () => {
  assert.equal(truncateLabel("这是一个非常长的任务名称", 10), "这是一个非常长的任务...");
});

test("68: truncates mixed Chinese and English labels", () => {
  assert.equal(truncateLabel("任务Task名称", 6), "任务Task...");
});

test("69: keeps emoji clusters intact", () => {
  assert.equal(truncateLabel("😀😀😀😀😀😀😀😀😀😀😀", 10), "😀😀😀😀😀😀😀😀😀😀...");
});

test("70: keeps combining marks intact", () => {
  const label = "e\u0301e\u0301e\u0301e\u0301e\u0301e\u0301e\u0301e\u0301e\u0301e\u0301e\u0301";
  assert.equal(countGraphemeClusters(label), 11);
  assert.equal(truncateLabel(label, 10), `${"e\u0301".repeat(10)}...`);
});

test("71: keeps flag clusters intact", () => {
  const label = "🇨🇳🇺🇸🇯🇵🇬🇧🇫🇷🇩🇪🇮🇹🇪🇸🇰🇷🇦🇺🇨🇦";
  assert.equal(countGraphemeClusters(label), 11);
  assert.equal(countGraphemeClusters(truncateLabel(label, 10).replace(/\.\.\.$/u, "")), 10);
});

test("72: keeps ZWJ emoji clusters intact", () => {
  const family = "👨‍👩‍👧‍👦";
  assert.equal(countGraphemeClusters(family.repeat(11)), 11);
  assert.equal(truncateLabel(family.repeat(11), 10), `${family.repeat(10)}...`);
});

test("73: supports a custom truncation length", () => {
  assert.equal(truncateLabel("abcdefghij", 3), "abc...");
});

test("74: supports no truncation through display options", () => {
  const options = resolveDisplayOptions(undefined, true);
  assert.equal(formatLabel("a very long label", options), "a very long label");
});

test("75: leaves an empty label empty", () => {
  assert.equal(truncateLabel("", 10), "");
});

test("76: leaves a one-grapheme label unchanged", () => {
  assert.equal(truncateLabel("😀", 1), "😀");
});

test("77: uses the fixed ellipsis for display truncation", () => {
  assert.equal(truncateLabel("abcdef", 3, "…"), "abc…");
});

test("78: does not truncate labels in the default summary", () => {
  assert.equal(formatPercentage(2 / 3), "66.666667%");
});

test("79: parses the tree mode", () => {
  assert.equal(parseArguments(["file.md", "--tree"]).mode, "tree");
});

test("80: parses the details mode", () => {
  assert.equal(parseArguments(["file.md", "--details"]).mode, "details");
});

test("81: renders the default CLI output in English", async () => {
  const output = capture();
  const exitCode = await run(["tasks.md"], output.io, dependenciesFor(fixedSample));
  assert.equal(exitCode, 0);
  assert.equal(output.stdout(), "75%\n");
});

test("82: renders the tree CLI output", async () => {
  const output = capture();
  const exitCode = await run(["tasks.md", "--tree"], output.io, dependenciesFor(fixedSample));
  assert.equal(exitCode, 0);
  assert.match(output.stdout(), /└─ \[75%\] A/u);
  assert.match(output.stdout(), /├─ \[100%\] C1/u);
});

test("83: renders detailed statistics", async () => {
  const output = capture();
  const exitCode = await run(["tasks.md", "--details"], output.io, dependenciesFor(fixedSample));
  assert.equal(exitCode, 0);
  assert.match(output.stdout(), /Level 2: 2 nodes, 1 leaf node, 1 branch node/u);
  assert.match(output.stdout(), /Equivalent completed: 0.75 \/ 1/u);
});

test("84: renders help", async () => {
  const output = capture();
  const exitCode = await run(["--help"], output.io, dependenciesFor(""));
  assert.equal(exitCode, 0);
  assert.match(output.stdout(), /Usage:/u);
  assert.match(output.stdout(), /--max-label-clusters/u);
  assert.equal(output.stderr(), "");
});

test("85: renders the version", async () => {
  const output = capture();
  const exitCode = await run(["--version"], output.io, dependenciesFor(""));
  assert.equal(exitCode, 0);
  assert.equal(output.stdout(), `${VERSION}\n`);
});

test("86: rejects a missing path", async () => {
  const output = capture();
  const exitCode = await run([], output.io, dependenciesFor(""));
  assert.equal(exitCode, 1);
  assert.match(output.stderr(), /Markdown file path is required/u);
});

test("87: rejects an unknown option", async () => {
  const output = capture();
  const exitCode = await run(["tasks.md", "--unknown"], output.io, dependenciesFor(""));
  assert.equal(exitCode, 1);
  assert.match(output.stderr(), /Unknown option/u);
});

test("88: rejects every mutually exclusive mode combination", () => {
  const modePairs = [
    ["--tree", "--details"],
    ["--tree", "--json"],
    ["--details", "--json"],
    ["--tree", "--details", "--json"],
  ];

  for (const modes of modePairs) {
    assert.throws(
      () => parseArguments(["tasks.md", ...modes]),
      /mutually exclusive/u,
      modes.join(" "),
    );
  }
});

test("89: rejects an invalid maximum label length", () => {
  assert.throws(() => parseArguments(["tasks.md", "--max-label-clusters", "0"]), /positive/u);
});

test("90: accepts --no-truncate", () => {
  assert.equal(parseArguments(["tasks.md", "--no-truncate"]).noTruncate, true);
});

test("91: accepts an equals-form maximum label length", () => {
  assert.equal(parseArguments(["tasks.md", "--max-label-clusters=15"]).maxLabelClusters, 15);
});

test("92: accepts a path after --", () => {
  assert.equal(parseArguments(["--", "-notes.md"]).path, "-notes.md");
});

test("93: keeps a platform path string as a path argument", () => {
  assert.equal(parseArguments(["C:\\Docs\\任务.md"]).path, "C:\\Docs\\任务.md");
});

test("94: resolves a relative Markdown file through the Node adapter", async () => {
  const directory = await temporaryDirectory();
  try {
    await writeFile(join(directory, "relative.md"), "- [x] done\n", "utf8");
    const text = await new NodeMarkdownFileReader(directory).read("relative.md");
    assert.equal(text, "- [x] done\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("95: reads an absolute Unicode path with spaces", async () => {
  const directory = await temporaryDirectory();
  const filePath = join(directory, "我的 tasks.md");
  try {
    await writeFile(filePath, "- [x] done\n", "utf8");
    const text = await new NodeMarkdownFileReader().read(filePath);
    assert.equal(text, "- [x] done\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("96: rejects a missing Markdown file", async () => {
  await assert.rejects(
    () => new NodeMarkdownFileReader().read("missing-file.md"),
    /file not found/u,
  );
});

test("97: rejects a non-Markdown extension", async () => {
  await assert.rejects(
    () => new NodeMarkdownFileReader().read("tasks.txt"),
    /\.md or \.markdown/u,
  );
});

test("98: rejects a directory path", async () => {
  const directory = await temporaryDirectory();
  try {
    await assert.rejects(
      () => new NodeMarkdownFileReader().read(directory),
      /\.md or \.markdown|not a file/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("99: applies the CLI truncation limit", async () => {
  const output = capture();
  const exitCode = await run(
    ["tasks.md", "--tree", "--max-label-clusters", "3"],
    output.io,
    dependenciesFor("- [x] abcdef\n"),
  );
  assert.equal(exitCode, 0);
  assert.match(output.stdout(), /abc\.\.\./u);
});

test("100: applies --no-truncate to tree output", async () => {
  const output = capture();
  const exitCode = await run(
    ["tasks.md", "--tree", "--no-truncate"],
    output.io,
    dependenciesFor("- [x] abcdefghijkl\n"),
  );
  assert.equal(exitCode, 0);
  assert.match(output.stdout(), /abcdefghijkl/u);
});

test("101: resolves fixed display defaults", () => {
  assert.equal(resolveDisplayOptions(undefined, false).precision, 2);
  assert.equal(resolveDisplayOptions(undefined, false, "decimal").precision, 4);
  assert.equal(
    resolveDisplayOptions(
      undefined,
      false,
      "percentage",
      3,
    ).precision,
    3,
  );
  assert.equal(
    resolveDisplayOptions(
      undefined,
      false,
      "percentage",
      3,
      true,
    ).showTrailingZeros,
    true,
  );
  assert.throws(
    () => resolveDisplayOptions(undefined, false, "decimal", 0),
    /at least 1/u,
  );
});

test("106: uses an empty document in CLI output", async () => {
  const output = capture();
  const exitCode = await run(["empty.md"], output.io, dependenciesFor(""));
  assert.equal(exitCode, 0);
  assert.equal(output.stdout(), "0%\n");
});

test("107: details output reports no statistical nodes", async () => {
  const output = capture();
  const exitCode = await run(["empty.md", "--details"], output.io, dependenciesFor(""));
  assert.equal(exitCode, 0);
  assert.match(output.stdout(), /No statistical nodes found/u);
});

test("108: tree output reports no statistical nodes", async () => {
  const output = capture();
  const exitCode = await run(["empty.md", "--tree"], output.io, dependenciesFor(""));
  assert.equal(exitCode, 0);
  assert.match(output.stdout(), /No statistical nodes found/u);
});

test("109: parser adapter returns a library-independent document", () => {
  const document: RootAst = parseMarkdown("- [x] task\n");
  assert.equal(document.children[0]?.type, "list");
  if (document.children[0]?.type === "list") {
    assert.equal(document.children[0].items[0]?.children[0]?.type, "paragraph");
    assert.equal(document.children[0].items[0]?.checked, true);
  }
});

test("110: the core can calculate a manually supplied document", () => {
  const document: RootAst = {
    type: "root",
    children: [
      {
        type: "list",
        ordered: false,
        start: null,
        items: [
          {
            type: "list-item",
            checked: null,
            children: [
              { type: "paragraph", text: "A" },
              {
                type: "list",
                ordered: false,
                start: null,
                items: [
                  {
                    type: "list-item",
                    checked: true,
                    children: [{ type: "paragraph", text: "B" }],
                  },
                  {
                    type: "list-item",
                    checked: false,
                    children: [{ type: "paragraph", text: "C" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const result = calculateProgress(document);
  closeEnough(result.progress, 0.5);
  assert.equal(result.nodeCount, 3);
});

test("111: does not mutate the source text", () => {
  const source = "- [x] unchanged\n";
  const before = source;
  calculateProgress(parseMarkdown(source));
  assert.equal(source, before);
});

test("112: uses six decimal places for repeating percentages", () => {
  assert.equal(formatPercentage(1 / 3), "33.333333%");
});

test("113: formats a complete percentage without decimals", () => {
  assert.equal(formatPercentage(1), "100%");
});

test("114: supports the short help flag", () => {
  assert.equal(parseArguments(["-h"]).help, true);
});

test("115: supports the short version flag", () => {
  assert.equal(parseArguments(["-v"]).version, true);
});

test("116: rejects a second positional path", () => {
  assert.throws(() => parseArguments(["one.md", "two.md"]), /Only one/u);
});

test("117: accepts the markdown extension case-insensitively", async () => {
  const directory = await temporaryDirectory();
  const filePath = join(directory, "TASKS.MARKDOWN");
  try {
    await writeFile(filePath, "- [x] done\n", "utf8");
    assert.equal(await new NodeMarkdownFileReader().read(filePath), "- [x] done\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("118: supports a .markdown file through the CLI adapter", async () => {
  const directory = await temporaryDirectory();
  const filePath = join(directory, "tasks.markdown");
  try {
    await writeFile(filePath, "- [x] done\n", "utf8");
    const output = capture();
    const exitCode = await run([filePath], output.io, {
      lexer: defaultRemarkLexer,
      parser: new TypedAstParser(),
      fileReader: new NodeMarkdownFileReader(),
      terminalRenderer: new TerminalRenderer(),
      jsonRenderer: new JsonRenderer(),
    });
    assert.equal(exitCode, 0);
    assert.equal(output.stdout(), "100%\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("119: reads UTF-8 Chinese content", async () => {
  const directory = await temporaryDirectory();
  const filePath = join(directory, "任务.md");
  try {
    await writeFile(filePath, "- [x] 已完成\n", "utf8");
    const source = await readFile(filePath, "utf8");
    assert.equal(resultOf(source).roots[0]?.label, "已完成");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("120: keeps the default truncation limit in resolved options", () => {
  const options = resolveDisplayOptions(undefined, false);
  assert.equal(options.maxLabelClusters, 10);
  assert.equal(options.ellipsis, "...");
  assert.equal(options.truncate, true);
  assert.equal(options.progressFormat, "percentage");
  assert.equal(options.precision, 2);
  assert.equal(options.showTrailingZeros, false);
});

test("121: emits typed lexer tokens before AST parsing", () => {
  const pipeline = runMarkdownPipeline(
    "---\ntitle: sample\n---\n\n- [x] done\n",
    defaultRemarkLexer,
    new TypedAstParser(),
  );
  assert.equal(pipeline.tokens[0]?.kind, TokenKind.frontmatter);
  assert.ok(pipeline.tokens.some((token) => token.kind === TokenKind.syntaxNode));
  assert.equal(pipeline.tokens.at(-1)?.kind, TokenKind.eof);
  assert.equal(pipeline.ast.children[1]?.type, "list");
});

test("122: lexer tokens preserve source spans", () => {
  const token = defaultRemarkLexer.lex("- [x] done\n")[0];
  assert.equal(token?.start.offset, 0);
  assert.equal(token?.end.offset, 10);
  assert.equal(token?.lexeme, "- [x] done");
});

test("123: AST contracts contain explicit list-item state", () => {
  const ast = parseMarkdown("- [X] Done\n");
  assert.equal(ast.children[0]?.type, "list");
  if (ast.children[0]?.type === "list") {
    assert.equal(ast.children[0].items[0]?.checked, true);
  }
});

test("124: JSON rendering preserves numeric progress fields and raw labels", () => {
  const renderer = new JsonRenderer();
  const json = renderer.render({
    source: { path: "tasks.md" },
    progress: resultOf("- [x] This is a very long label\n"),
  });
  const parsed = JSON.parse(json) as {
    source: { path: string };
    progress: { progress: number; percentage: number; roots: Array<{ label: string }> };
  };
  assert.equal(parsed.source.path, "tasks.md");
  assert.equal(parsed.progress.progress, 1);
  assert.equal(parsed.progress.percentage, 100);
  assert.equal(parsed.progress.roots[0]?.label, "This is a very long label");
});

test("125: exposes JSON as a CLI output mode", async () => {
  const output = capture();
  const exitCode = await run(["tasks.md", "--json"], output.io, dependenciesFor(fixedSample));
  assert.equal(exitCode, 0);
  assert.match(output.stdout(), /"progress"/u);
  assert.match(output.stdout(), /"percentage": 75/u);
});

test("126: parses progress format and precision options", () => {
  assert.equal(parseArguments(["file.md"]).format, "percentage");
  assert.equal(parseArguments(["file.md", "--format", "decimal"]).format, "decimal");
  assert.equal(parseArguments(["file.md", "--format=percentage"]).format, "percentage");
  assert.equal(parseArguments(["file.md", "--precision", "0"]).precision, 0);
  assert.equal(
    parseArguments(["file.md", "--format", "decimal", "--precision", "1"]).precision,
    1,
  );
});

test("127: rejects precision values below the format minimum", () => {
  assert.throws(
    () => parseArguments(["file.md", "--format", "decimal", "--precision", "0"]),
    /at least 1 for decimal/u,
  );
  assert.throws(
    () => parseArguments(["file.md", "--precision", "101"]),
    /0 through 100/u,
  );
});

test("128: formats percentage and decimal values with CLI precision", () => {
  assert.equal(formatProgress(0.50103), "50.1%");
  assert.equal(formatProgress(0.5), "50%");
  assert.equal(formatProgress(0.5, "percentage", 2, true), "50.00%");
  assert.equal(formatProgress(0.501234, "decimal"), "0.5012");
  assert.equal(formatProgress(0.5, "decimal"), "0.5");
  assert.equal(formatProgress(0.5, "decimal", 4, true), "0.5000");
});

test("129: CLI format options control the concise default output", async () => {
  const decimalOutput = capture();
  const decimalExitCode = await run(
    ["tasks.md", "--format", "decimal"],
    decimalOutput.io,
    dependenciesFor(fixedSample),
  );
  assert.equal(decimalExitCode, 0);
  assert.equal(decimalOutput.stdout(), "0.75\n");

  const percentageOutput = capture();
  const percentageExitCode = await run(
    ["tasks.md", "--percentage", "--precision", "2", "--show-trailing-zeros"],
    percentageOutput.io,
    dependenciesFor(fixedSample),
  );
  assert.equal(percentageExitCode, 0);
  assert.equal(percentageOutput.stdout(), "75.00%\n");
});

test("130: JSON truncates labels only when an explicit limit is supplied", async () => {
  const output = capture();
  const exitCode = await run(
    ["tasks.md", "--json", "--max-label-clusters", "5"],
    output.io,
    dependenciesFor("- [x] 123456789012345\n"),
  );
  assert.equal(exitCode, 0);
  assert.match(output.stdout(), /"label": "12345\.\.\."/u);
});
