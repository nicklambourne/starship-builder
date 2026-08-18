import { describe, expect, it } from "vitest";

import {
  fromItems,
  gatherCategory,
  groupRange,
  groupableCategories,
  itemLabel,
  moveItem,
  reorderItem,
  toItems,
  ungroup,
} from "./formatItems";
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

  it("turns a group mixing text and variables into an editable group", () => {
    const items = toItems("[on $branch](purple)");
    expect(items).toEqual([
      {
        kind: "group",
        style: "purple",
        items: [
          { kind: "text", value: "on " },
          { kind: "module", name: "branch" },
        ],
      },
    ]);
  });

  it("still keeps a group containing a conditional as raw", () => {
    // Conditionals have no flat representation, so the group stays verbatim.
    expect(toItems("[a($b)](red)")?.[0].kind).toBe("raw");
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

describe("grouping", () => {
  it("wraps a contiguous run and round-trips through the format string", () => {
    const items = toItems("$git_branch$git_status$directory")!;
    const grouped = groupRange(items, 0, 1, "bold purple");
    expect(grouped).toHaveLength(2);
    expect(fromItems(grouped)).toBe("[$git_branch$git_status](bold purple)$directory");
    expect(toItems(fromItems(grouped))).toEqual(grouped);
  });

  it("ungroups back to the original sequence", () => {
    const items = toItems("$a$b$c")!;
    expect(ungroup(groupRange(items, 0, 1), 0)).toEqual(items);
  });

  it("refuses an out-of-range range rather than corrupting the format", () => {
    const items = toItems("$a$b")!;
    expect(groupRange(items, 1, 5)).toBe(items);
    expect(groupRange(items, 1, 0)).toBe(items);
  });

  it("gathers a category's modules into one group at the first occurrence", () => {
    // Build tools are interleaved among the languages in starship's real
    // order, which is exactly why contiguous-only grouping is not enough.
    const items = toItems("$nodejs$cmake$python$gradle$directory")!;
    const categories: Record<string, string> = {
      nodejs: "Languages",
      python: "Languages",
      cmake: "Build Tools",
      gradle: "Build Tools",
      directory: "Core",
    };
    const grouped = gatherCategory(items, (n) => categories[n], "Build Tools");
    expect(fromItems(grouped)).toBe("$nodejs[$cmake$gradle]()$python$directory");
  });

  it("leaves a category with a single module alone", () => {
    const items = toItems("$nodejs$directory")!;
    const grouped = gatherCategory(
      items,
      (n) => (n === "nodejs" ? "Languages" : "Core"),
      "Languages",
    );
    expect(grouped).toBe(items);
  });

  it("only offers categories with something to group", () => {
    const items = toItems("$nodejs$python$directory")!;
    const categories: Record<string, string> = {
      nodejs: "Languages",
      python: "Languages",
      directory: "Core",
    };
    expect(groupableCategories(items, (n) => categories[n])).toEqual(["Languages"]);
  });
});

describe("reorderItem", () => {
  it("moves an item to an arbitrary index, as a drag does", () => {
    const items = toItems("$a$b$c")!;
    expect(fromItems(reorderItem(items, 0, 2))).toBe("$b$c$a");
    expect(fromItems(reorderItem(items, 2, 0))).toBe("$c$a$b");
  });

  it("is a no-op when dropped on itself", () => {
    const items = toItems("$a$b")!;
    expect(reorderItem(items, 1, 1)).toBe(items);
  });
});
