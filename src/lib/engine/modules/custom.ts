import type { Scenario } from "@/lib/scenarios/types";
import { optOptionalString, renderMeta } from "./shared";
import { detects, type ModuleDefinition, optBool, optString } from "./types";

/** Rust's `env::consts::OS` for the scenario's operating system. */
function osConst(scenario: Scenario): string {
  switch (scenario.os?.type) {
    case "Macos":
      return "macos";
    case "Windows":
      return "windows";
    default:
      return "linux";
  }
}

function matchesOs(required: string, scenario: Scenario): boolean {
  const actual = osConst(scenario);
  return required === actual || (required === "unix" && actual !== "windows");
}

/**
 * `custom` is a *table* module: `[custom.foo]` defines a module named
 * `custom.foo`. `createCustomModule("foo")` builds that instance — the registry
 * calls it once per key under `custom` — and the exported `custom` is the
 * template the registry clones.
 *
 * Two behaviours cannot survive the trip into a browser, and are approximated:
 *
 *  - `command` never runs, so `$output` is always empty. The module still shows
 *    its symbol and style, which is what there is to configure.
 *  - a `when` *command* likewise cannot run; it is treated as succeeding, so a
 *    module gated only by `when` stays visible in the preview. A boolean `when`
 *    is honoured exactly.
 */
export function createCustomModule(name?: string): ModuleDefinition {
  return {
    name: name === undefined ? "custom" : `custom.${name}`,
    defaults: {
      format: "[$symbol($output )]($style)",
      symbol: "",
      command: "",
      when: false,
      require_repo: false,
      shell: [],
      description: "<custom config>",
      style: "green bold",
      disabled: false,
      detect_files: [],
      detect_extensions: [],
      detect_folders: [],
      os: undefined,
      use_stdin: undefined,
      ignore_timeout: false,
      unsafe_no_escape: false,
    },
    evaluate(options, ctx) {
      const { scenario } = ctx;

      const requiredOs = optOptionalString(options, "os");
      if (requiredOs !== undefined && !matchesOs(requiredOs, scenario)) return null;

      if (optBool(options, "require_repo") && !scenario.git) return null;

      const isMatch =
        detects(options, scenario) ||
        (typeof options.when === "string" ? true : optBool(options, "when"));
      if (!isMatch) return null;

      return {
        variables: {
          symbol: renderMeta(optString(options, "symbol"), ctx),
          output: undefined,
        },
      };
    },
  };
}

export const custom = createCustomModule();
