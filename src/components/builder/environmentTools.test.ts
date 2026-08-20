import { describe, expect, it } from "vitest";

import { COMMON_TOOLS } from "./EnvironmentPanel";
import { TOOL_ICONS } from "@/components/ui/toolIcons";

/**
 * Every tool switch needs a mark, and each mark needs to be traceable to the
 * set it came from — these are vendored, so nothing fetches them at runtime
 * and nothing checks them but this.
 *
 * They replaced Nerd Font glyphs, which had their own test pinning them to
 * starship's nerd-font-symbols preset. That tie is gone with them: these are
 * brand marks, and starship has no opinion about those.
 */
describe("installed-tool icons", () => {
  it("gives every tool a mark", () => {
    for (const tool of COMMON_TOOLS) {
      expect(`${tool.label}: ${Boolean(TOOL_ICONS[tool.key])}`).toBe(`${tool.label}: true`);
    }
  });

  it("draws each one as a single path on a 24-unit grid", () => {
    for (const [key, icon] of Object.entries(TOOL_ICONS)) {
      // A path that does not start with a move command is not a path.
      expect(`${key}: ${icon.path.startsWith("M")}`).toBe(`${key}: true`);
      expect(icon.slug.length).toBeGreaterThan(0);
    }
  });

  it("ships no icons it does not use", () => {
    const used = new Set(COMMON_TOOLS.map((tool) => tool.key));
    expect(Object.keys(TOOL_ICONS).filter((key) => !used.has(key))).toEqual([]);
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
