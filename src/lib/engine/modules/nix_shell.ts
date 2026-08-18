/**
 * `nix_shell` — whether the shell is inside a nix-shell, and which kind.
 *
 * Port of `src/modules/nix_shell.rs`.
 */

import { type ModuleDefinition, optBool, optString } from "./types";

export const nixShell: ModuleDefinition = {
  name: "nix_shell",
  defaults: {
    format: "via [$symbol$state( \\($name\\))]($style) ",
    // The trailing double space works around multiwidth emoji handling in some
    // shells; starship documents it as deliberate, so it is preserved verbatim.
    symbol: "❄️  ",
    style: "bold blue",
    impure_msg: "impure",
    pure_msg: "pure",
    unknown_msg: "",
    disabled: false,
    heuristic: false,
  },

  evaluate(options, { scenario }) {
    const nix = scenario.nix;

    let state: string;
    let name: string | undefined;

    if (nix) {
      state = optString(options, nix.impure ? "impure_msg" : "pure_msg");
      name = nix.name;
    } else if (optBool(options, "heuristic") && inNewNixShell(scenario.env.PATH)) {
      // `nix shell` (as opposed to `nix-shell`) leaves no marker beyond store
      // paths on PATH, so its purity is unknowable — hence `unknown_msg`.
      state = optString(options, "unknown_msg");
      name = scenario.env.name;
    } else {
      return null;
    }

    return {
      variables: {
        symbol: optString(options, "symbol"),
        state,
        name,
        level: scenario.env.NIX_SHELL_LEVEL,
      },
    };
  },
};

function inNewNixShell(path: string | undefined): boolean {
  if (path === undefined) return false;
  return path.split(":").some((entry) => entry.startsWith("/nix/store"));
}
