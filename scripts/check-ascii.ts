import {
  readdirSync,
  readFileSync,
  type Dirent,
} from "node:fs";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const ignoredDirectories = new Set([".git", "node_modules", "tmp", ".idea"]);
const codeExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

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

function hasNonAsciiByte(filePath: string): boolean {
  return readFileSync(filePath).some((byte) => byte > 0x7f);
}

const violations = projectFiles(projectRoot)
  .filter((filePath) => hasNonAsciiByte(filePath))
  .map((filePath) => relative(projectRoot, filePath));

if (violations.length > 0) {
  console.error("ASCII check failed. Non-ASCII bytes were found in:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("ASCII check passed for code files.");
}
