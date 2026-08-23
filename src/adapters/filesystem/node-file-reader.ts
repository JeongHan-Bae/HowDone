import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import type { MarkdownFileReader } from "../../core/ports.ts";

export class FileReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileReadError";
  }
}

export class NodeMarkdownFileReader implements MarkdownFileReader {
  private readonly baseDirectory: string;

  constructor(baseDirectory = process.cwd()) {
    this.baseDirectory = baseDirectory;
  }

  async read(filePath: string): Promise<string> {
    // The Node path implementation supplies the current platform's rules.
    const absolutePath = resolve(this.baseDirectory, filePath);
    const extension = extname(absolutePath).toLowerCase();

    if (extension !== ".md" && extension !== ".markdown") {
      throw new FileReadError(
        "the input file must use the .md or .markdown extension",
      );
    }

    let fileStat;
    try {
      fileStat = await stat(absolutePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        throw new FileReadError(`file not found: ${filePath}`);
      }
      throw new FileReadError(
        `unable to access file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!fileStat.isFile()) {
      throw new FileReadError(`path is not a file: ${filePath}`);
    }

    try {
      return await readFile(absolutePath, "utf8");
    } catch (error) {
      throw new FileReadError(
        `unable to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const defaultFileReader = new NodeMarkdownFileReader();
