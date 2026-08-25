import type { MarkdownFileReader } from "howdone";
import { readerCaseForPath, readerOutputForCode } from "./data.ts";

export class ConsumerFileReader implements MarkdownFileReader {
  private readonly code: string;
  readonly requests: string[] = [];

  read(filePath: string): Promise<string> {
    this.requests.push(filePath);
    const input = readerCaseForPath(filePath);
    if (input.code !== this.code) {
      return Promise.reject(new Error(`unexpected consumer case: ${input.code}`));
    }
    return Promise.resolve(readerOutputForCode(input.code).source);
  }

  constructor(code: string) {
    this.code = code;
  }
}
