import type { GraphemeSegmenter, WarningPort } from "howdone";
import { segmenterCodeForInput, segmenterOutputForCode, warningOutputForMessage } from "./data.ts";

export class ConsumerWarningPort implements WarningPort {
  readonly messages: string[] = [];
  readonly codes: string[] = [];

  warn(message: string): void {
    this.messages.push(message);
    this.codes.push(warningOutputForMessage(message).label);
  }
}

export class ConsumerGraphemeSegmenter implements GraphemeSegmenter {
  segment(text: string): string[] {
    return segmenterOutputForCode(segmenterCodeForInput(text));
  }
}
