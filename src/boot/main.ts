import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { TypedAstParser } from "../core/ast/parser.ts";
import { defaultRemarkLexer } from "../adapters/markdown/remark-lexer.ts";
import { defaultFileReader } from "../adapters/filesystem/node-file-reader.ts";
import { defaultJsonRenderer } from "../adapters/output/json-renderer.ts";
import { defaultTerminalRenderer } from "../adapters/output/terminal-renderer.ts";
import { run } from "../application/analyze.ts";

const dependencies = {
  lexer: defaultRemarkLexer,
  parser: new TypedAstParser(),
  fileReader: defaultFileReader,
  terminalRenderer: defaultTerminalRenderer,
  jsonRenderer: defaultJsonRenderer,
};

export function main(): Promise<number> {
  return run(process.argv.slice(2), undefined, dependencies);
}

function isEntrypoint(): boolean {
  const processEntry = process.argv[1];
  return processEntry !== undefined &&
    import.meta.url === pathToFileURL(resolve(processEntry)).href;
}

if (isEntrypoint()) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
