/**
 * `spack` — the active Spack environment.
 *
 * Port of `src/modules/spack.rs`.
 */

import { truncateComponents } from "./cloudUtils";
import { type ModuleDefinition, optNumber, optString } from "./types";

export const spack: ModuleDefinition = {
  name: "spack",
  defaults: {
    truncation_length: 1,
    format: "via [$symbol$environment]($style) ",
    symbol: "🅢 ",
    style: "blue bold",
    disabled: false,
  },

  evaluate(options, { scenario }) {
    const environment = scenario.env.SPACK_ENV ?? "";
    if (environment.trim().length === 0) return null;

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
