import { describe, expect, it } from "vitest";

import {
  type FormatElement,
  collectStyleVariables,
  collectVariables,
  parseFormatString,
  tryParseFormatString,
} from "./formatString";

const text = (value: string): FormatElement => ({ type: "text", value });
const variable = (name: string): FormatElement => ({ type: "variable", name });

describe("parseFormatString", () => {
  it("parses plain text", () => {
    expect(parseFormatString("hello")).toEqual([text("hello")]);
  });

  it("parses a bare variable", () => {
    expect(parseFormatString("$symbol")).toEqual([variable("symbol")]);
  });

  it("stops a variable name at the first non-identifier character", () => {
    expect(parseFormatString("$branch-name")).toEqual([
      variable("branch"),
      text("-name"),
    ]);
  });

  it("parses a braced variable, allowing dots", () => {
    expect(parseFormatString("${env_var.HOST}")).toEqual([
      variable("env_var.HOST"),
    ]);
  });

  it("treats a lone $ as literal text", () => {
    expect(parseFormatString("100$")).toEqual([text("100$")]);
  });

  it("treats $ before a digit as literal text", () => {
    expect(parseFormatString("$1")).toEqual([text("$1")]);
  });

  it("parses a text group with a style", () => {
    expect(parseFormatString("[abc](bold red)")).toEqual([
      {
        type: "textGroup",
        format: [text("abc")],
        style: [{ type: "text", value: "bold red" }],
      },
    ]);
  });

  it("parses a style containing a variable", () => {
    expect(parseFormatString("[a]($style bold)")).toEqual([
      {
        type: "textGroup",
        format: [text("a")],
        style: [
          { type: "variable", name: "style" },
          { type: "text", value: " bold" },
        ],
      },
    ]);
  });

  it("parses nested text groups", () => {
    const parsed = parseFormatString("[outer [inner](red)](blue)");
    expect(parsed).toHaveLength(1);
    const group = parsed[0];
    expect(group.type).toBe("textGroup");
    if (group.type !== "textGroup") throw new Error("expected text group");
    expect(group.format).toHaveLength(2);
    expect(group.format[1].type).toBe("textGroup");
  });

  it("parses conditionals", () => {
    expect(parseFormatString("($branch)")).toEqual([
      { type: "conditional", format: [variable("branch")] },
    ]);
  });

  it("parses nested conditionals", () => {
    const parsed = parseFormatString("(a($b))");
    expect(parsed).toEqual([
      {
        type: "conditional",
        format: [text("a"), { type: "conditional", format: [variable("b")] }],
      },
    ]);
  });

  it("unescapes functional characters", () => {
    expect(parseFormatString("\\[\\]\\(\\)\\$\\\\")).toEqual([text("[]()$\\")]);
  });

  it("keeps a backslash that escapes nothing functional", () => {
    expect(parseFormatString("a\\nb")).toEqual([text("a\\nb")]);
  });

  it("rejects an unmatched closing bracket", () => {
    expect(() => parseFormatString("abc]")).toThrow(/Unexpected/);
  });

  it("rejects an unmatched opening parenthesis", () => {
    expect(() => parseFormatString("(abc")).toThrow(/Unmatched/);
  });

  it("rejects a bracket group with no style", () => {
    expect(() => parseFormatString("[abc]")).toThrow(/Unmatched/);
  });

  it("reports the offending index without throwing in the lenient variant", () => {
    const result = tryParseFormatString("abc]");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.index).toBe(3);
  });

  it("parses starship's default directory format", () => {
    const parsed = parseFormatString(
      "[$path]($style)[$read_only]($read_only_style) ",
    );
    expect(parsed).toHaveLength(3);
    expect(parsed[2]).toEqual(text(" "));
  });

  it("parses an empty text group, which is meaningful for prev_fg", () => {
    expect(parseFormatString("[](red)")).toEqual([
      { type: "textGroup", format: [], style: [{ type: "text", value: "red" }] },
    ]);
  });
});

describe("collectVariables", () => {
  it("finds variables inside conditionals and text groups", () => {
    const parsed = parseFormatString("($a[$b](red))");
    expect(collectVariables(parsed).sort()).toEqual(["a", "b"]);
  });

  it("excludes style variables, so they cannot trigger a conditional", () => {
    const parsed = parseFormatString("([x]($style))");
    expect(collectVariables(parsed)).toEqual([]);
    expect(collectStyleVariables(parsed)).toEqual(["style"]);
  });
});
