import { describe, expect, it } from "vitest";

import { segmentsToAnsi } from "./ansi";
import { parseFormatString } from "./formatString";
import { type RenderContext, type VariableValue, renderFormat } from "./render";
import { segmentsText } from "./types";

function ctx(
  variables: Record<string, VariableValue | undefined>,
  styleVariables: Record<string, string> = {},
): RenderContext {
  return {
    variables: new Map(Object.entries(variables)),
    styleVariables: new Map(Object.entries(styleVariables)),
  };
}

function render(format: string, context: RenderContext): string {
  return segmentsText(renderFormat(parseFormatString(format), context));
}

const ESC = "\u001b";

const plain = (value: string): VariableValue => ({ type: "plain", value });

describe("renderFormat", () => {
  it("renders literal text", () => {
    expect(render("hello", ctx({}))).toBe("hello");
  });

  it("substitutes a variable", () => {
    expect(render("$a", ctx({ a: plain("x") }))).toBe("x");
  });

  it("renders an empty variable as nothing", () => {
    expect(render("a${a}b", ctx({ a: undefined }))).toBe("ab");
  });

  it("renders an unknown variable as nothing", () => {
    expect(render("a${unknown}b", ctx({}))).toBe("ab");
  });

  describe("conditionals", () => {
    it("renders when a variable inside is non-empty", () => {
      expect(render("($a)", ctx({ a: plain("x") }))).toBe("x");
    });

    it("is hidden when the variable is empty", () => {
      expect(render("($a)", ctx({ a: plain("") }))).toBe("");
    });

    it("is hidden when the variable is absent", () => {
      expect(render("($a)", ctx({}))).toBe("");
    });

    it("renders when ANY of several variables is non-empty", () => {
      expect(render("($a$b)", ctx({ a: undefined, b: plain("y") }))).toBe("y");
    });

    it("includes literal text once shown", () => {
      expect(render("(on $a)", ctx({ a: plain("main") }))).toBe("on main");
    });

    it("is hidden when it contains no variables at all", () => {
      expect(render("(text)", ctx({}))).toBe("");
    });

    it("is not triggered by a style variable alone", () => {
      expect(render("([x]($style))", ctx({}, { style: "red" }))).toBe("");
    });
  });

  describe("text groups", () => {
    it("applies a style to its contents", () => {
      const segments = renderFormat(parseFormatString("[x](bold red)"), ctx({}));
      expect(segments[0].kind).toBe("text");
      if (segments[0].kind !== "text") throw new Error("expected text");
      expect(segments[0].style?.modifiers.has("bold")).toBe(true);
      expect(segments[0].style?.fg).toEqual({ kind: "named", name: "red" });
    });

    it("replaces rather than merges the inherited style", () => {
      // The inner group is only `red`; `bold` from the outer group is dropped.
      const segments = renderFormat(
        parseFormatString("[a[b](red)](bold)"),
        ctx({}),
      );
      const inner = segments.find((s) => s.kind === "text" && s.value === "b");
      if (!inner || inner.kind !== "text") throw new Error("expected inner segment");
      expect(inner.style?.modifiers.has("bold")).toBe(false);
      expect(inner.style?.fg).toEqual({ kind: "named", name: "red" });
    });

    it("resolves a $style variable in the style position", () => {
      const segments = renderFormat(
        parseFormatString("[x]($style)"),
        ctx({}, { style: "bold blue" }),
      );
      if (segments[0].kind !== "text") throw new Error("expected text");
      expect(segments[0].style?.fg).toEqual({ kind: "named", name: "blue" });
      expect(segments[0].style?.modifiers.has("bold")).toBe(true);
    });

    it("keeps an empty group as a segment so prev_fg can chain off it", () => {
      const segments = renderFormat(parseFormatString("[](red)"), ctx({}));
      expect(segments).toHaveLength(1);
      expect(segments[0].kind).toBe("text");
      if (segments[0].kind !== "text") throw new Error("expected text");
      expect(segments[0].value).toBe("");
      expect(segments[0].style?.fg).toEqual({ kind: "named", name: "red" });
    });

    it("drops all styling when the style string is unparseable", () => {
      const segments = renderFormat(parseFormatString("[x](notacolour)"), ctx({}));
      if (segments[0].kind !== "text") throw new Error("expected text");
      expect(segments[0].style).toBeUndefined();
    });
  });

  describe("styled variables", () => {
    it("preserves a segment's own style", () => {
      const styled: VariableValue = {
        type: "styled",
        segments: [
          { kind: "text", value: "m", style: { fg: { kind: "named", name: "green" }, modifiers: new Set() } },
        ],
      };
      const segments = renderFormat(parseFormatString("[$m](red)"), ctx({ m: styled }));
      if (segments[0].kind !== "text") throw new Error("expected text");
      expect(segments[0].style?.fg).toEqual({ kind: "named", name: "green" });
    });

    it("inherits the surrounding style when a segment has none", () => {
      const styled: VariableValue = {
        type: "styled",
        segments: [{ kind: "text", value: "m" }],
      };
      const segments = renderFormat(parseFormatString("[$m](red)"), ctx({ m: styled }));
      if (segments[0].kind !== "text") throw new Error("expected text");
      expect(segments[0].style?.fg).toEqual({ kind: "named", name: "red" });
    });
  });

  describe("meta variables", () => {
    it("expands a nested format in the current scope", () => {
      const meta: VariableValue = {
        type: "meta",
        format: parseFormatString("<$inner>"),
      };
      expect(render("$outer", ctx({ outer: meta, inner: plain("v") }))).toBe("<v>");
    });

    it("satisfies a conditional when its inner format would render", () => {
      const meta: VariableValue = {
        type: "meta",
        format: parseFormatString("$inner"),
      };
      expect(render("($outer)", ctx({ outer: meta, inner: plain("v") }))).toBe("v");
      expect(render("($outer)", ctx({ outer: meta, inner: undefined }))).toBe("");
    });
  });
});

