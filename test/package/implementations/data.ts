import { readFileSync } from "node:fs";
import type {
  CheckboxNode,
  DocumentAst,
  FrontmatterChecklist,
  JsonObject,
  LayerStatistics,
  ProgressFormat,
  ProgressReport,
  ProgressResult,
  ResolvedDisplayOptions,
  RootAst,
  ScannedBlockNode,
  TerminalTextSemantic,
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
  expected?: JsonObject;
  expectedBySource?: Record<string, JsonObject>;
}

interface FrontmatterOutput {
  format: "yaml" | "toml";
  checklists: FrontmatterChecklist[];
  progress: ProgressResult;
}

interface ConsumerComposition {
  report: ProgressReport;
  terminalOptions: ResolvedDisplayOptions;
  jsonOptions: ResolvedDisplayOptions;
}

export interface CoreProgressCase {
  code: string;
  ast: RootAst;
  expectedRoots: CheckboxNode[];
  expectedResult: ProgressResult;
  expectedLayers: LayerStatistics[];
  expectedFlatLabels: string[];
}

export interface DisplayOptionsInput {
  maxLabelClusters?: number;
  noTruncate: boolean;
  progressFormat?: ProgressFormat;
  precision?: number;
  showTrailingZeros?: boolean;
}

export interface DisplayOptionsCase {
  code: string;
  input: DisplayOptionsInput;
  expected?: ResolvedDisplayOptions;
  error?: string;
}

export interface ConsumerOutputCapabilities {
  color: boolean;
  pager: boolean;
}

export interface ConsumerOutputPortCapabilities extends ConsumerOutputCapabilities {
  label: string;
}

export interface ConsumerOutputRequest {
  color: "auto" | "never";
  pager: "auto" | "never";
}

export interface ConsumerOutputCapabilityCase {
  code: string;
  terminal: ConsumerOutputPortCapabilities;
  json: ConsumerOutputPortCapabilities;
  request: ConsumerOutputRequest;
}

export interface ConsumerTerminalContentFixture {
  lines: Array<{
    parts: Array<{
      text: string;
      semantic?: TerminalTextSemantic;
    }>;
    emptyLineMarker?: boolean;
  }>;
}

export interface ConsumerTerminalCapabilityOutput {
  label: string;
  content: ConsumerTerminalContentFixture;
  fallbackStdout: string;
  hook: boolean;
  effective: ConsumerOutputCapabilities;
}

export interface ConsumerJsonCapabilityOutput {
  label: string;
  object: JsonObject;
  hook: boolean;
  effective: ConsumerOutputCapabilities;
}

export interface ConsumerOutputCapabilityOutput {
  terminal: ConsumerTerminalCapabilityOutput;
  json: ConsumerJsonCapabilityOutput;
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
const frontmatterOutput = readJson<Record<string, FrontmatterOutput>>(
  "frontmatter-output",
);
const compositions = readJson<Record<string, ConsumerComposition>>(
  "compositions",
);
const outputCapabilitiesInput = readJson<{
  cases: ConsumerOutputCapabilityCase[];
}>("output-capabilities-input");
const outputCapabilitiesOutput = readJson<
  Record<string, ConsumerOutputCapabilityOutput>
>("output-capabilities-output");
const coreContracts = readJson<{
  progress: CoreProgressCase[];
  displayOptions: DisplayOptionsCase[];
}>("core-contracts");
export const consumerCases = readerInput.cases;
export const consumerOutputCapabilityCases = outputCapabilitiesInput.cases;
export const coreProgressCases = coreContracts.progress;
export const displayOptionsCases = coreContracts.displayOptions;

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

export function frontmatterOutputForSection(
  format: "yaml" | "toml",
  value: string,
): FrontmatterOutput {
  const code = valueCodeForInput(
    format === "yaml" ? yamlInput.cases : tomlInput.cases,
    value,
    format === "yaml" ? "YAML" : "TOML",
  );
  return outputForCode(frontmatterOutput, code, `${format} frontmatter`);
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

export function jsonExpectedForSignature(
  signature: string,
  sourcePath: string,
): JsonObject {
  const output = jsonOutputForSignature(signature);
  const expected = output.expectedBySource?.[sourcePath] ?? output.expected;
  if (expected === undefined) {
    throw new Error(
      `missing JSON expected output for ${signature} and ${sourcePath}`,
    );
  }
  return expected;
}

export function consumerCompositionForCode(code: string): ConsumerComposition {
  const result = compositions[code];
  if (result === undefined) {
    throw new Error("missing consumer composition: " + code);
  }
  return result;
}

export function consumerOutputCapabilityCaseForCode(
  code: string,
): ConsumerOutputCapabilityCase {
  const result = consumerOutputCapabilityCases.find((candidate) =>
    candidate.code === code
  );
  if (result === undefined) {
    throw new Error(`missing output capability input: ${code}`);
  }
  return result;
}

export function consumerOutputCapabilityOutputForCode(
  code: string,
): ConsumerOutputCapabilityOutput {
  return outputForCode(outputCapabilitiesOutput, code, "output capability");
}
