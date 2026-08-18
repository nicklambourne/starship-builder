import { renderMeta } from "./shared";
import { type ModuleDefinition, optNumber, optString } from "./types";

export const jobs: ModuleDefinition = {
  name: "jobs",
  defaults: {
    threshold: 1,
    symbol_threshold: 1,
    number_threshold: 2,
    format: "[$symbol$number]($style) ",
    symbol: "✦",
    style: "bold blue",
    disabled: false,
  },
  evaluate(options, ctx) {
    const threshold = optNumber(options, "threshold", 1);
    const symbolThreshold = optNumber(options, "symbol_threshold", 1);
    const numberThreshold = optNumber(options, "number_threshold", 2);

    if (threshold < 0 || symbolThreshold < 0 || numberThreshold < 0) return null;

    const count = ctx.scenario.jobs;
    if (count === 0 && threshold > 0 && numberThreshold > 0 && symbolThreshold > 0) {
      return null;
    }

    let symbol = "";
    let number = "";

    if (threshold === 1) {
      if (count >= symbolThreshold) symbol = optString(options, "symbol");
      if (count >= numberThreshold) number = String(count);
    } else {
      // `threshold` is deprecated upstream; this branch mirrors its behaviour.
      if (count > 0) symbol = optString(options, "symbol");
      if (count > threshold || threshold === 0) {
        symbol = optString(options, "symbol");
        number = String(count);
      }
    }

    return { variables: { symbol: renderMeta(symbol, ctx), number } };
  },
};
