/**
 * `conda` — the active Conda environment.
 *
 * Port of `src/modules/conda.rs`.
 */

import { detectEnvVars, truncateComponents } from "./cloudUtils";
import { type ModuleDefinition, optBool, optNumber, optString, optStringArray } from "./types";

export const conda: ModuleDefinition = {
  name: "conda",
  defaults: {
    truncation_length: 1,
    format: "via [$symbol$environment]($style) ",
    symbol: "🅒 ",
    style: "green bold",
    ignore_base: true,
    // Negated: pixi sets this and owns the prompt when it does.
    detect_env_vars: ["!PIXI_ENVIRONMENT_NAME"],
    disabled: false,
  },

  evaluate(options, { scenario }) {
    const environment = scenario.conda?.environment ?? "";
    if (environment.trim().length === 0) return null;

    if (optBool(options, "ignore_base", true) && environment === "base") return null;
    if (!detectEnvVars(scenario, optStringArray(options, "detect_env_vars"))) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        environment: truncateComponents(
          environment,
          optNumber(options, "truncation_length", 1),
        ),
      },
    };
  },
};
