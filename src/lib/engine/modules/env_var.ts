import { optOptionalString, renderMeta } from "./shared";
import { type ModuleDefinition, optString } from "./types";

/**
 * `env_var` is a *table* module: a config may declare `[env_var.FOO]`, in which
 * case the module is named `env_var.FOO` and reads `$FOO` unless `variable`
 * overrides it. A bare `[env_var]` table is also valid, but only when it sets
 * `variable` itself.
 *
 * `createEnvVarModule("FOO")` builds the definition for one such instance — the
 * registry calls it once per key it finds under `env_var` — and the exported
 * `env_var` is the keyless instance.
 */
export function createEnvVarModule(key?: string): ModuleDefinition {
  return {
    name: key === undefined ? "env_var" : `env_var.${key}`,
    defaults: {
      symbol: "",
      style: "black bold dimmed",
      variable: undefined,
      default: undefined,
      format: "with [$symbol$env_value]($style) ",
      disabled: false,
      description: "<env_var module>",
    },
    evaluate(options, ctx) {
      const variable = optOptionalString(options, "variable") ?? key;
      if (variable === undefined) return null;

      const value = ctx.scenario.env[variable] ?? optOptionalString(options, "default");
      if (value === undefined) return null;

      return {
        variables: {
          symbol: renderMeta(optString(options, "symbol"), ctx),
          env_value: value,
        },
      };
    },
  };
}

export const env_var = createEnvVarModule();
