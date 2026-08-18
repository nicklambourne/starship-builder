import { describe, expect, it } from "vitest";

import { parseStyleString } from "./styleString";

describe("parseStyleString", () => {
  it("parses a single modifier", () => {
    const style = parseStyleString("bold");
    expect(style?.modifiers.has("bold")).toBe(true);
    expect(style?.fg).toBeUndefined();
  });

  it("treats a bare colour as foreground", () => {
    expect(parseStyleString("red")?.fg).toEqual({ kind: "named", name: "red" });
  });

  it("parses fg:/bg: prefixes", () => {
    const style = parseStyleString("fg:red bg:blue");
    expect(style?.fg).toEqual({ kind: "named", name: "red" });
    expect(style?.bg).toEqual({ kind: "named", name: "blue" });
  });

  it("parses 24-bit hex", () => {
    expect(parseStyleString("#af8700")?.fg).toEqual({
      kind: "rgb",
      r: 0xaf,
      g: 0x87,
      b: 0x00,
    });
  });

  it("rejects malformed hex, voiding the whole style", () => {
    expect(parseStyleString("#abc")).toBeUndefined();
  });

  it("parses a 256-colour index", () => {
    expect(parseStyleString("fg:38")?.fg).toEqual({ kind: "fixed", index: 38 });
  });

  it("rejects an out-of-range colour index", () => {
    expect(parseStyleString("300")).toBeUndefined();
  });

  it("combines modifiers and colours", () => {
    const style = parseStyleString("bold underline fg:#ff0000");
    expect(style?.modifiers.has("bold")).toBe(true);
    expect(style?.modifiers.has("underline")).toBe(true);
    expect(style?.fg).toEqual({ kind: "rgb", r: 255, g: 0, b: 0 });
  });

  it("is case-insensitive", () => {
    expect(parseStyleString("BOLD RED")?.fg).toEqual({
      kind: "named",
      name: "red",
    });
  });

  it("returns an empty style for an empty string", () => {
    const style = parseStyleString("");
    expect(style).toBeDefined();
    expect(style?.fg).toBeUndefined();
    expect(style?.modifiers.size).toBe(0);
  });

  it("voids the entire style on `none`", () => {
    expect(parseStyleString("bold none red")).toBeUndefined();
  });

  it("voids the entire style when any token is unparseable", () => {
    // This is starship's try_fold behaviour: one bad token discards everything.
    expect(parseStyleString("bold notacolour")).toBeUndefined();
  });

  it("resets the background when bg: names an invalid colour", () => {
    const style = parseStyleString("bg:blue bg:notacolour");
    expect(style).toBeDefined();
    expect(style?.bg).toBeUndefined();
  });

  it("resolves palette colours", () => {
    const style = parseStyleString("mauve", { mauve: "#cba6f7" });
    expect(style?.fg).toEqual({ kind: "rgb", r: 0xcb, g: 0xa6, b: 0xf7 });
  });

  it("lets a palette redefine a predefined colour name", () => {
    const style = parseStyleString("red", { red: "#00ff00" });
    expect(style?.fg).toEqual({ kind: "rgb", r: 0, g: 255, b: 0 });
  });

  it("does not chain palette lookups", () => {
    // `a` maps to `b`, but `b` is only resolvable via the palette, which the
    // single-level resolution deliberately does not consult again.
    expect(parseStyleString("a", { a: "b", b: "#ffffff" })).toBeUndefined();
  });

  it("parses prev_fg and prev_bg", () => {
    const style = parseStyleString("fg:prev_bg bg:prev_fg");
    expect(style?.fg).toEqual({ kind: "prev", source: "bg" });
    expect(style?.bg).toEqual({ kind: "prev", source: "fg" });
  });

  it("parses bright colour names", () => {
    expect(parseStyleString("bright-green")?.fg).toEqual({
      kind: "named",
      name: "bright-green",
    });
  });
});
