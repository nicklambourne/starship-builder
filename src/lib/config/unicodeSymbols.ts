/**
 * Ordinary Unicode characters, for the symbol picker.
 *
 * The rest of the catalogue is Nerd Fonts: private-use codepoints that only
 * exist in a patched font, so a prompt built from them looks like tofu to
 * anyone running a stock terminal font. These are the opposite — arrows, box
 * drawing, blocks and marks that any monospace font has had for decades — and
 * they are just as unlikely to be typeable on the keyboard in front of you.
 *
 * Deliberately no emoji. They render in colour, at their own width, and half
 * of them are two cells wide in a terminal and one in a browser, which makes a
 * prompt that lines up here and not there. Anything already in a module's
 * default symbols is reachable through that module anyway.
 *
 * Names are what the picker searches, so they are what someone would type
 * looking for the shape rather than the Unicode name: "corner" finds `╭`,
 * which "box drawings light arc down and right" would not.
 */

export interface UnicodeSymbol {
  name: string;
  char: string;
}

export const UNICODE_CATEGORY = "Unicode";

/**
 * Spaces, by name and width.
 *
 * The strongest case in the whole picker: a thin space is impossible to type,
 * impossible to see, and the difference between a prompt that breathes and one
 * that does not. They are also the easiest thing to lose track of, so the
 * editor names them on their rows rather than counting them as "space".
 *
 * No zero-width space. It is a real tool for nudging a powerline separator,
 * and it is also a character that makes a prompt behave differently for no
 * visible reason — offering it from a grid of blank squares is how someone
 * ends up debugging one at midnight.
 */
export const SPACE_NAMES: Record<string, string> = {
  " ": "space",
  "\t": "tab",
  "\u00a0": "no-break space",
  "\u2002": "en space",
  "\u2003": "em space",
  "\u2007": "figure space",
  "\u2009": "thin space",
  "\u200a": "hair space",
  "\u202f": "narrow no-break space",
};

/** What to call a whitespace character, when it has a name worth using. */
export function spaceName(char: string): string | undefined {
  return SPACE_NAMES[char];
}

export const UNICODE_SYMBOLS: UnicodeSymbol[] = [
  // Spaces. Widths differ, which is the point: a thin space between a symbol
  // and a branch name is the usual fix for a prompt that reads as cramped.
  { name: "thin space", char: "\u2009" },
  { name: "hair space narrowest", char: "\u200a" },
  { name: "narrow no-break space", char: "\u202f" },
  { name: "en space", char: "\u2002" },
  { name: "em space", char: "\u2003" },
  { name: "figure space digit width", char: "\u2007" },
  { name: "no-break space", char: "\u00a0" },

  // Chevrons and quotes — the shapes prompts end with.
  { name: "chevron right", char: "❯" },
  { name: "chevron left", char: "❮" },
  { name: "double angle right guillemet", char: "»" },
  { name: "double angle left guillemet", char: "«" },
  { name: "single angle right", char: "›" },
  { name: "single angle left", char: "‹" },
  { name: "angle bracket right", char: "⟩" },
  { name: "angle bracket left", char: "⟨" },

  // Arrows.
  { name: "arrow right", char: "→" },
  { name: "arrow left", char: "←" },
  { name: "arrow up", char: "↑" },
  { name: "arrow down", char: "↓" },
  { name: "arrow right heavy", char: "➔" },
  { name: "arrow right triangle", char: "➤" },
  { name: "arrow right double", char: "⇒" },
  { name: "arrow left double", char: "⇐" },
  { name: "arrow right long", char: "⟶" },
  { name: "arrow right hook", char: "↪" },
  { name: "arrow up down", char: "↕" },
  { name: "arrow left right", char: "↔" },

  // Box drawing, for prompts that draw a frame.
  { name: "line horizontal", char: "─" },
  { name: "line vertical", char: "│" },
  { name: "line horizontal heavy", char: "━" },
  { name: "line vertical heavy", char: "┃" },
  { name: "line horizontal double", char: "═" },
  { name: "line vertical double", char: "║" },
  { name: "corner top left", char: "┌" },
  { name: "corner top right", char: "┐" },
  { name: "corner bottom left", char: "└" },
  { name: "corner bottom right", char: "┘" },
  { name: "corner top left round arc", char: "╭" },
  { name: "corner top right round arc", char: "╮" },
  { name: "corner bottom right round arc", char: "╯" },
  { name: "corner bottom left round arc", char: "╰" },
  { name: "tee right", char: "├" },
  { name: "tee left", char: "┤" },
  { name: "tee down", char: "┬" },
  { name: "tee up", char: "┴" },
  { name: "cross plus", char: "┼" },

  // Blocks, for powerline-ish dividers without a patched font.
  { name: "block full", char: "█" },
  { name: "block left half", char: "▌" },
  { name: "block right half", char: "▐" },
  { name: "block quarter left", char: "▎" },
  { name: "block light shade", char: "░" },
  { name: "block medium shade", char: "▒" },
  { name: "block dark shade", char: "▓" },
  { name: "block upper half", char: "▀" },
  { name: "block lower half", char: "▄" },

  // Shapes.
  { name: "circle filled", char: "●" },
  { name: "circle hollow", char: "○" },
  { name: "square filled", char: "■" },
  { name: "square hollow", char: "□" },
  { name: "square small filled", char: "▪" },
  { name: "diamond filled", char: "◆" },
  { name: "diamond hollow", char: "◇" },
  { name: "triangle right filled", char: "▶" },
  { name: "triangle left filled", char: "◀" },
  { name: "triangle up filled", char: "▲" },
  { name: "triangle down filled", char: "▼" },
  { name: "star filled", char: "★" },
  { name: "star hollow", char: "☆" },

  // Marks a prompt uses to say yes, no or careful.
  { name: "check tick", char: "✓" },
  { name: "check tick heavy", char: "✔" },
  { name: "cross ballot", char: "✗" },
  { name: "cross ballot heavy", char: "✘" },
  { name: "multiplication times", char: "×" },
  { name: "plus minus", char: "±" },
  { name: "division", char: "÷" },
  { name: "not sign", char: "¬" },
  { name: "degree", char: "°" },
  { name: "section", char: "§" },
  { name: "pilcrow paragraph", char: "¶" },
  { name: "dagger", char: "†" },

  // Separators and dots.
  { name: "middle dot", char: "·" },
  { name: "bullet", char: "•" },
  { name: "bullet operator small", char: "∙" },
  { name: "ellipsis", char: "…" },
  { name: "vertical ellipsis", char: "⋮" },
  { name: "horizontal ellipsis midline", char: "⋯" },
  { name: "double vertical line", char: "‖" },
  { name: "broken bar", char: "¦" },
  { name: "em dash", char: "—" },
  { name: "en dash", char: "–" },
  { name: "infinity", char: "∞" },
  { name: "lambda", char: "λ" },
];
