import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

interface Violation {
  file: string;
  label: string;
  line: number;
  text: string;
}

interface SourceContext {
  osNamespaceBindings: ReadonlySet<string>;
  osMemberBindings: ReadonlySet<string>;
  processNamespaceBindings: ReadonlySet<string>;
  processMemberBindings: ReadonlySet<string>;
}

interface ModuleBindings {
  memberBindings: Set<string>;
  moduleNames: ReadonlySet<string>;
  namespaceBindings: Set<string>;
}

const sourceRoots = ["src", "bin", "scripts", "test"] as const;
const sourceExtensions = new Set([".cjs", ".js", ".mjs", ".ts", ".tsx"]);
const scannerPath = relative(
  process.cwd(),
  fileURLToPath(new URL("./check-platform-neutral.ts", import.meta.url).href),
);
const osModuleNames = new Set(["os", "node:os"]);
const processModuleNames = new Set(["process", "node:process"]);
const platformMembers = new Set(["platform", "arch"]);

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(file);
    }
    return entry.isFile() && sourceExtensions.has(extname(file)) ? [file] : [];
  });
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAwaitExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function literalText(expression: ts.Expression | undefined): string | undefined {
  if (expression === undefined) {
    return undefined;
  }
  const value = unwrap(expression);
  return ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)
    ? value.text
    : undefined;
}

function memberName(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
): string | undefined {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  return literalText(node.argumentExpression);
}

function isIdentifier(expression: ts.Expression, name: string): boolean {
  const value = unwrap(expression);
  return ts.isIdentifier(value) && value.text === name;
}

function moduleName(expression: ts.Expression): string | undefined {
  const value = unwrap(expression);
  if (!ts.isCallExpression(value)) {
    return undefined;
  }
  const isRequire = isIdentifier(value.expression, "require");
  const isDynamicImport = value.expression.kind === ts.SyntaxKind.ImportKeyword;
  return isRequire || isDynamicImport
    ? literalText(value.arguments[0])
    : undefined;
}

function isModuleExpression(
  expression: ts.Expression,
  moduleNames: ReadonlySet<string>,
  namespaceBindings: ReadonlySet<string>,
): boolean {
  const value = unwrap(expression);
  return (
    (ts.isIdentifier(value) && namespaceBindings.has(value.text)) ||
    moduleNames.has(moduleName(value) ?? "")
  );
}

function addImportBindings(
  clause: ts.ImportClause | undefined,
  namespaceBindings: Set<string>,
  memberBindings: Set<string>,
): void {
  if (clause?.name !== undefined) {
    namespaceBindings.add(clause.name.text);
  }
  if (clause?.namedBindings === undefined) {
    return;
  }
  if (ts.isNamespaceImport(clause.namedBindings)) {
    namespaceBindings.add(clause.namedBindings.name.text);
    return;
  }
  for (const element of clause.namedBindings.elements) {
    const importedName = element.propertyName?.text ?? element.name.text;
    if (platformMembers.has(importedName)) {
      memberBindings.add(element.name.text);
    }
  }
}

function platformBindingName(name: ts.BindingName): string | undefined {
  if (ts.isIdentifier(name)) {
    return name.text;
  }
  if (!ts.isObjectBindingPattern(name)) {
    return undefined;
  }
  for (const element of name.elements) {
    const importedName =
      element.propertyName !== undefined && ts.isIdentifier(element.propertyName)
        ? element.propertyName.text
        : ts.isIdentifier(element.name)
          ? element.name.text
          : undefined;
    if (importedName !== undefined && platformMembers.has(importedName)) {
      return ts.isIdentifier(element.name) ? element.name.text : undefined;
    }
  }
  return undefined;
}

