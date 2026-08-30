import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

interface ModuleReference {
  node: ts.Node;
  specifier: string;
}

interface Violation {
  column: number;
  file: string;
  line: number;
  specifier: string;
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const ignoredDirectories = new Set([
  ".git",
  ".idea",
  ".test-build",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "test-results",
  "tmp",
]);
const codeExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);

function projectFiles(directory: string): string[] {
  const files: string[] = [];
  const entries: Dirent[] = readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...projectFiles(entryPath));
    } else if (entry.isFile() && codeExtensions.has(extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

function literalText(node: ts.Node | undefined): string | undefined {
  return node !== undefined &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
}

function addReference(
  references: Map<string, ModuleReference>,
  node: ts.Node,
  specifier: string | undefined,
): void {
  if (specifier === undefined) return;
  references.set(`${node.getStart()}:${specifier}`, { node, specifier });
}

function moduleReferences(sourceFile: ts.SourceFile): ModuleReference[] {
  const references = new Map<string, ModuleReference>();

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      addReference(
        references,
        node.moduleSpecifier,
        literalText(node.moduleSpecifier),
      );
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      addReference(
        references,
        node.moduleSpecifier,
        literalText(node.moduleSpecifier),
      );
    }

    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      addReference(
        references,
        node.argument.literal,
        literalText(node.argument.literal),
      );
    }

    if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequireCall =
        ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequireCall) {
        addReference(references, node, literalText(node.arguments[0]));
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...references.values()];
}

function pathSegments(value: string): string[] {
  return value.replaceAll("\\", "/").split("/").filter((segment) => {
    return segment !== "" && segment !== ".";
  });
}

function isSourceDirectoryPrefix(
  candidate: readonly string[],
  sourceDirectory: readonly string[],
): boolean {
  if (candidate.length === 0 || candidate.length > sourceDirectory.length) {
    return false;
  }
  return candidate.every((segment, index) => segment === sourceDirectory[index]);
}

/**
 * @brief Checks whether a relative module path leaves and re-enters a source directory.
 * @param sourceDirectory The source file directory relative to the project root.
 * @param specifier The relative module specifier.
 * @returns Whether the specifier redundantly re-enters an ancestor directory.
 */
export function hasAncestorDirectoryReentry(
  sourceDirectory: string,
  specifier: string,
): boolean {
  if (
    !(
      specifier === ".." ||
      specifier.startsWith("../") ||
      specifier.startsWith("./")
    )
  ) {
    return false;
  }

  const sourceSegments = pathSegments(sourceDirectory);
  const currentSegments = [...sourceSegments];
  let hasAscended = false;

  for (const segment of pathSegments(specifier)) {
    if (segment === "..") {
      if (currentSegments.length > 0) currentSegments.pop();
      hasAscended = true;
      continue;
    }
    if (!hasAscended) {
      currentSegments.push(segment);
      continue;
    }

    const candidate = [...currentSegments, segment];
    if (isSourceDirectoryPrefix(candidate, sourceSegments)) return true;
    currentSegments.push(segment);
  }

  return false;
}

function scriptKind(filePath: string): ts.ScriptKind {
  switch (extname(filePath)) {
    case ".cjs":
    case ".js":
    case ".jsx":
    case ".mjs":
      return extname(filePath) === ".jsx"
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function sourceFile(filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    scriptKind(filePath),
  );
}

function findViolations(): Violation[] {
  const violations: Violation[] = [];
  for (const filePath of projectFiles(projectRoot)) {
    const source = sourceFile(filePath);
    const sourceDirectory = relative(projectRoot, dirname(filePath));
    for (const reference of moduleReferences(source)) {
      if (!hasAncestorDirectoryReentry(sourceDirectory, reference.specifier)) {
        continue;
      }
      const position = source.getLineAndCharacterOfPosition(
        reference.node.getStart(source),
      );
      violations.push({
        column: position.character + 1,
        file: relative(projectRoot, filePath),
        line: position.line + 1,
        specifier: reference.specifier,
      });
    }
  }
  return violations.sort((left, right) => {
    return (
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column
    );
  });
}

function main(): void {
  const violations = findViolations();
  if (violations.length > 0) {
    console.error(
      "Relative import check failed. A path must not ascend and re-enter an ancestor directory:",
    );
    for (const violation of violations) {
      console.error(
        `- ${violation.file}:${violation.line}:${violation.column}: ${violation.specifier}`,
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log("Relative import check passed.");
}

const invokedFile = process.argv[1];
if (
  invokedFile !== undefined &&
  resolve(invokedFile) === resolve(fileURLToPath(import.meta.url))
) {
  main();
}
