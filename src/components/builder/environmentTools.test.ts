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
