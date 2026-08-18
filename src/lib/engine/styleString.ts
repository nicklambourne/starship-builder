/**
 * Style-string parser.
 *
 * Port of starship's `parse_style_string` (`src/config.rs`). The semantics are
 * subtle and worth stating explicitly, because they are easy to get wrong:
 *
 *  - Tokens are whitespace-separated and lowercased.
 *  - The fold is fallible: if ANY token fails to parse, the entire style is
 *    discarded (returns undefined) — not just the offending token.
 *  - Bare colours set the foreground; `fg:`/`bg:` prefixes are explicit.
 *  - `fg:none` (or bare `none`) discards the whole style.
 *  - `bg:<invalid>` is not a failure: it resets the background to default.
 *  - Palette lookup precedes the predefined names, so a palette may redefine
 *    `red`. Palette values are resolved one level deep only (no chaining).
 */

import { type Color, type NamedColor, type Style, emptyStyle } from "./types";

export type Palette = Record<string, string>;

const NAMED: Record<string, NamedColor> = {
  black: "black",
  red: "red",
  green: "green",
  yellow: "yellow",
  blue: "blue",
  purple: "purple",
  cyan: "cyan",
  white: "white",
  "bright-black": "bright-black",
  "bright-red": "bright-red",
  "bright-green": "bright-green",
  "bright-yellow": "bright-yellow",
  "bright-blue": "bright-blue",
  "bright-purple": "bright-purple",
  "bright-cyan": "bright-cyan",
  "bright-white": "bright-white",
};

const MODIFIERS = new Set([
  "underline",
  "bold",
  "italic",
  "dimmed",
  "inverted",
  "blink",
  "hidden",
  "strikethrough",
]);

/**
 * Resolves a colour token. Returns undefined when the token is not a colour.
 * `allowPalette` is false when resolving a palette entry's own value, matching
 * starship's single-level palette resolution.
 */
export function parseColorString(
  token: string,
  palette?: Palette,
): Color | undefined {
  if (token.startsWith("#")) {
    if (token.length !== 7) return undefined;
    const r = Number.parseInt(token.slice(1, 3), 16);
    const g = Number.parseInt(token.slice(3, 5), 16);
    const b = Number.parseInt(token.slice(5, 7), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return undefined;
    return { kind: "rgb", r, g, b };
  }

  // A bare integer 0-255 is a 256-colour palette index.
  if (/^\d+$/.test(token)) {
    const index = Number.parseInt(token, 10);
    if (index >= 0 && index <= 255) return { kind: "fixed", index };
    return undefined;
  }

  if (palette && Object.hasOwn(palette, token)) {
    // Palette values resolve without further palette lookups.
    return parseColorString(palette[token].toLowerCase(), undefined);
  }

  const named = NAMED[token];
  if (named) return { kind: "named", name: named };

  return undefined;
}

/**
 * Parses a whole style string. Returns undefined when the style should not be
 * applied at all (parse failure, or an explicit `none`).
 */
export function parseStyleString(
  styleString: string,
  palette?: Palette,
): Style | undefined {
  const tokens = styleString.split(/\s+/).filter((t) => t.length > 0);

  let style = emptyStyle();

  for (const rawToken of tokens) {
    const lowered = rawToken.toLowerCase();

    let token = lowered;
    let colFg = true;
    if (lowered.startsWith("fg:")) {
      token = lowered.slice(3);
    } else if (lowered.startsWith("bg:")) {
      token = lowered.slice(3);
      colFg = false;
    }

    if (MODIFIERS.has(token)) {
      style.modifiers.add(token as never);
      continue;
    }

    if (token === "prev_fg") {
      const color: Color = { kind: "prev", source: "fg" };
      if (colFg) style.fg = color;
      else style.bg = color;
      continue;
    }

    if (token === "prev_bg") {
      const color: Color = { kind: "prev", source: "bg" };
      if (colFg) style.fg = color;
      else style.bg = color;
      continue;
    }

    if (token === "none" && colFg) {
      // `none` in a foreground position discards the entire style.
      return undefined;
    }

    const parsed = parseColorString(token, palette);

    if (!colFg && !parsed) {
      // `bg:` with an unparseable colour resets the background.
      style = { ...style, bg: undefined };
      continue;
    }

    if (!parsed) {
      // Any other unparseable token voids the whole style.
      return undefined;
    }

    if (colFg) style.fg = parsed;
    else style.bg = parsed;
  }

  return style;
}

/** Resolves the active palette from a root config, if any. */
export function resolvePalette(
  palettes: Record<string, Palette> | undefined,
  paletteName: string | undefined,
): Palette | undefined {
  if (!paletteName || !palettes) return undefined;
  return palettes[paletteName];
}
