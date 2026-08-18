import { describe, expect, it } from "vitest";

import { type FormatItem, fromItems, toItems } from "./formatItems";
import {
  adjustAfterRemoval,
  appendInto,
  getAt,
  insertAt,
  isAncestor,
  moveTo,
  nudge,
  removeAt,
  updateAt,
} from "./formatTree";

const parse = (format: string) => toItems(format)!;

describe("path addressing", () => {
  it("reads a nested item", () => {
    const items = parse("$a[$b$c]()");
    expect(getAt(items, [1, 1])).toEqual({ kind: "module", name: "c" });
  });

  it("returns undefined for a path through a non-group", () => {
    expect(getAt(parse("$a$b"), [0, 0])).toBeUndefined();
  });

  it("removes a nested item", () => {
    expect(fromItems(removeAt(parse("$a[$b$c]()"), [1, 0]))).toBe("$a[$c]()");
  });

  it("drops a group left empty by a removal", () => {
    // Built by hand: a group wrapping a single variable round-trips through
    // the parser as a *styled module*, so it cannot be written as a format
    // string. `[]()` renders nothing but would linger in the format string.
    const items: FormatItem[] = [
      { kind: "module", name: "a" },
      { kind: "group", items: [{ kind: "module", name: "b" }] },
    ];
    expect(fromItems(removeAt(items, [1, 0]))).toBe("$a");
  });

  it("updates a nested item in place", () => {
    const items = updateAt(parse("[$a$b]()"), [0, 1], (item) => ({
      ...item,
      style: "red",
    }));
    expect(fromItems(items)).toBe("[$a[$b](red)]()");
  });

  it("inserts at a nested position", () => {
    const items = insertAt(parse("[$a$c]()"), [0, 1], {
      kind: "module",
      name: "b",
    });
    expect(fromItems(items)).toBe("[$a$b$c]()");
  });

  it("appends into a group", () => {
    expect(fromItems(appendInto(parse("[$a]()$b"), [0], { kind: "module", name: "c" })))
      .toBe("[$a$c]()$b");
  });
});

describe("adjustAfterRemoval", () => {
  it("shifts a later sibling down", () => {
    expect(adjustAfterRemoval([3], [1])).toEqual([2]);
  });

  it("leaves an earlier sibling alone", () => {
    expect(adjustAfterRemoval([0], [1])).toEqual([0]);
  });

  it("shifts a path that runs through a later sibling", () => {
    expect(adjustAfterRemoval([3, 2], [1])).toEqual([2, 2]);
  });

  it("leaves an unrelated branch alone", () => {
    expect(adjustAfterRemoval([0, 5], [1, 0])).toEqual([0, 5]);
  });
});

describe("moveTo", () => {
  it("reorders within one list", () => {
    expect(fromItems(moveTo(parse("$a$b$c"), [0], [2], "after"))).toBe("$b$c$a");
  });

  it("accounts for the gap when moving forwards", () => {
    expect(fromItems(moveTo(parse("$a$b$c"), [0], [1], "after"))).toBe("$b$a$c");
  });

  it("moves an item into a group", () => {
    expect(fromItems(moveTo(parse("[$a]()$b"), [1], [0], "into"))).toBe("[$a$b]()");
  });

  it("moves an item out of a group to the top level", () => {
    expect(fromItems(moveTo(parse("[$a$b]()$c"), [0, 1], [1], "after"))).toBe(
      "[$a]()$c$b",
    );
  });

  it("moves an item between two groups", () => {
    expect(fromItems(moveTo(parse("[$a$b]()[$c]()"), [0, 0], [1], "into"))).toBe(
      "[$b]()[$c$a]()",
    );
  });

  it("reorders within a nested group", () => {
    expect(fromItems(moveTo(parse("[$a$b$c]()"), [0, 2], [0, 0], "before"))).toBe(
      "[$c$a$b]()",
    );
  });

  it("refuses to drop a group into its own descendant", () => {
    // Allowing this would detach the subtree from the document entirely.
    const items = parse("[$a[$b]()]()");
    expect(isAncestor([0], [0, 1])).toBe(true);
    expect(moveTo(items, [0], [0, 1], "into")).toBe(items);
  });

  it("is a no-op when dropped on itself", () => {
    const items = parse("$a$b");
    expect(moveTo(items, [0], [0], "into")).toBe(items);
  });
});

describe("nudge", () => {
  it("moves an item one step later within its parent", () => {
    expect(fromItems(nudge(parse("[$a$b$c]()"), [0, 0], 1))).toBe("[$b$a$c]()");
  });

  it("moves an item one step earlier", () => {
    expect(fromItems(nudge(parse("$a$b$c"), [2], -1))).toBe("$a$c$b");
  });

  it("stops at the start of its parent rather than escaping the group", () => {
    const items = parse("[$a$b]()");
    expect(nudge(items, [0, 0], -1)).toBe(items);
  });
});
