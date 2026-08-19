import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { COMMON_TOOLS } from "./EnvironmentPanel";

/**
 * The tool buttons are marked with the glyph starship's own nerd-font-symbols
 * preset gives that module. `data/` is synced from upstream, so this pins the
 * two together rather than trusting a transcription — four of twelve were
 * wrong when they were first typed by hand.
 */
describe("installed-tool icons", () => {
  const preset = readFileSync("data/presets/nerd-font-symbols.toml", "utf8");

  const symbolFor = (module: string) => {
    const table = preset.match(
      new RegExp(String.raw`^\[${module}\]\s*\n((?:(?!^\[).*\n)*)`, "m"),
    );
    return table?.[1].match(/^symbol = "(.*)"\s*$/m)?.[1].trimEnd();
  };

  it("uses the preset's glyph for every tool", () => {
    for (const tool of COMMON_TOOLS) {
      // The button key is the scenario key; docker's module is docker_context.
      const module = tool.key === "docker" ? "docker_context" : tool.key;
      const expected = symbolFor(module);
      expect(expected).toBeTruthy();
      expect(`${tool.label}: ${tool.symbol}`).toBe(`${tool.label}: ${expected}`);
    }
  });

  it("gives every tool exactly one glyph", () => {
    for (const tool of COMMON_TOOLS) {
      expect([...tool.symbol]).toHaveLength(1);
    }
  });
});

/**
 * The glyphs are the only thing distinguishing one button from the next, so
 * each has to be legible on the surface it sits on. Seven brand colours clear
 * 3:1 on both; the rest carry a second value for the other theme. WCAG 1.4.11
 * is the bar used, the same one the light theme's remapped shades are held to.
 */
describe("installed-tool colours", () => {
  const luminance = (hex: string) => {
    const channel = (i: number) => {
      const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  };
  const contrast = (hex: string, background: number) => {
    const a = luminance(hex) + 0.05;
    const b = background + 0.05;
    return a > b ? a / b : b / a;
  };

  it("is legible on the dark surface", () => {
    for (const tool of COMMON_TOOLS) {
      expect(`${tool.label}: ${contrast(tool.color, 0) >= 3}`).toBe(`${tool.label}: true`);
    }
  });

  it("is legible on the light surface", () => {
    for (const tool of COMMON_TOOLS) {
      expect(`${tool.label}: ${contrast(tool.lightColor, 1) >= 3}`).toBe(
        `${tool.label}: true`,
      );
    }
  });

  it("keeps the brand colour wherever it already reads on both", () => {
    // Changing one of these means the brand colour was replaced needlessly.
    const bothWays = COMMON_TOOLS.filter((t) => t.color === t.lightColor).map((t) => t.label);
    expect(bothWays).toEqual(["Node.js", "Python", "Rust", "Ruby", "PHP", "Terraform", "Docker"]);
  });
});
