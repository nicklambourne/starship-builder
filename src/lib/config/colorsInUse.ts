/**
 * The colours a config actually asks for.
 *
 * Answers "what is this prompt painted with right now", which is otherwise
 * spread across three places: the styles written inline in a format string,
 * the `style`-ish option on every module, and the root format's own groups.
 * Collected in the order they are first met, so the list reads like the
 * prompt rather than like the config file.
 */

import type { StarshipConfig } from "@/lib/engine/prompt";
import { STYLE_MODIFIERS } from "@/lib/engine/types";
import { MODULE_META } from "./meta";
import { toItems, type FormatItem } from "./formatItems";

const MODIFIERS = new Set<string>(STYLE_MODIFIERS);

export interface ColorInUse {
  /** As written in the config: a palette name, an ANSI name, a hex, an index. */
  token: string;
  /** True when the active palette defines it, which is what it resolves as. */
  fromPalette: boolean;
}

/** The colour tokens in one style string, ignoring modifiers and inversions. */
function tokensIn(style: string): string[] {
  const out: string[] = [];
  for (const word of style.trim().split(/\s+/)) {
    if (!word) continue;
    const value = word.startsWith("fg:") || word.startsWith("bg:") ? word.slice(3) : word;
    const lower = value.toLowerCase();
    if (MODIFIERS.has(lower)) continue;
    // `none` cancels a colour, and `prev_fg` / `prev_bg` name a position
    // rather than a colour.
    if (lower === "none" || lower === "prev_fg" || lower === "prev_bg") continue;
    // A style string may name a variable rather than a colour — `($style)` is
    // how nearly every module paints itself with its own style option.
    if (value.startsWith("$")) continue;
    out.push(value);
  }
  return out;
}

/** Styles written inside a format string, on its groups and pieces. */
function stylesInFormat(format: string): string[] {
  const items = toItems(format);
  if (!items) return [];
  const out: string[] = [];
  const walk = (list: FormatItem[]) => {
    for (const item of list) {
      if (item.kind === "raw") continue;
      if (item.style) out.push(item.style);
      if (item.kind === "group") walk(item.items);
    }
  };
  walk(items);
  return out;
}

export function colorsInUse(config: StarshipConfig): ColorInUse[] {
  const palette = (config.palettes as Record<string, Record<string, string>> | undefined)?.[
    (config.palette as string | undefined) ?? ""
  ];
  const seen = new Map<string, ColorInUse>();
  const add = (style: string) => {
    for (const token of tokensIn(style)) {
      if (seen.has(token)) continue;
      seen.set(token, { token, fromPalette: Boolean(palette && token in palette) });
    }
  };

  for (const key of ["format", "right_format", "continuation_prompt"] as const) {
    const value = config[key];
    if (typeof value === "string") for (const style of stylesInFormat(value)) add(style);
  }

  for (const [module, meta] of Object.entries(MODULE_META)) {
    const table = config[module];
    if (typeof table !== "object" || table === null) continue;
    const values = table as Record<string, unknown>;
    for (const option of meta.styleOptions) {
      const value = values[option];
      if (typeof value === "string") add(value);
    }
    for (const option of meta.formatOptions) {
      const value = values[option];
      if (typeof value === "string") for (const style of stylesInFormat(value)) add(style);
    }
  }

  return [...seen.values()];
}
