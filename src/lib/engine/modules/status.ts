import { optOptionalString, renderMeta } from "./shared";
import {
  type ModuleContext,
  type ModuleDefinition,
  type ModuleOptions,
  optBool,
  optString,
} from "./types";

/** Exit codes with a conventional meaning, from starship's `status_common_meaning`. */
const COMMON_MEANINGS: Record<number, string> = {
  // SUCCESS is left empty so `success_symbol` can define it.
  0: "",
  1: "ERROR",
  2: "USAGE",
  // 64-78 come from libc's sysexits.
  64: "USAGE",
  65: "DATAERR",
  66: "NOINPUT",
  67: "NOUSER",
  68: "NOHOST",
  69: "UNAVAILABLE",
  70: "SOFTWARE",
  71: "OSERR",
  72: "OSFILE",
  73: "CANTCREAT",
  74: "IOERR",
  75: "TEMPFAIL",
  76: "PROTOCOL",
  77: "NOPERM",
  78: "CONFIG",
  126: "NOPERM",
  127: "NOTFOUND",
};

const SIGNAL_NAMES: Record<number, string> = {
  1: "HUP",
  2: "INT",
  3: "QUIT",
  4: "ILL",
  5: "TRAP",
  6: "IOT",
  7: "BUS",
  8: "FPE",
  9: "KILL",
  10: "USR1",
  11: "SEGV",
  12: "USR2",
  13: "PIPE",
  14: "ALRM",
  15: "TERM",
  16: "STKFLT",
  17: "CHLD",
  18: "CONT",
  19: "STOP",
  20: "TSTP",
  21: "TTIN",
  22: "TTOU",
};

function commonMeaning(status: number): string | undefined {
  // Anything above 128 is a signal, not a status with a meaning.
  return status > 128 ? undefined : COMMON_MEANINGS[status];
}

/** The number of the signal a `128 + n` exit code encodes. */
function signalNumber(status: number): number | undefined {
  return status < 129 ? undefined : status - 128;
}

/** `SIGINT` / `INT` → 2, so a scenario's signal name can stand in for the code. */
function signalNumberFromName(name: string): number | undefined {
  const bare = name.replace(/^SIG/i, "").toUpperCase();
  const entry = Object.entries(SIGNAL_NAMES).find(([, value]) => value === bare);
  return entry ? Number(entry[0]) : undefined;
}

function symbolOption(status: number, options: ModuleOptions): string {
  const mapSymbol = optBool(options, "map_symbol");
  const recognizeSignal = optBool(options, "recognize_signal_code", true);

  if (status === 0) return "success_symbol";
  if (status === 126 && mapSymbol) return "not_executable_symbol";
  if (status === 127 && mapSymbol) return "not_found_symbol";
  if (status === 130 && recognizeSignal && mapSymbol) return "sigint_symbol";
  if (status >= 129 && status < 256 && recognizeSignal && mapSymbol) return "signal_symbol";
  return "symbol";
}

/** Rust formats a negative `i32` as its two's-complement hex. */
function hexStatus(status: number): string {
  return `0x${(status >>> 0).toString(16).toUpperCase()}`;
}

function styleFor(status: number, options: ModuleOptions): string {
  const style = optString(options, "style");
  return status === 0
    ? (optOptionalString(options, "success_style") ?? style)
    : (optOptionalString(options, "failure_style") ?? style);
}

export const status: ModuleDefinition = {
  name: "status",
  defaults: {
    format: "[$symbol$status]($style) ",
    symbol: "❌",
    success_symbol: "",
    not_executable_symbol: "🚫",
    not_found_symbol: "🔍",
    sigint_symbol: "🧱",
    signal_symbol: "⚡",
    style: "bold red",
    success_style: undefined,
    failure_style: undefined,
    map_symbol: false,
    recognize_signal_code: true,
    pipestatus: false,
    pipestatus_separator: "|",
    pipestatus_format:
      "\\[$pipestatus\\] => [$symbol$common_meaning$signal_name$maybe_int]($style) ",
    pipestatus_segment_format: undefined,
    // Starship disables this module by default.
    disabled: true,
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext) {
    const { scenario } = ctx;
    const code = scenario.status;

    // A successful command shows nothing unless `success_symbol` says otherwise.
    // `pipestatus` needs a per-pipe-segment status list, which the scenario does
    // not model, so it always behaves as an unpiped command here.
    if (code === 0 && optString(options, "success_symbol") === "") return null;

    const recognizeSignal = optBool(options, "recognize_signal_code", true);
    const rawSignal = recognizeSignal ? signalNumber(code) : undefined;
    // Falls back to the scenario's signal name when the exit code does not
    // encode one — starship only ever sees the code.
    const signal =
      rawSignal ??
      (recognizeSignal && scenario.signal ? signalNumberFromName(scenario.signal) : undefined);

    const meaning = commonMeaning(code);
    const signalName = signal !== undefined ? (SIGNAL_NAMES[signal] ?? String(signal)) : undefined;

    return {
      variables: {
        symbol: renderMeta(optString(options, symbolOption(code, options)), ctx, {}, {
          style: styleFor(code, options),
        }),
        status: String(code),
        hex_status: hexStatus(code),
        int: String(code),
        // Only shown when there is nothing more descriptive to print.
        maybe_int: meaning === undefined && signalName === undefined ? String(code) : undefined,
        common_meaning: meaning,
        signal_number: signal !== undefined ? String(signal) : undefined,
        signal_name: signalName,
      },
      styleVariables: { style: styleFor(code, options) },
    };
  },
};
