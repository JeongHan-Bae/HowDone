import type { TerminalIO } from "howdone";

/**
 * @brief The standard Node host output used by the CLI composition.
 *
 * @details
 * This adapter binds the framework-independent `TerminalIO` contract to the
 * current Node process streams. It belongs to the CLI package boundary rather
 * than `howdone/std`, because Core standard implementations do not depend on a
 * host runtime.
 */
export const defaultCliIO: TerminalIO = {
  stdout: process.stdout,
  stderr: process.stderr,
};
