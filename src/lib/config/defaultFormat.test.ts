import { describe, expect, it } from "vitest";

import { DEFAULT_GROUPED_CATEGORIES, expandAll, structuredFormat } from "./defaultFormat";
import { MODULE_META } from "./meta";
import { PROMPT_ORDER } from "@/lib/engine/promptOrder";

const categoryOf = (name: string) => MODULE_META[name]?.group;

describe("expandAll", () => {
  it("replaces $all with every module not already named", () => {
    const expanded = expandAll("$directory$all$character", ["directory", "git_branch", "character"]);
    expect(expanded).toBe("$directory$git_branch$character");
  });

  it("leaves a format without $all untouched", () => {
    expect(expandAll("$directory$character", PROMPT_ORDER)).toBe("$directory$character");
  });
});

describe("structuredFormat", () => {
  const items = structuredFormat("$all", PROMPT_ORDER, categoryOf)!;

  it("opens on groups rather than a single opaque $all", () => {
    expect(items.length).toBeGreaterThan(1);
    expect(items.some((i) => i.kind === "group")).toBe(true);
  });

  it("groups exactly the intended categories", () => {
    const grouped = items.filter((i) => i.kind === "group");
    expect(grouped).toHaveLength(DEFAULT_GROUPED_CATEGORIES.length);
  });

  it("keeps character last, so the prompt still ends where it should", () => {
    // Core and System are deliberately not gathered for exactly this reason.
    const last = items[items.length - 1];
    expect(last.kind).toBe("module");
    if (last.kind !== "module") throw new Error("expected a module");
    expect(last.name).toBe("character");
  });

  it("includes every module exactly once", () => {
    const seen: string[] = [];
    const walk = (list: typeof items) => {
      for (const item of list) {
        if (item.kind === "module") seen.push(item.name);
        else if (item.kind === "group") walk(item.items);
      }
    };
    walk(items);
    expect(seen.slice().sort()).toEqual(PROMPT_ORDER.slice().sort());
  });
});
