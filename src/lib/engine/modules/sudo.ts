import { renderMeta } from "./shared";
import { type ModuleDefinition, optString } from "./types";

export const sudo: ModuleDefinition = {
  name: "sudo",
  defaults: {
    format: "[as $symbol]($style)",
    symbol: "🧙 ",
    style: "bold blue",
    allow_windows: false,
    disabled: true,
    use_legacy_check: false,
  },
  evaluate(options, ctx) {
    // Starship shells out to `sudo -Nnv` and hides the module unless the
    // credentials are already cached. There is nothing to probe here, so an
    // enabled `sudo` module is treated as a cached one.
    return { variables: { symbol: renderMeta(optString(options, "symbol"), ctx) } };
  },
};
