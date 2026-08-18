import type { Scenario } from "@/lib/scenarios/types";
import { renderMeta } from "./shared";
import { type ModuleDefinition, optString } from "./types";

type EditMode = "insert" | "normal" | "visual" | "replace" | "replace_one";

/**
 * Which vi mode a keymap means, per shell.
 *
 * Starship reads raw shell keymap names (zsh's `vicmd`, fish's `default`), and
 * only fish reports visual/replace modes at all; every other shell falls back
 * to insert. The scenario already carries normalised names, so the shell gate
 * is all that remains.
 */
function editMode(shell: Scenario["shell"], keymap: Scenario["keymap"]): EditMode {
  switch (shell) {
    case "fish":
      return keymap;
    case "zsh":
    case "cmd":
    case "powershell":
    case "pwsh":
      return keymap === "normal" ? "normal" : "insert";
    default:
      return "insert";
  }
}

export const character: ModuleDefinition = {
  name: "character",
  defaults: {
    format: "$symbol ",
    success_symbol: "[❯](bold green)",
    error_symbol: "[❯](bold red)",
    vimcmd_symbol: "[❮](bold green)",
    vimcmd_visual_symbol: "[❮](bold yellow)",
    vimcmd_replace_symbol: "[❮](bold purple)",
    vimcmd_replace_one_symbol: "[❮](bold purple)",
    disabled: false,
  },
  evaluate(options, ctx) {
    const { scenario } = ctx;
    const mode = editMode(scenario.shell, scenario.keymap);

    const symbolOption = (() => {
      switch (mode) {
        case "normal":
          return "vimcmd_symbol";
        case "visual":
          return "vimcmd_visual_symbol";
        case "replace":
          return "vimcmd_replace_symbol";
        case "replace_one":
          return "vimcmd_replace_one_symbol";
        case "insert":
          return scenario.status === 0 ? "success_symbol" : "error_symbol";
      }
    })();

    return {
      variables: { symbol: renderMeta(optString(options, symbolOption), ctx) },
    };
  },
};
