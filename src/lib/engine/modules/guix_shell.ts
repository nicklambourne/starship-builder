/**
 * `guix_shell` — whether the shell is inside a guix shell.
 *
 * Port of `src/modules/guix_shell.rs`.
 */

import { type ModuleDefinition, optString } from "./types";

export const guixShell: ModuleDefinition = {
  name: "guix_shell",
  defaults: {
    format: "via [$symbol]($style) ",
    symbol: "🐃 ",
    style: "yellow bold",
    disabled: false,
  },

  evaluate(options, { scenario }) {
    if (scenario.env.GUIX_ENVIRONMENT === undefined) return null;

    return { variables: { symbol: optString(options, "symbol") } };
  },
};
