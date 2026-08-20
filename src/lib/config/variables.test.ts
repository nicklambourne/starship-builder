import { describe, expect, it } from "vitest";
import { describeVariable, variableDoc } from "./variables";
import { ALL_MODULES } from "@/lib/engine/modules";
import { collectVariables, tryParseFormatString } from "@/lib/engine/formatString";
import { getScenario } from "@/lib/scenarios";

/**
 * The variables the builder offers for a module: whatever its evaluation
 * binds, plus whatever its default format refers to. Mirrors `variablesFor`
 * in Builder, which is what fills the format editor's list.
 */
function variablesOffered(module: (typeof ALL_MODULES)[number]): string[] {
  let bound: string[] = [];
  try {
    const result = module.evaluate(module.defaults, {
      scenario: getScenario("dirty-repo"),
      rootConfig: {},
    });
    bound = result ? Object.keys(result.variables) : [];
  } catch {
    bound = [];
  }
  const parsed = tryParseFormatString(module.defaults.format);
  return [...new Set([...bound, ...(parsed.ok ? collectVariables(parsed.elements) : [])])];
}

describe("variable documentation", () => {
  it("explains every variable the format editor can offer", () => {
    const undocumented: string[] = [];
    for (const module of ALL_MODULES) {
      for (const variable of variablesOffered(module)) {
        if (!variableDoc(module.name, variable)) undocumented.push(`${module.name}.$${variable}`);
      }
    }
    expect(undocumented).toEqual([]);
  });

  it("reads the module's own documentation, not a neighbour's", () => {
    // Keyed by documentation anchor, so a module whose heading does not
    // slugify to its name — "Node.js" anchors at `node-js` — still resolves.
    expect(variableDoc("nodejs", "engines_version")?.description).toContain("engines");
    expect(variableDoc("git_branch", "remote_name")?.description).toBe("The remote name.");
    expect(variableDoc("aws", "duration")?.example).toBe("2h27m20s");
  });

  it("appends the documented example, which often settles the question", () => {
    expect(describeVariable("aws", "duration")).toBe(
      "The temporary credentials validity duration (e.g. 2h27m20s)",
    );
    // Nothing to append when upstream leaves the example column empty.
    expect(describeVariable("git_branch", "symbol")).toBe(
      "Mirrors the value of option symbol",
    );
    // Nor when the description already carries one.
    expect(describeVariable("git_branch", "branch")).toBe(
      "The current branch name, falls back to HEAD if there's no current branch (e.g. git detached HEAD).",
    );
  });

  it("has nothing to say about a variable that is not one", () => {
    expect(variableDoc("git_branch", "nonsense")).toBeUndefined();
    expect(variableDoc("not_a_module", "branch")).toBeUndefined();
  });
});
