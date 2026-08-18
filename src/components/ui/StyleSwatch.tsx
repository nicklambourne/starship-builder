"use client";

/**
 * A two-tone chip showing a style's foreground and background at a glance.
 *
 * A single dot could only ever show one of the two, which made a background
 * colour invisible until the style editor was opened. The chip is split
 * diagonally: upper-left is the text colour, lower-right the background.
 */

import { type Palette, parseStyleString } from "@/lib/engine/styleString";
import { NAMED_COLORS, type Color } from "@/lib/engine/types";
import { type TerminalTheme, xterm256 } from "@/lib/terminalThemes";

const NAMED_INDEX = new Map(NAMED_COLORS.map((name, index) => [name, index]));

export function resolveSwatchColor(
  color: Color | undefined,
  theme: TerminalTheme,
): string | undefined {
  if (!color) return undefined;
  switch (color.kind) {
    case "named": {
      const index = NAMED_INDEX.get(color.name);
      return index === undefined ? undefined : theme.ansi[index];
    }
    case "fixed":
      return xterm256(color.index, theme);
    case "rgb":
      return `#${[color.r, color.g, color.b]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")}`;
    case "prev":
      return undefined;
  }
}

interface StyleSwatchProps {
  style: string | undefined;
  theme: TerminalTheme;
  palette?: Palette;
}

export function StyleSwatch({ style, theme, palette }: StyleSwatchProps) {
  const parsed = style ? parseStyleString(style, palette) : undefined;
  const fg = resolveSwatchColor(parsed?.fg, theme);
  const bg = resolveSwatchColor(parsed?.bg, theme);
  const bold = parsed?.modifiers.has("bold") ?? false;

  return (
    <span
      aria-hidden="true"
      className="relative grid size-5 shrink-0 place-items-center overflow-hidden rounded border border-white/25"
      style={{ backgroundColor: bg ?? "transparent" }}
    >
      {/* A corner wedge keeps the background readable even behind glyph ink. */}
      {bg ? (
        <span
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${bg} 50%)`,
          }}
        />
      ) : null}
      <span
        className="relative text-[11px] leading-none"
        style={{
          color: fg ?? "var(--swatch-empty, #6b7280)",
          fontWeight: bold ? 700 : 400,
        }}
      >
        A
      </span>
    </span>
  );
}
