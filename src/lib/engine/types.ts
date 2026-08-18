/**
 * Core value types for the rendering engine.
 *
 * The engine is deliberately framework-free: it maps (config, scenario) to a
 * flat list of styled segments, which are then serialised either to React
 * spans (for display) or to ANSI escape sequences (for parity testing against
 * real starship).
 */

/** A resolved colour. Mirrors nu_ansi_term::Color as used by starship. */
export type Color =
  | { kind: "named"; name: NamedColor }
  /** 256-colour palette index. */
  | { kind: "fixed"; index: number }
  | { kind: "rgb"; r: number; g: number; b: number }
  /** `prev_fg` / `prev_bg`: inherit from the preceding segment. */
  | { kind: "prev"; source: "fg" | "bg" };

export const NAMED_COLORS = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "purple",
  "cyan",
  "white",
  "bright-black",
  "bright-red",
  "bright-green",
  "bright-yellow",
  "bright-blue",
  "bright-purple",
  "bright-cyan",
  "bright-white",
] as const;

export type NamedColor = (typeof NAMED_COLORS)[number];

export const STYLE_MODIFIERS = [
  "bold",
  "italic",
  "underline",
  "dimmed",
  "inverted",
  "blink",
  "hidden",
  "strikethrough",
] as const;

export type StyleModifier = (typeof STYLE_MODIFIERS)[number];

export interface Style {
  fg?: Color;
  bg?: Color;
  modifiers: Set<StyleModifier>;
}

export function emptyStyle(): Style {
  return { modifiers: new Set() };
}

export function cloneStyle(style: Style): Style {
  return { fg: style.fg, bg: style.bg, modifiers: new Set(style.modifiers) };
}

export function stylesEqual(a: Style | undefined, b: Style | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (!colorsEqual(a.fg, b.fg) || !colorsEqual(a.bg, b.bg)) return false;
  if (a.modifiers.size !== b.modifiers.size) return false;
  for (const m of a.modifiers) if (!b.modifiers.has(m)) return false;
  return true;
}

export function colorsEqual(a: Color | undefined, b: Color | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "named":
      return a.name === (b as typeof a).name;
    case "fixed":
      return a.index === (b as typeof a).index;
    case "rgb": {
      const o = b as typeof a;
      return a.r === o.r && a.g === o.g && a.b === o.b;
    }
    case "prev":
      return a.source === (b as typeof a).source;
  }
}

/**
 * A run of text sharing one style.
 *
 * `Fill` segments are placeholders resolved at line-assembly time, when the
 * terminal width is known (see `assembleLines`). `LineTerm` marks an explicit
 * line break produced by the `line_break` module.
 */
export type Segment =
  | { kind: "text"; value: string; style?: Style }
  | { kind: "fill"; value: string; style?: Style }
  | { kind: "lineTerm" };

export function textSegment(value: string, style?: Style): Segment {
  return { kind: "text", value, style };
}

/** Total visible text of a segment list, ignoring styling and fills. */
export function segmentsText(segments: Segment[]): string {
  return segments
    .map((s) => (s.kind === "text" ? s.value : s.kind === "lineTerm" ? "\n" : ""))
    .join("");
}
