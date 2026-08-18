import { describe, expect, it } from "vitest";
import { PRESETS } from "./presets";
import { decodeShare, encodeShare } from "./share";
import { parseConfig } from "./toml";
import type { StarshipConfig } from "@/lib/engine/prompt";

describe("encodeShare / decodeShare", () => {
  it("round-trips a simple config", () => {
    const config: StarshipConfig = { add_newline: false, aws: { style: "bold red" } };
    expect(decodeShare(encodeShare(config))).toEqual(config);
  });

  it("round-trips Nerd Font glyphs and other astral-plane characters", () => {
    const config: StarshipConfig = {
      // Private Use Area glyphs, an emoji with a variation selector, and a
      // surrogate pair — the cases lz-string's UTF-16 handling can trip on.
      // None of these are starship defaults, so none may be dropped.
      nodejs: { symbol: " " },
      aws: { symbol: "☁️ 🛠️ " },
      character: { success_symbol: "[🚀](bold green)", error_symbol: "[𝕏](red)" },
      directory: { home_symbol: "～" },
    };
    expect(decodeShare(encodeShare(config))).toEqual(config);
  });

  it("round-trips multi-line formats and nested palettes", () => {
    const config: StarshipConfig = {
      format: "$username\n$directory\n$character",
      palette: "tokyo",
      palettes: { tokyo: { blue: "#7aa2f7", red: "#f7768e" } },
    };
    expect(decodeShare(encodeShare(config))).toEqual(config);
  });

  it("preserves keys the builder does not understand", () => {
    const config: StarshipConfig = { future_thing: { a: 1 }, top_level_unknown: "keep" };
    expect(decodeShare(encodeShare(config))).toEqual(config);
  });

  it("produces a fragment that needs no further URI escaping", () => {
    const encoded = encodeShare({ character: { success_symbol: "[❯](purple)" } });
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it("compresses rather than inflating a real preset", () => {
    const parsed = parseConfig(PRESETS[0].toml);
    if (!parsed.ok) throw new Error("preset did not parse");
    const encoded = encodeShare(parsed.config);
    expect(encoded.length).toBeLessThan(PRESETS[0].toml.length);
    expect(decodeShare(encoded)).toBeTruthy();
  });

  it.each(PRESETS.map((p) => p.id))("round-trips the %s preset", (id) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) throw new Error(`missing preset ${id}`);
    const parsed = parseConfig(preset.toml);
    if (!parsed.ok) throw new Error("preset did not parse");

    const decoded = decodeShare(encodeShare(parsed.config));
    expect(decoded).toBeTruthy();
    // The share payload is a minimal export, so compare it with one.
    expect(encodeShare(decoded as StarshipConfig)).toBe(encodeShare(parsed.config));
  });

  it("tolerates a leading hash and a key prefix", () => {
    const encoded = encodeShare({ add_newline: false });
    expect(decodeShare(`#${encoded}`)).toEqual({ add_newline: false });
    expect(decodeShare(`#config=${encoded}`)).toEqual({ add_newline: false });
  });

  it("returns null for anything that is not a share payload", () => {
    expect(decodeShare("")).toBeNull();
    expect(decodeShare("#")).toBeNull();
    expect(decodeShare("not-a-payload")).toBeNull();
    expect(decodeShare("#config=")).toBeNull();
  });
});
