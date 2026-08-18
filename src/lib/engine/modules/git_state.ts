import type { GitState } from "@/lib/scenarios/types";
import { renderMeta } from "./shared";
import { type ModuleDefinition, optString } from "./types";

/**
 * The scenario models the five states git reports through `.git`; starship also
 * distinguishes `am` and `am_or_rebase` (patch application), which has no
 * scenario representation — those options stay configurable but unreachable.
 */
function labelOption(state: NonNullable<GitState["state"]>): string {
  switch (state) {
    case "REBASING":
      return "rebase";
    case "MERGING":
      return "merge";
    case "CHERRY_PICKING":
      return "cherry_pick";
    case "BISECTING":
      return "bisect";
    case "REVERTING":
      return "revert";
  }
}

export const git_state: ModuleDefinition = {
  name: "git_state",
  defaults: {
    rebase: "REBASING",
    merge: "MERGING",
    revert: "REVERTING",
    cherry_pick: "CHERRY-PICKING",
    bisect: "BISECTING",
    am: "AM",
    am_or_rebase: "AM/REBASE",
    style: "bold yellow",
    format: "\\([$state( $progress_current/$progress_total)]($style)\\) ",
    disabled: false,
  },
  evaluate(options, ctx) {
    const repo = ctx.scenario.git;
    if (!repo?.state) return null;

    // Only rebase (and patch application, which the scenario cannot express)
    // reports progress upstream; the other states have no counters.
    const progress = repo.state === "REBASING" ? repo.stateProgress : undefined;

    return {
      variables: {
        state: renderMeta(optString(options, labelOption(repo.state)), ctx),
        progress_current: progress ? String(progress.current) : undefined,
        progress_total: progress ? String(progress.total) : undefined,
      },
    };
  },
};
