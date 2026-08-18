import { describe, expect, it } from "vitest";

import { fromItems, itemLabel, moveItem, toItems } from "./formatItems";
import { parseFormatString, printFormat } from "@/lib/engine/formatString";

describe("toItems", () => {
  it("flattens bare variables and text", () => {
    expect(toItems("$a b$c")).toEqual([
      { kind: "module", name: "a" },
      { kind: "text", value: " b" },
      { kind: "module", name: "c" },
    ]);
  });

  it("recognises a styled module", () => {
    expect(toItems("[$directory](bold cyan)")).toEqual([
      { kind: "module", name: "directory", style: "bold cyan" },
    ]);
  });

  it("recognises styled literal text", () => {
    expect(toItems("[ on ](dimmed)")).toEqual([
      { kind: "text", value: " on ", style: "dimmed" },
    ]);
  });

  it("keeps a conditional verbatim as a raw piece", () => {
    const items = toItems("($a via $b)");
    expect(items).toHaveLength(1);
    expect(items?.[0].kind).toBe("raw");
  });

  it("keeps a group mixing text and variables as raw", () => {
    const items = toItems("[on $branch](purple)");
    expect(items?.[0].kind).toBe("raw");
  });

  it("returns null for an unparseable format", () => {
    expect(toItems("[oops")).toBeNull();
  });
});

describe("fromItems", () => {
  it("round-trips a plain format", () => {
    const format = "$directory$git_branch ";
    expect(fromItems(toItems(format)!)).toBe(format);
  });

  it("round-trips styles", () => {
    const format = "[$directory](bold cyan)[ on ](dimmed)";
    expect(fromItems(toItems(format)!)).toBe(format);
  });

  it("preserves raw pieces it cannot model", () => {
    // The conditional must survive editing around it untouched.
    const format = "$directory(via $nodejs)$character";
    const items = toItems(format)!;
    expect(fromItems(items)).toBe(format);
  });

  it("escapes text that would otherwise be syntax", () => {
    const round = fromItems([{ kind: "text", value: "a[b]$c" }]);
    expect(toItems(round)).toEqual([{ kind: "text", value: "a[b]$c" }]);
  });

  it("braces a variable name that needs it", () => {
    expect(fromItems([{ kind: "module", name: "env_var.HOME" }])).toBe(
      "${env_var.HOME}",
    );
  });

  it("survives a reorder without corrupting neighbours", () => {
    const items = toItems("$a[ x ](red)$b")!;
    expect(fromItems(moveItem(items, 0, 1))).toBe("[ x ](red)$a$b");
  });
});

describe("moveItem", () => {
  it("is a no-op at the boundaries", () => {
    const items = toItems("$a$b")!;
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(moveItem(items, 1, 1)).toBe(items);
  });
});

describe("itemLabel", () => {
  it("describes whitespace by length rather than showing nothing", () => {
    expect(itemLabel({ kind: "text", value: "  " })).toBe("space × 2");
  });

  it("calls out $all", () => {
    expect(itemLabel({ kind: "module", name: "all" })).toContain("every other module");
  });
});

describe("printFormat", () => {
  it("round-trips every construct in the grammar", () => {
    const format = "[a $b](red)(c$d)\\$e${f.g}";
    expect(printFormat(parseFormatString(format))).toBe(format);
  });
});