describe("segmentsToAnsi", () => {
  it("emits no escapes for unstyled text", () => {
    expect(segmentsToAnsi(renderFormat(parseFormatString("abc"), ctx({})))).toBe("abc");
  });

  it("wraps styled text and resets afterwards", () => {
    const out = segmentsToAnsi(renderFormat(parseFormatString("[a](red)"), ctx({})));
    expect(out).toBe(`${ESC}[31ma${ESC}[0m`);
  });

  it("collapses redundant sequences across equal styles", () => {
    const out = segmentsToAnsi(
      renderFormat(parseFormatString("[a](red)[b](red)"), ctx({})),
    );
    expect(out).toBe(`${ESC}[31mab${ESC}[0m`);
  });

  it("emits bold before colour", () => {
    const out = segmentsToAnsi(renderFormat(parseFormatString("[a](bold red)"), ctx({})));
    expect(out).toBe(`${ESC}[1;31ma${ESC}[0m`);
  });

  it("emits 256-colour and truecolour sequences", () => {
    expect(segmentsToAnsi(renderFormat(parseFormatString("[a](fg:38)"), ctx({})))).toBe(
      `${ESC}[38;5;38ma${ESC}[0m`,
    );
    expect(
      segmentsToAnsi(renderFormat(parseFormatString("[a](#af8700)"), ctx({}))),
    ).toBe(`${ESC}[38;2;175;135;0ma${ESC}[0m`);
  });

  it("emits background before foreground", () => {
    // nu_ansi_term's order. The rendered colour is the same either way, so only
    // byte-level comparison against real starship catches a regression here.
    const out = segmentsToAnsi(
      renderFormat(parseFormatString("[a](bold fg:#af8700 bg:blue)"), ctx({})),
    );
    expect(out).toBe(`${ESC}[1;44;38;2;175;135;0ma${ESC}[0m`);
  });

  it("omits the reset when the next style only adds attributes", () => {
    // red → bold blue adds bold and changes the foreground, both of which a
    // terminal can apply without clearing first.
    const out = segmentsToAnsi(
      renderFormat(parseFormatString("[a](red)[b](bold blue)"), ctx({})),
    );
    expect(out).toBe(`${ESC}[31ma${ESC}[1;34mb${ESC}[0m`);
  });

  it("resets when the next style removes an attribute", () => {
    // bold blue → red must drop bold, which is only possible via a reset.
    const out = segmentsToAnsi(
      renderFormat(parseFormatString("[a](bold blue)[b](red)"), ctx({})),
    );
    expect(out).toBe(`${ESC}[1;34ma${ESC}[0m${ESC}[31mb${ESC}[0m`);
  });

  it("resolves prev_fg against the preceding segment", () => {
    const out = segmentsToAnsi(
      renderFormat(parseFormatString("[a](fg:red)[b](fg:prev_fg)"), ctx({})),
    );
    expect(out).toBe(`${ESC}[31mab${ESC}[0m`);
  });
});
