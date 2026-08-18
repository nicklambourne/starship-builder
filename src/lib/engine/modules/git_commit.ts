import { type ModuleDefinition, optBool, optNumber, optString } from "./types";

export const git_commit: ModuleDefinition = {
  name: "git_commit",
  defaults: {
    // Consistent with git, whose DEFAULT_ABBREV is 7.
    commit_hash_length: 7,
    format: "[\\($hash$tag\\)]($style) ",
    style: "green bold",
    only_detached: true,
    disabled: false,
    tag_symbol: " 🏷  ",
    tag_disabled: true,
    tag_max_candidates: 0,
  },
  evaluate(options, ctx) {
    const repo = ctx.scenario.git;
    if (!repo) return null;

    if (optBool(options, "only_detached", true) && !repo.detached) return null;

    const hashLength = optNumber(options, "commit_hash_length", 7);
    const tagDisabled = optBool(options, "tag_disabled", true);

    return {
      variables: {
        hash: repo.commit.slice(0, hashLength),
        tag: !tagDisabled && repo.tag ? `${optString(options, "tag_symbol")}${repo.tag}` : undefined,
      },
    };
  },
};
