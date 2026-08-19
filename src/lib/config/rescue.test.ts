import { describe, expect, it } from "vitest";

import { MODULE_DEFAULTS, isWorthRescuing, rescueToml } from "./rescue";
import { parseConfig } from "./toml";

describe("rescueToml", () => {
  it("gives back the config someone was editing", () => {
    const parsed = parseConfig('add_newline = false\n\n[directory]\nstyle = "bold blue"\n');
    expect(parsed.ok).toBe(true);
    const toml = rescueToml(parsed.ok ? parsed.config : undefined);
    expect(toml).toContain("add_newline = false");
    expect(toml).toContain('style = "bold blue"');
  });

  it("has nothing to offer for an empty config", () => {
    expect(rescueToml({})).toBeNull();
    expect(rescueToml(undefined)).toBeNull();
    expect(isWorthRescuing({})).toBe(false);
  });

  it("falls back to JSON rather than throwing a second time", () => {
    // A rescue that throws is no rescue: this runs after something already
    // went wrong, so a value the serialiser chokes on must still come back.
    const hostile = { format: { toString() { throw new Error("nope"); } } } as never;
    const out = rescueToml(hostile);
    expect(out === null || typeof out === "string").toBe(true);
  });

  it("knows every module's defaults", () => {
    expect(Object.keys(MODULE_DEFAULTS).length).toBeGreaterThan(100);
    expect(MODULE_DEFAULTS.directory.style).toBe("cyan bold");
  });
});
