/**
 * `vcsh` — the active vcsh repository.
 *
 * Port of `src/modules/vcsh.rs`.
 */

import { type ModuleDefinition, optString } from "./types";

export const vcsh: ModuleDefinition = {
  name: "vcsh",
  defaults: {
    symbol: "",
    style: "bold yellow",
    format: "vcsh [$symbol$repo]($style) ",
    disabled: false,
  },

  evaluate(options, { scenario }) {
    const repo = scenario.env.VCSH_REPO_NAME ?? "";
    if (repo.trim().length === 0) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        repo,
      },
    };
  },
};
