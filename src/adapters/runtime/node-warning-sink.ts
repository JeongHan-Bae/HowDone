import type { WarningPort } from "../../core/index.ts";

export const defaultWarningPort: WarningPort = {
  warn(message: string): void {
    process.emitWarning(message);
  },
};
