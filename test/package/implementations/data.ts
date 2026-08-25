import { readFileSync } from "node:fs";
import type {
  DocumentAst,
  ScannedBlockNode,
} from "howdone";

interface CodePair {
  inputCode: string;
  code: string;
}

interface ValuePair {
  input: string;
  code: string;
}

interface ReaderCase {
  code: string;
  path: string;
  expected: ConsumerExpectedResult;
}

interface ReaderInputFile {
  cases: ReaderCase[];
}

interface ReaderOutput {
  source: string;
}

interface LexerSectionOutput {
  format: "yaml" | "toml";
  value: string;
}

export interface LexerOutput {
  sections: LexerSectionOutput[];
  body: ScannedBlockNode[];
}

interface ParserOutput {
  frontmatter: DocumentAst["frontmatter"];
  body: DocumentAst["body"];
}

interface TerminalOutput {
  template: string;
}

interface JsonOutput {
  fields: Record<string, string>;
}

interface WarningOutput {
  label: string;
}

export interface ConsumerExpectedResult {
  frontmatterSections: number;
  bodyRootCount: number;
  percentage: number;
}

interface PairFile<T> {
  cases: T[];
}

function readJson<T>(name: string): T {
  return JSON.parse(
    readFileSync(new URL(`./data/${name}.json`, import.meta.url), "utf8"),
  ) as T;
}

const readerInput = readJson<ReaderInputFile>("reader-input");
const readerOutput = readJson<Record<string, ReaderOutput>>("reader-output");
const lexerInput = readJson<PairFile<CodePair>>("lexer-input");
const lexerOutput = readJson<Record<string, LexerOutput>>("lexer-output");
const parserInput = readJson<PairFile<CodePair>>("parser-input");
const parserOutput = readJson<Record<string, ParserOutput>>("parser-output");
const yamlInput = readJson<PairFile<ValuePair>>("yaml-input");
const yamlOutput = readJson<Record<string, unknown>>("yaml-output");
const tomlInput = readJson<PairFile<ValuePair>>("toml-input");
const tomlOutput = readJson<Record<string, unknown>>("toml-output");
const segmenterInput = readJson<PairFile<ValuePair>>("segmenter-input");
const segmenterOutput = readJson<Record<string, string[]>>("segmenter-output");
const terminalInput = readJson<PairFile<ValuePair>>("terminal-input");
const terminalOutput = readJson<Record<string, TerminalOutput>>("terminal-output");
const jsonInput = readJson<PairFile<ValuePair>>("json-input");
const jsonOutput = readJson<Record<string, JsonOutput>>("json-output");
const warningInput = readJson<PairFile<ValuePair>>("warning-input");
const warningOutput = readJson<Record<string, WarningOutput>>("warning-output");

export const consumerCases = readerInput.cases;

export function readerOutputForCode(code: string): ReaderOutput {
  const result = readerOutput[code];
  if (result === undefined) throw new Error(`missing reader output: ${code}`);
  return result;
}

function codeForInput<T extends { inputCode: string; code: string }>(
  pairs: readonly T[],
  inputCode: string,
  stage: string,
): string {
  const result = pairs.find((candidate) => candidate.inputCode === inputCode);
  if (result === undefined) throw new Error(`missing ${stage} input: ${inputCode}`);
  return result.code;
}

function outputForCode<T>(
  outputs: Record<string, T>,
  code: string,
  stage: string,
): T {
  const result = outputs[code];
  if (result === undefined) throw new Error(`missing ${stage} output: ${code}`);
  return result;
}

export function readerCaseForPath(path: string): ReaderCase {
  const result = consumerCases.find((candidate) => candidate.path === path);
  if (result === undefined) throw new Error(`missing reader input path: ${path}`);
  return result;
}

export function consumerCaseForCode(code: string): ReaderCase {
  const result = consumerCases.find((candidate) => candidate.code === code);
  if (result === undefined) throw new Error(`missing reader input code: ${code}`);
  return result;
}

export function readerCodeForSource(source: string): string {
  const result = consumerCases.find((candidate) =>
    readerOutputForCode(candidate.code).source === source
  );
  if (result === undefined) throw new Error("missing reader input for source");
  return result.code;
}

export function lexerCodeForReaderCode(readerCode: string): string {
  return codeForInput(lexerInput.cases, readerCode, "lexer");
}

export function lexerOutputForCode(code: string): LexerOutput {
  return outputForCode(lexerOutput, code, "lexer");
}

export function parserCodeForLexerCode(lexerCode: string): string {
  return codeForInput(parserInput.cases, lexerCode, "parser");
}

export function parserOutputForCode(code: string): ParserOutput {
  return outputForCode(parserOutput, code, "parser");
}

function valueCodeForInput(
  pairs: readonly ValuePair[],
  value: string,
  stage: string,
): string {
  const result = pairs.find((candidate) => candidate.input === value);
  if (result === undefined) throw new Error(`missing ${stage} value: ${value}`);
  return result.code;
}

export function yamlValueOutput(value: string): unknown {
  const code = valueCodeForInput(yamlInput.cases, value, "YAML");
  return outputForCode(yamlOutput, code, "YAML value");
}

export function tomlValueOutput(value: string): unknown {
  const code = valueCodeForInput(tomlInput.cases, value, "TOML");
  return outputForCode(tomlOutput, code, "TOML value");
}

export function segmenterCodeForInput(text: string): string {
  return valueCodeForInput(segmenterInput.cases, text, "segmenter");
}

export function segmenterOutputForCode(code: string): string[] {
  return outputForCode(segmenterOutput, code, "segmenter");
}

function outputCodeForInput(
  pairs: readonly ValuePair[],
  input: string,
  stage: string,
): string {
  return valueCodeForInput(pairs, input, stage);
}

export function terminalOutputForSignature(signature: string): TerminalOutput {
  const code = outputCodeForInput(terminalInput.cases, signature, "terminal");
  return outputForCode(terminalOutput, code, "terminal");
}

export function jsonOutputForSignature(signature: string): JsonOutput {
  const code = outputCodeForInput(jsonInput.cases, signature, "JSON");
  return outputForCode(jsonOutput, code, "JSON");
}

export function warningOutputForMessage(message: string): WarningOutput {
  const pair = warningInput.cases.find((candidate) =>
    message.includes(candidate.input)
  );
  if (pair === undefined) throw new Error(`missing warning input: ${message}`);
  return outputForCode(warningOutput, pair.code, "warning");
}
