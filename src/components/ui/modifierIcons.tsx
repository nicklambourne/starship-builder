/**
 * Marks for the style modifiers.
 *
 * The four with an established typographic convention — bold, italic,
 * underline, strikethrough — are drawn as the letter in that style, which is
 * what every text editor uses and what people already read without thinking.
 * The other four have no such convention, so they get a small drawing of what
 * they do. Every button keeps its name as its accessible label and tooltip,
 * so nothing depends on recognising the glyph.
 */

import type { StyleModifier } from "@/lib/engine/types";

function Glyph({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span aria-hidden="true" className="text-sm leading-none" style={style}>
      {children}
    </span>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.05em"
      height="1.05em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const MODIFIER_ICONS: Record<StyleModifier, React.ReactNode> = {
  bold: <Glyph style={{ fontWeight: 800 }}>B</Glyph>,
  italic: <Glyph style={{ fontStyle: "italic", fontFamily: "Georgia, serif" }}>I</Glyph>,
  underline: <Glyph style={{ textDecoration: "underline" }}>U</Glyph>,
  strikethrough: <Glyph style={{ textDecoration: "line-through" }}>S</Glyph>,
  // Brightness turned down.
  dimmed: (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M4.2 4.2l1.1 1.1M18.7 18.7l1.1 1.1M3 12h1.5M19.5 12H21M4.2 19.8l1.1-1.1M18.7 5.3l1.1-1.1" />
    </Icon>
  ),
  // Foreground and background swapped.
  inverted: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
    </Icon>
  ),
  blink: (
    <Icon>
      <path d="M13 2L5 13h6l-2 9 8-11h-6l2-9z" />
    </Icon>
  ),
  // Occupies its space but paints nothing.
  hidden: (
    <Icon>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6 0 9 7 9 7a15.4 15.4 0 0 1-3.3 4.3" />
      <path d="M6.3 6.3A15.5 15.5 0 0 0 3 12s3 7 9 7a9.6 9.6 0 0 0 4.2-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Icon>
  ),
};
