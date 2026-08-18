/**
 * `azure` — the default Azure subscription.
 *
 * Port of `src/modules/azure.rs`.
 */

import { optAliasTable } from "./cloudUtils";
import { type ModuleDefinition, optString } from "./types";

export const azure: ModuleDefinition = {
  name: "azure",
  defaults: {
    format: "on [$symbol($subscription)]($style) ",
    symbol: "󰠅 ",
    style: "blue bold",
    disabled: true,
    subscription_aliases: {},
  },

  evaluate(options, { scenario }) {
    // starship reads the *default* subscription out of `azureProfile.json`; a
    // scenario without one is the same as a profile with no default entry.
    const subscription = scenario.azure?.subscription;
    if (subscription === undefined) return null;

    const aliases = optAliasTable(options, "subscription_aliases");

    return {
      variables: {
        symbol: optString(options, "symbol"),
        subscription: aliases[subscription] ?? subscription,
        username: scenario.azure?.username,
      },
    };
  },
};
