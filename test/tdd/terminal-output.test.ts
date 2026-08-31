import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { calculateProgress, resolveDisplayOptions } from "howdone";
import { parseMarkdown } from "../../src/boot/pipeline.ts";
import { InkTerminalRenderer } from "../../src/adapters/output/ink-terminal-renderer.ts";
import {
  terminalColorForSemantic,
  terminalOutputText,
} from "../../src/adapters/output/terminal-colors.ts";
import { TerminalOutputDocument } from "../../src/adapters/output/terminal-output.ts";
import { TerminalRenderer } from "../../src/adapters/output/terminal-renderer.ts";
import {
  terminalVisualLineCount,
  terminalVisualLineRange,
  terminalVisualWidth,
} from "../../src/adapters/output/terminal-width.ts";
import type { TerminalOutput } from "../../src/adapters/output/terminal-output.ts";
import type {
  ProgressReport,
  ProgressResult,
  TerminalTextDocument,
} from "howdone";
import { inputStream, terminalStream } from "./output-streams.ts";

function reportFor(progress: ProgressResult): ProgressReport {
  return {
    source: { path: "tasks.md" },
    markdown: progress,
    markdownPresent: true,
    frontmatter: [],
    frontmatterPresent: false,
    presentation: "separate",
    progress,
  };
}

function outputFor(...lines: string[]): TerminalOutput {
  return new TerminalOutputDocument(
    lines.map((text) => text.length === 0
      ? { parts: [] }
      : { parts: [{ text }] }),
  );
}

function capturedText(stream: PassThrough): () => string {
  let text = "";
  stream.on("data", (chunk: Buffer | string) => {
    text += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
  });
  return () => text;
}

