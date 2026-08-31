import { resolve } from "node:path";
import ts from "typescript";

interface TypecheckResult {
  diagnostics: readonly ts.Diagnostic[];
  fileCount: number;
}

const folderArgument = process.argv[2];
if (folderArgument === undefined || process.argv.length > 3) {
  throw new Error("typecheck-maintenance: expected one folder argument");
}

const folder = resolve(process.cwd(), folderArgument);
if (!ts.sys.directoryExists(folder)) {
  throw new Error(`typecheck-maintenance: folder does not exist: ${folder}`);
}

const sourceExtensions = [".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"];
const excludedDirectories = [
  "**/.git/**",
  "**/.test-build/**",
  "**/build/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
  "**/out/**",
  "**/test-results/**",
  "**/tmp/**",
];
const files = ts.sys.readDirectory(
  folder,
  sourceExtensions,
  excludedDirectories,
);
const typeScriptFiles = files.filter(
  (file) => /\.(?:ts|tsx)$/u.test(file) && !file.endsWith(".d.ts"),
);
const javaScriptFiles = files.filter((file) =>
  /\.(?:cjs|js|jsx|mjs)$/u.test(file),
);

const baseOptions: ts.CompilerOptions = {
  allowImportingTsExtensions: true,
  customConditions: ["source"],
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noEmit: true,
  noImplicitOverride: true,
  noUncheckedIndexedAccess: true,
  skipLibCheck: true,
  strict: true,
  target: ts.ScriptTarget.ES2022,
  types: ["node"],
};

function checkFiles(
  rootNames: readonly string[],
  options: ts.CompilerOptions,
): TypecheckResult {
  if (rootNames.length === 0) {
    return { diagnostics: [], fileCount: 0 };
  }
  const program = ts.createProgram(rootNames, options);
  return {
    diagnostics: ts.getPreEmitDiagnostics(program),
    fileCount: rootNames.length,
  };
}

const typeScriptResult = checkFiles(typeScriptFiles, baseOptions);
const javaScriptResult = checkFiles(javaScriptFiles, {
  ...baseOptions,
  checkJs: true,
  strict: false,
  allowJs: true,
});
const diagnostics = [
  ...typeScriptResult.diagnostics,
  ...javaScriptResult.diagnostics,
];

if (diagnostics.length > 0) {
  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => ts.sys.newLine,
  };
  console.error(ts.formatDiagnostics(diagnostics, formatHost));
  process.exitCode = 1;
} else {
  console.log(
    `Maintenance typecheck passed: ${typeScriptResult.fileCount} TypeScript ` +
      `and ${javaScriptResult.fileCount} JavaScript files checked.`,
  );
}
