import { describe, expect, it } from "vitest";
import { CURATED_PALETTES } from "./curatedPalettes";

describe("curated palettes", () => {
  it("offers the ones the bundled presets ship", () => {
    expect(CURATED_PALETTES.length).toBeGreaterThan(0);
    for (const palette of CURATED_PALETTES) {
      expect(Object.keys(palette.colours).length).toBeGreaterThan(0);
      expect(palette.from).not.toBe("");
    }
  });

  it("carries the authors' own values", () => {
    const catppuccin = CURATED_PALETTES.find((p) => p.name.includes("catppuccin"));
    // Lifted from the preset, not retyped: Catppuccin Mocha's peach.
    expect(catppuccin?.colours.peach).toBe("#fab387");
  });

  it("names each one once", () => {
    const names = CURATED_PALETTES.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
