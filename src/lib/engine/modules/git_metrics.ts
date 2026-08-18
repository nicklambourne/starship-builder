import { type ModuleDefinition, optBool, optString } from "./types";

export const git_metrics: ModuleDefinition = {
  name: "git_metrics",
  defaults: {
    added_style: "bold green",
    deleted_style: "bold red",
    only_nonzero_diffs: true,
    format: "([+$added]($added_style) )([-$deleted]($deleted_style) )",
    disabled: true,
    ignore_submodules: false,
  },
  evaluate(options, ctx) {
    if (!ctx.scenario.git) return null;

    // `git diff --shortstat` has no scenario equivalent — the mocked repository
    // records file-level counts, not line-level ones — so both counters read
    // zero, which `only_nonzero_diffs` (on by default) hides.
    const added = "0";
    const deleted = "0";
    const onlyNonzero = optBool(options, "only_nonzero_diffs", true);

    return {
      variables: {
        added: onlyNonzero && added === "0" ? undefined : added,
        deleted: onlyNonzero && deleted === "0" ? undefined : deleted,
      },
      styleVariables: {
        added_style: optString(options, "added_style"),
        deleted_style: optString(options, "deleted_style"),
      },
    };
  },
};
