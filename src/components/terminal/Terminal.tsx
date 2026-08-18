"use client";

/**
 * Simulated terminal.
 *
 * Deliberately not xterm.js: this renders a static prompt rather than driving a
 * PTY, and hand-rendering the segments keeps full control over theming, font
 * switching, wrapping, and what ends up on the clipboard.
 */

import { useMemo } from "react";

import { type TerminalTheme, xterm256 } from "@/lib/terminalThemes";
import type { Color, Segment, Style } from "@/lib/engine/types";
import { NAMED_COLORS } from "@/lib/engine/types";

const NAMED_INDEX = new Map(NAMED_COLORS.map((name, index) => [name, index]));

function resolveColor(color: Color | undefined, theme: TerminalTheme): string | undefined {
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
      // Resolved upstream by resolvePrevColors; nothing sensible left to do.
      return undefined;
  }
}

function styleToCss(
  style: Style | undefined,
  theme: TerminalTheme,
): React.CSSProperties {
  if (!style) return {};

  let color = resolveColor(style.fg, theme);
  let backgroundColor = resolveColor(style.bg, theme);

  if (style.modifiers.has("inverted")) {
    const fg = color ?? theme.foreground;
    const bg = backgroundColor ?? theme.background;
    color = bg;
    backgroundColor = fg;
  }

  return {
    color,
    backgroundColor,
    fontWeight: style.modifiers.has("bold") ? 700 : undefined,
    fontStyle: style.modifiers.has("italic") ? "italic" : undefined,
    opacity: style.modifiers.has("dimmed") ? 0.6 : undefined,
    // `hidden` keeps the glyph's width but paints nothing, as a terminal does.
    visibility: style.modifiers.has("hidden") ? "hidden" : undefined,
    textDecoration:
      [
        style.modifiers.has("underline") ? "underline" : "",
        style.modifiers.has("strikethrough") ? "line-through" : "",
      ]
        .filter(Boolean)
        .join(" ") || undefined,
  };
}

export interface TerminalProps {
  /** Left prompt lines, already assembled with fills resolved. */
  lines: Segment[][];
  /** Right prompt segments, rendered flush right on the final line. */
  right?: Segment[];
  /** Whether a blank line precedes the prompt (`add_newline`). */
  leadingNewline?: boolean;
  theme: TerminalTheme;
  /** CSS font-family stack for the selected terminal font. */
  fontStack: string;
  fontSize?: number;
  /** Text typed after the prompt, for realism. */
  command?: string;
  className?: string;
}

function SegmentSpans({
  segments,
  theme,
}: {
  segments: Segment[];
  theme: TerminalTheme;
}) {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === "lineTerm") return null;
        if (segment.value.length === 0) return null;
        return (
          <span key={index} style={styleToCss(segment.style, theme)}>
            {segment.value}
          </span>
        );
      })}
    </>
  );
}

export function Terminal({
  lines,
  right,
  leadingNewline = false,
  theme,
  fontStack,
  fontSize = 14,
  command,
  className,
}: TerminalProps) {
  const hasRight = (right?.length ?? 0) > 0;

  // Screen readers get the plain text; the styled spans are decorative detail
  // that would otherwise be read out character by character.
  const plainText = useMemo(
    () =>
      lines
        .map((line) => line.map((s) => (s.kind === "lineTerm" ? "" : s.value)).join(""))
        .join("\n"),
    [lines],
  );

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 shadow-2xl ${className ?? ""}`}
      style={{ backgroundColor: theme.background }}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span
          className="ml-2 text-xs opacity-60"
          style={{ color: theme.foreground, fontFamily: fontStack }}
        >
          starship — preview
        </span>
      </div>

      <div>
        <pre
          aria-label="Simulated terminal prompt"
          /*
           * Wrapping rather than scrolling sideways: a real terminal wraps a
           * long prompt at the column boundary, mid-token, so `break-all` is
           * the faithful behaviour as well as the one that fits a phone.
           */
          className="m-0 whitespace-pre-wrap break-all p-3 sm:p-5"
          style={{
            fontFamily: fontStack,
            // Scales with the viewport so a long prompt stays legible on a
            // phone without the user pinching or scrolling.
            fontSize: `clamp(11px, 3.1vw, ${fontSize}px)`,
            lineHeight: 1.6,
            color: theme.foreground,
          }}
        >
          <span className="sr-only">{plainText}</span>
          <span aria-hidden="true">
            {leadingNewline ? "\n" : null}
            {lines.map((line, lineIndex) => {
              const isLast = lineIndex === lines.length - 1;
              return (
                <span key={lineIndex}>
                  <SegmentSpans segments={line} theme={theme} />
                  {isLast && command ? command : null}
                  {isLast && hasRight ? (
                    // The right prompt is pushed to the far edge; a real shell
                    // uses padding computed from the terminal width, which the
                    // fill logic has already applied where `fill` was used.
                    <span className="block text-right sm:float-right sm:block">
                      <SegmentSpans segments={right ?? []} theme={theme} />
                    </span>
                  ) : null}
                  {isLast ? null : "\n"}
                </span>
              );
            })}
            {command === undefined ? (
              <span
                className="ml-0.5 inline-block animate-pulse"
                style={{ color: theme.foreground }}
              >
                ▊
              </span>
            ) : null}
          </span>
        </pre>
      </div>
    </div>
  );
}
