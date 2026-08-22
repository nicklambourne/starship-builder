/**
 * Nerd Font glyph catalogue for the symbol picker.
 *
 * Loaded on demand: ~11,000 glyphs is 578 KB of JSON, which nobody should pay
 * for on first paint when most sessions never open the picker. The first call
 * fetches it, every later call reuses the same promise.
 */

import { UNICODE_CATEGORY, UNICODE_SYMBOLS } from "./unicodeSymbols";

export interface Glyph {
  /** Name without its set prefix, e.g. `python` rather than `dev-python`. */
  name: string;
  /** The character itself. */
  char: string;
  /** Hex codepoint, shown so a value can be typed into a config by hand. */
  code: string;
  category: string;
}

export interface GlyphCatalogue {
  categories: string[];
  glyphs: Glyph[];
  nerdFontsVersion: string;
}

interface RawGlyph {
  n: string;
  c: string;
  g: string;
}

/**
 * The curated Unicode set, in the catalogue's own shape.
 *
 * First in the category list because it is the one someone can use without a
 * patched font — everything after it is Nerd Fonts.
 */
function unicodeGlyphs(): Glyph[] {
  return UNICODE_SYMBOLS.map((symbol) => ({
    name: symbol.name,
    char: symbol.char,
    code: symbol.char.codePointAt(0)!.toString(16),
    category: UNICODE_CATEGORY,
  }));
}

let pending: Promise<GlyphCatalogue> | null = null;

export function loadGlyphs(): Promise<GlyphCatalogue> {
  pending ??= import("@/../data/glyphs.generated.json").then((module) => {
    const data = module.default as {
      categories: string[];
      glyphs: RawGlyph[];
      nerdFontsVersion: string;
    };
    return {
      categories: [UNICODE_CATEGORY, ...data.categories],
      nerdFontsVersion: data.nerdFontsVersion,
      glyphs: [...unicodeGlyphs(), ...data.glyphs.map((glyph) => ({
        name: glyph.n,
        code: glyph.c,
        category: glyph.g,
        char: String.fromCodePoint(Number.parseInt(glyph.c, 16)),
      }))],
    };
  });
  return pending;
}

/**
 * Filters by name and category.
 *
 * Results are capped rather than paginated: nobody scrolls 7,000 Material
 * Design icons, and rendering them would stall the picker on every keystroke.
 */
export function searchGlyphs(
  catalogue: GlyphCatalogue,
  query: string,
  category: string | null,
  limit = 300,
): { results: Glyph[]; total: number } {
  const needle = query.trim().toLowerCase();
  const results: Glyph[] = [];
  let total = 0;

  for (const glyph of catalogue.glyphs) {
    if (category && glyph.category !== category) continue;
    if (needle && !glyph.name.toLowerCase().includes(needle)) continue;
    total += 1;
    if (results.length < limit) results.push(glyph);
  }

  return { results, total };
}
