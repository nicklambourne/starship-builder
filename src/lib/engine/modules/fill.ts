import { type ModuleDefinition, optString } from "./types";

export const fill: ModuleDefinition = {
  name: "fill",
  defaults: {
    // Like `line_break`, starship's `fill` has no `format` option: it emits one
    // fill segment carrying `symbol`, styled with `style`. The synthetic format
    // below reproduces that — the fill segment leaves its style unset so the
    // text group applies `$style` to it.
    format: "[$fill]($style)",
    style: "bold black",
    symbol: ".",
    disabled: false,
  },
  evaluate(options) {
    return {
      variables: {
        fill: { segments: [{ kind: "fill", value: optString(options, "symbol") }] },
      },
    };
  },
};
