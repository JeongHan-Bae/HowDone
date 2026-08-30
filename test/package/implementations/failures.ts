import type { ConsumerContext } from "./dependencies.ts";

export type ConsumerFailure =
  | "reader"
  | "lexer"
  | "parser"
  | "yaml-parser"
  | "toml-parser"
  | "info-port"
  | "terminal-renderer"
  | "json-renderer"
  | "terminal-print"
  | "json-hook";

export function installConsumerFailure(
  context: ConsumerContext,
  failure: ConsumerFailure,
): void {
  if (failure === "reader") {
    context.dependencies.fileReader = {
      read: async () => {
        throw new Error("consumer file reader failed");
      },
    };
    return;
  }
  if (failure === "lexer") {
    context.dependencies.lexer = {
      lex: () => {
        throw new Error("consumer lexer failed");
      },
    };
    return;
  }
  if (failure === "parser") {
    context.dependencies.parser = {
      parse: () => {
        throw new Error("consumer parser failed");
      },
    };
    return;
  }
  if (failure === "yaml-parser") {
    context.dependencies.yamlValueParser = {
      parse: () => {
        throw new Error("consumer YAML parser failed");
      },
    };
    return;
  }
  if (failure === "toml-parser") {
    context.dependencies.tomlValueParser = {
      parse: () => {
        throw new Error("consumer TOML parser failed");
      },
    };
    return;
  }
  if (failure === "info-port") {
    context.dependencies.infoPort = {
      execute: () => {
        throw new Error("consumer information Port failed");
      },
    };
    return;
  }
  if (failure === "terminal-renderer") {
    const terminal = context.dependencies.terminalRenderer;
    context.dependencies.terminalRenderer = {
      render: () => {
        throw new Error("consumer terminal renderer failed");
      },
      renderDocument: terminal.renderDocument.bind(terminal),
      renderWarning: terminal.renderWarning.bind(terminal),
      renderError: terminal.renderError.bind(terminal),
      print: terminal.print,
    };
    return;
  }
  if (failure === "terminal-print") {
    const terminal = context.dependencies.terminalRenderer;
    const originalPrint = terminal.print;
    let remainingFailures = 1;
    context.dependencies.terminalRenderer = {
      render: terminal.render.bind(terminal),
      renderDocument: terminal.renderDocument.bind(terminal),
      renderWarning: terminal.renderWarning.bind(terminal),
      renderError: terminal.renderError.bind(terminal),
      print: (content, options) => {
        if (remainingFailures > 0) {
          remainingFailures -= 1;
          throw new Error("consumer terminal print failed");
        }
        if (originalPrint !== undefined) {
          return originalPrint(content, options);
        }
      },
    };
    return;
  }
  const json = context.dependencies.jsonRenderer;
  if (failure === "json-renderer") {
    context.dependencies.jsonRenderer = {
      render: () => {
        throw new Error("consumer JSON renderer failed");
      },
      writeWithTerminalFeatures: json.writeWithTerminalFeatures,
    };
    return;
  }
  const originalHook = json.writeWithTerminalFeatures;
  let remainingFailures = 1;
  context.dependencies.jsonRenderer = {
    render: json.render.bind(json),
    writeWithTerminalFeatures: (content, options) => {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error("consumer JSON hook failed");
      }
      if (originalHook !== undefined) {
        return originalHook(content, options);
      }
    },
  };
}
