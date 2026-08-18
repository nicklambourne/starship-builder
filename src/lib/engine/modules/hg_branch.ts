/**
 * `hg_branch` — the active Mercurial bookmark or branch.
 *
 * Port of `src/modules/hg_branch.rs`. Starship reads `.hg/bookmarks.current`,
 * `.hg/branch` and `.hg/topic`, falling back to "default" when none is
 * readable. The scenario lists only the cwd's entries, so `.hg` is used to
 * detect the check-out and the "default" fallback is what gets rendered.
 */

import { truncateText } from "./cloudUtils";
import { type ModuleDefinition, optNumber, optString } from "./types";

export const hgBranch: ModuleDefinition = {
  name: "hg_branch",
  defaults: {
    // Nerd Font U+E0A0 (branch), escaped so the glyph survives tooling.
    symbol: "\uE0A0 ",
    style: "bold purple",
    format: "on [$symbol$branch(:$topic)]($style) ",
    // Starship's default is i64::MAX, i.e. "never truncate".
    truncation_length: Number.MAX_SAFE_INTEGER,
    truncation_symbol: "…",
    disabled: true,
  },

  evaluate(options, { scenario }) {
    const isHgRepo =
      scenario.files.includes(".hg") || scenario.files.includes(".hg/");
    if (!isHgRepo) return null;

    const configured = optNumber(options, "truncation_length", Number.MAX_SAFE_INTEGER);
    const length = configured <= 0 ? Number.MAX_SAFE_INTEGER : configured;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        branch: truncateText("default", length, optString(options, "truncation_symbol")),
        // `.hg/topic` is not visible in a scenario, so the topic is never set.
        topic: undefined,
      },
    };
  },
};
