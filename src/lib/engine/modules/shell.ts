import { renderMeta, optOptionalString } from "./shared";
import { type ModuleDefinition, type ModuleOptions, optString } from "./types";
import type { Scenario } from "@/lib/scenarios/types";

/** `pwsh` falls back to the PowerShell indicator when unset. */
function indicatorFor(shell: Scenario["shell"], options: ModuleOptions): string {
  if (shell === "pwsh") {
    return optOptionalString(options, "pwsh_indicator") ?? optString(options, "powershell_indicator");
  }
  return optString(options, `${shell}_indicator`);
}

export const shell: ModuleDefinition = {
  name: "shell",
  defaults: {
    format: "[$indicator]($style) ",
    bash_indicator: "bsh",
    fish_indicator: "fsh",
    zsh_indicator: "zsh",
    powershell_indicator: "psh",
    pwsh_indicator: undefined,
    ion_indicator: "ion",
    elvish_indicator: "esh",
    tcsh_indicator: "tsh",
    nu_indicator: "nu",
    xonsh_indicator: "xsh",
    cmd_indicator: "cmd",
    unknown_indicator: "",
    style: "white bold",
    disabled: true,
  },
  evaluate(options, ctx) {
    return {
      variables: {
        indicator: renderMeta(indicatorFor(ctx.scenario.shell, options), ctx),
        bash_indicator: optString(options, "bash_indicator"),
        fish_indicator: optString(options, "fish_indicator"),
        zsh_indicator: optString(options, "zsh_indicator"),
        powershell_indicator: optString(options, "powershell_indicator"),
        pwsh_indicator: optOptionalString(options, "pwsh_indicator"),
        ion_indicator: optString(options, "ion_indicator"),
        elvish_indicator: optString(options, "elvish_indicator"),
        tcsh_indicator: optString(options, "tcsh_indicator"),
        xonsh_indicator: optString(options, "xonsh_indicator"),
        cmd_indicator: optString(options, "cmd_indicator"),
        unknown_indicator: optString(options, "unknown_indicator"),
      },
    };
  },
};
