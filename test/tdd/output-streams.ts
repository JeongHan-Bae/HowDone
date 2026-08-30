import { PassThrough } from "node:stream";

export type TerminalTestStream = PassThrough & {
  isTTY: boolean;
  rows: number;
  columns: number;
};

export function terminalStream(
  isTTY: boolean,
  rows = 24,
  columns = 80,
): TerminalTestStream {
  return Object.assign(new PassThrough(), { isTTY, rows, columns });
}

export type TestInputStream = PassThrough & {
  isTTY: boolean;
  rawMode: boolean;
  setRawMode: (enabled: boolean) => void;
  ref: () => void;
  unref: () => void;
};

export function inputStream(isTTY: boolean): TestInputStream {
  const stream = Object.assign(new PassThrough(), { isTTY, rawMode: false });
  return Object.assign(stream, {
    isTTY,
    setRawMode: (enabled: boolean) => { stream.rawMode = enabled; },
    ref: () => {},
    unref: () => {},
  }) as TestInputStream;
}
