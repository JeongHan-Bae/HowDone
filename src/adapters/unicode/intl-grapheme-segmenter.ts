import type { GraphemeSegmenter } from "../../core/index.ts";

export class IntlGraphemeSegmenter implements GraphemeSegmenter {
  segment(text: string): string[] {
    if (typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter(undefined, {
        granularity: "grapheme",
      });
      return [...segmenter.segment(text)].map((part) => part.segment);
    }
    return Array.from(text);
  }
}

export const defaultGraphemeSegmenter = new IntlGraphemeSegmenter();
