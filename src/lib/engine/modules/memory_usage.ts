import { renderMeta } from "./shared";
import { type ModuleDefinition, optNumber, optString } from "./types";

/**
 * A browser cannot read host memory, so the preview uses a fixed, plausible
 * reading: 12 of 16 GiB used (75%, exactly starship's default threshold) with
 * 1 of 4 GiB of swap. Lowering `threshold` therefore still shows the module,
 * and raising it still hides it.
 */
const RAM_USED_GIB = 12;
const RAM_TOTAL_GIB = 16;
const SWAP_USED_GIB = 1;
const SWAP_TOTAL_GIB = 4;

function usage(usedGib: number, totalGib: number): string {
  return `${usedGib}GiB/${totalGib}GiB`;
}

function percentage(usedGib: number, totalGib: number): string {
  return `${Math.round((100 * usedGib) / totalGib)}%`;
}

export const memory_usage: ModuleDefinition = {
  name: "memory_usage",
  defaults: {
    threshold: 75,
    format: "via $symbol[$ram( | $swap)]($style) ",
    style: "white bold dimmed",
    symbol: "🐏 ",
    disabled: true,
  },
  evaluate(options, ctx) {
    const usedPct = Math.round((100 * RAM_USED_GIB) / RAM_TOTAL_GIB);
    if (usedPct < optNumber(options, "threshold", 75)) return null;

    return {
      variables: {
        symbol: renderMeta(optString(options, "symbol"), ctx),
        ram: usage(RAM_USED_GIB, RAM_TOTAL_GIB),
        ram_pct: percentage(RAM_USED_GIB, RAM_TOTAL_GIB),
        swap: usage(SWAP_USED_GIB, SWAP_TOTAL_GIB),
        swap_pct: percentage(SWAP_USED_GIB, SWAP_TOTAL_GIB),
      },
    };
  },
};
