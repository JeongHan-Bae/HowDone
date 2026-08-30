import type { GraphemeSegmenter } from "howdone";
import { segmenterCodeForInput, segmenterOutputForCode } from "./data.ts";

export class ConsumerGraphemeSegmenter implements GraphemeSegmenter {
  segment(text: string): string[] {
    return segmenterOutputForCode(segmenterCodeForInput(text));
  }
}
