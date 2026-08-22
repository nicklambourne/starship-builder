import { describe, expect, it } from "vitest";
import { describeOption } from "./options";
import { ALL_MODULES } from "@/lib/engine/modules";
import { getModuleSchema } from "./schema";

/**
 * Options the builder shows that starship does not accept.
 *
 * The engine needs a format string for these two to render at all, and it
 * lives in the same `defaults` map every real option comes from — so they
 * surface as rows. They are not in starship's schema or its documentation,
 * so there is nothing truthful to say about them here.
 */
const NOT_STARSHIP_OPTIONS = new Set(["fill.format", "line_break.format"]);

describe("option documentation", () => {
  it("explains every option the settings form shows", () => {
    const undescribed: string[] = [];
    for (const module of ALL_MODULES) {
      for (const key of Object.keys(module.defaults)) {
        // `disabled` is the module's switch, not a row.
        if (key === "disabled") continue;
        if (NOT_STARSHIP_OPTIONS.has(`${module.name}.${key}`)) continue;
        if (!describeOption(module.name, key)) undescribed.push(`${module.name}.${key}`);
      }
    }
    expect(undescribed).toEqual([]);
  });

  it("keeps the exemptions honest", () => {
    // If starship gains these, the exemption should go rather than linger.
    for (const entry of NOT_STARSHIP_OPTIONS) {
      const [module, key] = entry.split(".");
      const keys = getModuleSchema(module)?.options.map((o) => o.key) ?? [];
      expect(`${entry}: ${keys.includes(key)}`).toBe(`${entry}: false`);
    }
  });

  it("reads the module's own table", () => {
    expect(describeOption("username", "show_always")).toBe(
      "Always shows the username module.",
    );
    expect(describeOption("username", "style_root")).toBe(
      "The style used when the user is root/admin.",
    );
    // Same option name, different module, different text.
    expect(describeOption("git_branch", "format")).not.toBe(
      describeOption("username", "format"),
    );
  });

  it("has nothing to say about a key that is not an option", () => {
    expect(describeOption("username", "nonsense")).toBeUndefined();
    expect(describeOption("not_a_module", "format")).toBeUndefined();
  });
});
