import { renderMeta } from "./shared";
import { type ModuleDefinition, optString } from "./types";

export const container: ModuleDefinition = {
  name: "container",
  defaults: {
    format: "[$symbol \\[$name\\]]($style) ",
    symbol: "⬢",
    style: "red bold dimmed",
    disabled: false,
  },
  evaluate(options, ctx) {
    // Upstream sniffs `/run/.containerenv`, `/.dockerenv` and friends to name
    // the runtime; the scenario states it outright.
    const name = ctx.scenario.container?.name;
    if (name === undefined) return null;

    return {
      variables: { symbol: renderMeta(optString(options, "symbol"), ctx), name },
    };
  },
};