function collectContext(sourceFile: ts.SourceFile): SourceContext {
  const osNamespaceBindings = new Set<string>();
  const osMemberBindings = new Set<string>();
  const processNamespaceBindings = new Set<string>();
  const processMemberBindings = new Set<string>();
  const collections: readonly ModuleBindings[] = [
    {
      memberBindings: osMemberBindings,
      moduleNames: osModuleNames,
      namespaceBindings: osNamespaceBindings,
    },
    {
      memberBindings: processMemberBindings,
      moduleNames: processModuleNames,
      namespaceBindings: processNamespaceBindings,
    },
  ];

  function findCollection(name: string | undefined): ModuleBindings | undefined {
    return collections.find((collection) => collection.moduleNames.has(name ?? ""));
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const collection = findCollection(literalText(node.moduleSpecifier));
      if (collection !== undefined) {
        addImportBindings(
          node.importClause,
          collection.namespaceBindings,
          collection.memberBindings,
        );
      }
    }

    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const collection = findCollection(moduleName(node.initializer));
      if (collection !== undefined) {
        if (ts.isIdentifier(node.name)) {
          collection.namespaceBindings.add(node.name.text);
        } else {
          const binding = platformBindingName(node.name);
          if (binding !== undefined) {
            collection.memberBindings.add(binding);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return {
    osNamespaceBindings,
    osMemberBindings,
    processNamespaceBindings,
    processMemberBindings,
  };
}

function isGlobalProcessExpression(expression: ts.Expression): boolean {
  const value = unwrap(expression);
  if (isIdentifier(value, "process")) {
    return true;
  }
  if (
    !(
      ts.isPropertyAccessExpression(value) ||
      ts.isElementAccessExpression(value)
    )
  ) {
    return false;
  }
  return (
    memberName(value) === "process" &&
    (isIdentifier(value.expression, "global") ||
      isIdentifier(value.expression, "globalThis"))
  );
}

function isProcessExpression(
  expression: ts.Expression,
  context: SourceContext,
): boolean {
  return (
    isGlobalProcessExpression(expression) ||
    isModuleExpression(
      expression,
      processModuleNames,
      context.processNamespaceBindings,
    )
  );
}

function isOsExpression(
  expression: ts.Expression,
  context: SourceContext,
): boolean {
  return isModuleExpression(expression, osModuleNames, context.osNamespaceBindings);
}

function isPlatformMember(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  object: (expression: ts.Expression) => boolean,
): boolean {
  if (!object(node.expression)) {
    return false;
  }
  const name = memberName(node);
  return (
    (ts.isElementAccessExpression(node) && name === undefined) ||
    platformMembers.has(name ?? "")
  );
}

function isBindingDeclaration(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isImportSpecifier(parent) &&
      (parent.name === node || parent.propertyName === node)) ||
    (ts.isBindingElement(parent) &&
      (parent.name === node || parent.propertyName === node))
  );
}

function memberBindingLabel(
  node: ts.Identifier,
  context: SourceContext,
): string | undefined {
  if (isBindingDeclaration(node)) {
    return undefined;
  }
  if (context.osMemberBindings.has(node.text)) {
    return "node:os platform or architecture detection";
  }
  if (context.processMemberBindings.has(node.text)) {
    return "node:process platform or architecture detection";
  }
  return undefined;
}

function scriptKind(file: string): ts.ScriptKind {
  switch (extname(file)) {
    case ".cjs":
    case ".js":
    case ".mjs":
      return ts.ScriptKind.JS;
    case ".tsx":
      return ts.ScriptKind.TSX;
    default:
      return ts.ScriptKind.TS;
  }
}

function findViolations(file: string): Violation[] {
  if (relative(process.cwd(), file) === scannerPath) {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
  const context = collectContext(sourceFile);
  const violations: Violation[] = [];

  function addViolation(node: ts.Node, label: string): void {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push({
      file: relative(process.cwd(), file),
      label,
      line: position.line + 1,
      text: node.getText(sourceFile).trim(),
    });
  }

  function visit(node: ts.Node): void {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      if (isPlatformMember(node, (expression) => isProcessExpression(expression, context))) {
        addViolation(node, "runtime platform or architecture detection");
      } else if (isPlatformMember(node, (expression) => isOsExpression(expression, context))) {
        addViolation(node, "node:os platform or architecture detection");
      }
    }

    if (ts.isIdentifier(node)) {
      const label = memberBindingLabel(node, context);
      if (label !== undefined) {
        addViolation(node, label);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function main(): void {
  const files = sourceRoots.flatMap((root) => collectSourceFiles(root));
  const violations = files.flatMap(findViolations);

  if (violations.length > 0) {
    console.error("Platform API checks failed:");
    for (const violation of violations) {
      console.error(
        `- ${violation.file}:${violation.line} (${violation.label}): ${violation.text}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Platform API check passed: ${files.length} files scanned.`);
}

main();
