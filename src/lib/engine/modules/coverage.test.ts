import { describe, expect, it } from "vitest";

import { ALL_MODULES, MODULES_BY_NAME } from "./index";
import { PROMPT_ORDER } from "../promptOrder";

/**
 * Coverage guard.
 *
 * `PROMPT_ORDER` is generated verbatim from starship, so it is the ground truth
 * for which modules exist. A module in that list with no implementation renders
 * as nothing, silently — which is exactly the failure this test exists to catch.
 */
describe("module registry", () => {
  it("implements every module in starship's prompt order", () => {
    const missing = PROMPT_ORDER.filter((name) => !MODULES_BY_NAME.has(name));
    expect(missing).toEqual([]);
  });

  it("registers no duplicate module names", () => {
    const names = ALL_MODULES.map((m) => m.name);
    expect(names.length).toBe(new Set(names).size);
  });

  it("gives every module a format string and a disabled default", () => {
    for (const definition of ALL_MODULES) {
      expect(typeof definition.defaults.format, definition.name).toBe("string");
      expect(typeof definition.defaults.disabled, definition.name).toBe("boolean");
    }
  });

  it("returns either null or a variables object from every evaluate", () => {
    // A module must never throw on a scenario it does not apply to.
    const scenario = {
      id: "t",
      label: "t",
      description: "t",
      path: "/home/u",
      home: "/home/u",
      readOnly: false,
      files: [],
      status: 0,
      cmdDurationMs: 0,
      jobs: 0,
      username: "u",
      hostname: "h",
      ssh: false,
      isRoot: false,
      shell: "zsh" as const,
      keymap: "insert" as const,
      time: "2026-08-18T09:41:00",
      terminalWidth: 80,
      toolVersions: {},
      env: {},
    };

    for (const definition of ALL_MODULES) {
      const result = definition.evaluate(definition.defaults, {
        scenario,
        rootConfig: {},
      });
      if (result !== null) {
        expect(typeof result.variables, definition.name).toBe("object");
      }
    }
  });
});
