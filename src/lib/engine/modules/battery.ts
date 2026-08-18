import type { BatteryState } from "@/lib/scenarios/types";
import { renderMeta } from "./shared";
import { type ModuleDefinition, type ModuleOptions, optString } from "./types";

interface DisplayRule {
  threshold: number;
  style: string;
  charging_symbol?: string;
  discharging_symbol?: string;
}

const DEFAULT_DISPLAY: DisplayRule[] = [{ threshold: 10, style: "red bold" }];

function readDisplay(options: ModuleOptions): DisplayRule[] {
  const raw = options.display;
  if (!Array.isArray(raw)) return DEFAULT_DISPLAY;

  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const rule = entry as Record<string, unknown>;
    return [
      {
        threshold: typeof rule.threshold === "number" ? rule.threshold : 10,
        style: typeof rule.style === "string" ? rule.style : "red bold",
        charging_symbol:
          typeof rule.charging_symbol === "string" ? rule.charging_symbol : undefined,
        discharging_symbol:
          typeof rule.discharging_symbol === "string" ? rule.discharging_symbol : undefined,
      },
    ];
  });
}

/**
 * The symbol for the current state, letting a `display` entry override the
 * charging and discharging ones. `empty_symbol` is unreachable here: the
 * scenario has no `empty` battery state.
 */
function symbolFor(
  status: BatteryState["status"],
  rule: DisplayRule,
  options: ModuleOptions,
): string {
  switch (status) {
    case "full":
      return optString(options, "full_symbol");
    case "charging":
      return rule.charging_symbol ?? optString(options, "charging_symbol");
    case "discharging":
      return rule.discharging_symbol ?? optString(options, "discharging_symbol");
    case "unknown":
      return optString(options, "unknown_symbol");
  }
}

export const battery: ModuleDefinition = {
  name: "battery",
  defaults: {
    full_symbol: "\u{f0079} ",
    charging_symbol: "\u{f0084} ",
    discharging_symbol: "\u{f0083} ",
    unknown_symbol: "\u{f0091} ",
    empty_symbol: "\u{f008e} ",
    format: "[$symbol$percentage]($style) ",
    display: DEFAULT_DISPLAY,
    disabled: false,
  },
  evaluate(options, ctx) {
    const state = ctx.scenario.battery;
    if (!state) return null;

    // The lowest threshold the charge still fits under wins; above every
    // threshold the module does not render at all.
    const rule = readDisplay(options)
      .filter((entry) => state.percentage <= entry.threshold)
      .sort((a, b) => a.threshold - b.threshold)[0];
    if (!rule) return null;

    return {
      variables: {
        symbol: renderMeta(symbolFor(state.status, rule, options), ctx),
        percentage: `${Math.round(state.percentage)}%`,
      },
      styleVariables: { style: rule.style },
    };
  },
};