test("TDD terminal semantics color progress while tree structure stays default", () => {
  const result = calculateProgress(parseMarkdown(
    "- root\n  - [x] done\n  - [ ] pending\n- [x] complete\n",
  ).body);
  const output = new TerminalRenderer().render(
    "tree",
    reportFor(result),
    resolveDisplayOptions(undefined, false),
  );

  assert.equal(terminalColorForSemantic("complete"), "green");
  assert.equal(terminalColorForSemantic("partial"), "yellow");
  assert.equal(terminalColorForSemantic("zero"), "red");
  assert.equal(terminalColorForSemantic("accent"), "cyan");

  const connectorSemantics = output.lines
    .flatMap((line) => line.parts)
    .filter((part) => part.text === "\u251c\u2500" || part.text === "\u2514\u2500")
    .map((part) => part.semantic);
  assert.deepEqual(connectorSemantics, [
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
});

test("TDD terminal details separates completion totals from progress semantics", () => {
  const partial = calculateProgress(parseMarkdown(
    "- root\n  - [x] done\n  - [ ] pending\n",
  ).body);
  const complete = calculateProgress(parseMarkdown("- [x] done\n").body);
  const partialEquivalent = new TerminalRenderer().render(
    "details",
    reportFor({
      ...partial,
      completedEquivalent: 1.25,
      rootCount: 9,
    }),
    resolveDisplayOptions(undefined, false),
  );
  const completeEquivalent = new TerminalRenderer().render(
    "details",
    reportFor({
      ...complete,
      completedEquivalent: 9,
      rootCount: 9,
    }),
    resolveDisplayOptions(undefined, false),
  );

  const equivalentLine = partialEquivalent.lines.find((line) =>
    line.parts.some((part) => part.text === "- Equivalent completed: ")
  );
  assert.deepEqual(
    equivalentLine?.parts.map((part) => [part.text, part.semantic]),
    [
      ["- Equivalent completed: ", undefined],
      ["1.25", "partial"],
      [" / ", undefined],
      ["9", "accent"],
    ],
  );

  const completeEquivalentLine = completeEquivalent.lines.find((line) =>
    line.parts.some((part) => part.text === "- Equivalent completed: ")
  );
  assert.equal(
    completeEquivalentLine?.parts.find((part) => part.text === "9")?.semantic,
    "complete",
  );
});

test("TDD terminal details marks non-zero statistics accent and zero muted", () => {
  const result = calculateProgress(parseMarkdown("- [x] done\n").body);
  const output = new TerminalRenderer().render(
    "details",
    reportFor(result),
    resolveDisplayOptions(undefined, false),
  );
  const levelLine = output.lines.find((line) =>
    line.parts.some((part) => part.text === "- Level ")
  );
  assert.deepEqual(
    levelLine?.parts
      .filter((part) => part.text === "1" || part.text === "0")
      .map((part) => [part.text, part.semantic]),
    [
      ["1", "accent"],
      ["1", "accent"],
      ["1", "accent"],
      ["0", "muted"],
    ],
  );

  const rootLine = output.lines.find((line) =>
    line.parts.some((part) => part.text === "- done: ")
  );
  assert.equal(
    rootLine?.parts.find((part) => part.text === "0")?.semantic,
    "muted",
  );

  const overallCountLines = [
    "- Root nodes: ",
    "- Explicit checkboxes: ",
    "- Implicit nodes: ",
    "- Statistical nodes: ",
  ].map((label) => output.lines.find((line) =>
    line.parts.some((part) => part.text === label)
  ));
  assert.deepEqual(
    overallCountLines.map((line) => line?.parts.at(-1)?.semantic),
    ["accent", "accent", "muted", "accent"],
  );
});

test("TDD terminal color output contains no ANSI when disabled", () => {
  const output = new TerminalOutputDocument([
    { parts: [{ text: "100%", semantic: "complete" }] },
    { parts: [{ text: "0%", semantic: "zero" }] },
  ]);

  assert.equal(terminalOutputText(output, false), "100%\n0%\n");
  assert.match(terminalOutputText(output, true), /\u001B\[32m100%/u);
  assert.match(terminalOutputText(output, true), /\u001B\[31m0%/u);
});

test("TDD terminal plain and visual output marks empty lines consistently", () => {
  const output = outputFor("top", "", "bottom");

  assert.equal(terminalOutputText(output, false), "top\n\nbottom\n");
});

test("TDD terminal output marks only explicit tree separator lines", () => {
  const output = new TerminalOutputDocument([
    { parts: [{ text: "tree" }] },
    { parts: [], emptyLineMarker: true },
    { parts: [{ text: "next" }] },
  ]);

  assert.equal(terminalOutputText(output, false), "tree\n\\\nnext\n");
});

test("TDD terminal details keeps composed-section blank lines ordinary", () => {
  const result = calculateProgress(parseMarkdown("- [x] done\n").body);
  const report: ProgressReport = {
    source: { path: "tasks.md" },
    markdown: result,
    markdownPresent: true,
    frontmatter: [{ format: "yaml", checklists: [], progress: result }],
    frontmatterPresent: true,
    presentation: "separate",
    progress: result,
  };
  const renderer = new TerminalRenderer();

  assert.match(
    terminalOutputText(renderer.render("tree", report, resolveDisplayOptions(undefined, false)), false),
    /\n\\\n/u,
  );
  assert.doesNotMatch(
    terminalOutputText(renderer.render("details", report, resolveDisplayOptions(undefined, false)), false),
    /\n\\\n/u,
  );
});

test("TDD terminal default output expands every separate source component", () => {
  const frontmatter = calculateProgress(parseMarkdown("- [ ] header\n").body);
  const markdown = calculateProgress(parseMarkdown("- [x] body\n").body);
  const report: ProgressReport = {
    source: { path: "tasks.md" },
    markdown,
    markdownPresent: true,
    frontmatter: [{ format: "yaml", checklists: [], progress: frontmatter }],
    frontmatterPresent: true,
    presentation: "separate",
    progress: {
      ...frontmatter,
      roots: [...frontmatter.roots, ...markdown.roots],
      rootCount: frontmatter.rootCount + markdown.rootCount,
      explicitCheckboxCount: frontmatter.explicitCheckboxCount +
        markdown.explicitCheckboxCount,
      implicitNodeCount: frontmatter.implicitNodeCount + markdown.implicitNodeCount,
      nodeCount: frontmatter.nodeCount + markdown.nodeCount,
      completedEquivalent: frontmatter.completedEquivalent +
        markdown.completedEquivalent,
      progress: 0.5,
      percentage: 50,
    },
  };

  assert.equal(
    terminalOutputText(
      new TerminalRenderer().render(
        "default",
        report,
        resolveDisplayOptions(undefined, false),
      ),
      false,
    ),
    "Frontmatter (YAML):\n\n0%\n\nMarkdown:\n\n100%\n",
  );
});

test("TDD terminal paging measures Unicode rows by visual cells", () => {
  const output = new TerminalOutputDocument([
    { parts: [{ text: "\u4f60\u597d\u{1f642}abc", semantic: "accent" }] },
    { parts: [] },
  ]);

  assert.equal(terminalVisualWidth("\u4f60\u597d\u{1f642}"), 6);
  assert.equal(terminalVisualLineCount(output, 5), 3);
  assert.deepEqual(
    terminalVisualLineRange(output, 5, 0, 4).map((line) =>
      line.parts.map((part) => part.text).join(""),
    ),
    ["\u4f60\u597d", "\u{1f642}abc", ""],
  );
});

test("TDD terminal adapter defaults to plain output for a non-TTY", async () => {
  const stdout = terminalStream(false);
  const stdin = inputStream(false);
  const text = capturedText(stdout);
  await new InkTerminalRenderer({
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
  }).print(
    new TerminalOutputDocument([
      { parts: [{ text: "100%", semantic: "complete" }] },
    ]),
  );

  assert.equal(text(), "100%\n");
});

test("TDD terminal adapter writes TTY color without pager control sequences", async () => {
  const stdout = terminalStream(true);
  const stdin = inputStream(false);
  const chunks: Buffer[] = [];
  stdout.on("data", (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  await new InkTerminalRenderer({
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
  }).print(
    new TerminalOutputDocument([
      { parts: [{ text: "100%", semantic: "complete" }] },
    ]),
    { pager: "never" },
  );

  const text = chunks.map((chunk) => chunk.toString("utf8")).join("");
  assert.match(text, /\u001B\[32m100%/u);
  assert.doesNotMatch(text, /\u001B\[2J|\u001B\[\?25l/u);
});

test("TDD information rendering uses markers when TTY color is disabled", () => {
  const stdout = terminalStream(true);
  const codeMarkers: boolean[] = [];
  const renderer = new InkTerminalRenderer({
    stdout: stdout as unknown as NodeJS.WriteStream,
    documentRenderer: (_document, options) => {
      codeMarkers.push(options.codeMarkers);
      return { lines: [{ parts: [{ text: "--help", semantic: "code" }] }] };
    },
  });

  renderer.renderDocument({}, { color: "auto", target: "stdout" });
  renderer.renderDocument({}, { color: "never", target: "stdout" });

  assert.deepEqual(codeMarkers, [false, true]);
});

test("TDD terminal renderer delegates application information documents", () => {
  const document: TerminalTextDocument = {
    lines: [{ parts: [{ text: "application document" }] }],
  };
  const renderer = new TerminalRenderer<TerminalTextDocument>(
    undefined,
    (value) => value,
  );

  assert.equal(renderer.renderDocument(document).toString(), "application document\n");
});

test("TDD Ink pager restores input state and keeps the complete output on q", async () => {
  const stdout = terminalStream(true, 5);
  const stdin = inputStream(true);
  const chunks: Buffer[] = [];
  stdout.on("data", (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  const content = new TerminalOutputDocument([
    { parts: [{ text: "line 1" }] },
    { parts: [], emptyLineMarker: true },
    { parts: [{ text: "line 3" }] },
    { parts: [{ text: "line 4" }] },
    { parts: [{ text: "line 5" }] },
  ]);
  const completion = new InkTerminalRenderer({
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
  }).print(content, { color: "never" });

  setTimeout(() => stdin.write("q"), 25);
  await completion;

  const text = chunks.map((chunk) => chunk.toString("utf8")).join("");
  for (const line of ["line 1", "line 3", "line 4", "line 5"]) {
    assert.ok(text.includes(line), `missing complete output line: ${line}`);
  }
  assert.ok(text.includes("\\"), "missing Pager empty-line marker");
  assert.equal(stdin.rawMode, false);
});

test("TDD Help uses the same TTY Pager delivery as reports", async () => {
  const stdout = terminalStream(true, 5);
  const stdin = inputStream(true);
  const chunks: Buffer[] = [];
  stdout.on("data", (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  const renderer = new InkTerminalRenderer({
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
    documentRenderer: () => ({
      lines: [
        { parts: [{ text: "Help line 1" }] },
        { parts: [{ text: "Help line 2" }] },
        { parts: [{ text: "Help line 3" }] },
        { parts: [{ text: "Help line 4" }] },
        { parts: [{ text: "Help line 5" }] },
      ],
    }),
  });

  const completion = renderer.print(renderer.renderDocument({}));
  setTimeout(() => stdin.write("q"), 25);
  await completion;

  const text = chunks.map((chunk) => chunk.toString("utf8")).join("");
  for (const line of [
    "Help line 1",
    "Help line 2",
    "Help line 3",
    "Help line 4",
    "Help line 5",
  ]) {
    assert.ok(text.includes(line), `missing complete Help line: ${line}`);
  }
  assert.equal(stdin.rawMode, false);
});
