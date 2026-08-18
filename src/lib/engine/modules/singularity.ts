/**
 * `singularity` — the Singularity/Apptainer image the shell is running in.
 *
 * Port of `src/modules/singularity.rs`.
 */

import { type ModuleDefinition, optString } from "./types";

export const singularity: ModuleDefinition = {
  name: "singularity",
  defaults: {
    format: "[$symbol\\[$env\\]]($style) ",
    symbol: "",
    style: "blue bold dimmed",
    disabled: false,
  },

  evaluate(options, { scenario }) {
    const image = scenario.env.SINGULARITY_NAME;
    if (image === undefined) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        // The format variable is literally `$env`, not `$name`.
        env: image,
      },
    };
  },
};
