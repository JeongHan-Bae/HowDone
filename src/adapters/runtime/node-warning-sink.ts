import type { WarningPort } from "howdone";

export const defaultWarningPort: WarningPort = {
  warn(message: string): void {
    process.emitWarning(message);
  },
};
