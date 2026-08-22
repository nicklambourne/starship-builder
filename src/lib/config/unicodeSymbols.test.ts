import { describe, expect, it } from "vitest";
import { UNICODE_CATEGORY, UNICODE_SYMBOLS } from "./unicodeSymbols";
import { loadGlyphs, searchGlyphs } from "./glyphs";

describe("the Unicode section", () => {
  it("offers characters, not private-use codepoints", () => {
    for (const symbol of UNICODE_SYMBOLS) {
      const code = symbol.char.codePointAt(0)!;
      // The private use area is where Nerd Fonts live; these have to work in a
      // stock terminal font, which is the whole point of the section.
      expect(`${symbol.name}: ${code >= 0xe000 && code <= 0xf8ff}`).toBe(
        `${symbol.name}: false`,
      );
    }
  });

  it("names each character once", () => {
    const chars = UNICODE_SYMBOLS.map((s) => s.char);
    const names = UNICODE_SYMBOLS.map((s) => s.name);
    expect(new Set(chars).size).toBe(chars.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("leads the catalogue's categories", async () => {
    const catalogue = await loadGlyphs();
    expect(catalogue.categories[0]).toBe(UNICODE_CATEGORY);
  });

  it("is searchable by shape rather than by Unicode name", async () => {
    const catalogue = await loadGlyphs();
    const corners = searchGlyphs(catalogue, "corner", UNICODE_CATEGORY);
    expect(corners.results.map((g) => g.char)).toContain("╭");

    const chevrons = searchGlyphs(catalogue, "chevron", UNICODE_CATEGORY);
    expect(chevrons.results.map((g) => g.char)).toContain("❯");
  });

  it("carries the codepoint the config would need", async () => {
    const catalogue = await loadGlyphs();
    const arrow = catalogue.glyphs.find((g) => g.char === "→");
    expect(arrow?.code).toBe("2192");
    expect(arrow?.category).toBe(UNICODE_CATEGORY);
  });
});
