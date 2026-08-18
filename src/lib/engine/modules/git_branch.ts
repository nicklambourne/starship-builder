import { renderMeta } from "./shared";
import {
  type ModuleDefinition,
  optBool,
  optNumber,
  optString,
  optStringArray,
} from "./types";

/**
 * Truncates to `length` graphemes, appending the truncation symbol only when
 * something was actually cut. Grapheme clusters are approximated by code
 * points — the browser has no `unicode-segmentation`, and branch names beyond
 * the BMP are vanishingly rare.
 */
function truncateGraphemes(value: string, length: number, symbol: string): string {
  const chars = Array.from(value);
  if (length >= chars.length) return value;
  return chars.slice(0, length).join("") + symbol;
}

/** Starship truncates using only the first grapheme of `truncation_symbol`. */
function firstGrapheme(value: string): string {
  return Array.from(value)[0] ?? "";
}

export const git_branch: ModuleDefinition = {
  name: "git_branch",
  defaults: {
    format: "on [$symbol$branch(:$remote_branch)]($style) ",
    symbol: "\u{e0a0} ",
    style: "bold purple",
    // Starship's default is `i64::MAX`, i.e. "never truncate".
    truncation_length: Number.MAX_SAFE_INTEGER,
    truncation_symbol: "…",
    only_attached: false,
    always_show_remote: false,
    ignore_branches: [],
    ignore_bare_repo: false,
    disabled: false,
  },
  evaluate(options, ctx) {
    const repo = ctx.scenario.git;
    if (!repo) return null;

    if (optBool(options, "only_attached") && repo.detached) return null;

    const branch = repo.branch ?? "HEAD";
    if (optStringArray(options, "ignore_branches").includes(branch)) return null;

    const configured = optNumber(options, "truncation_length", Number.MAX_SAFE_INTEGER);
    const length = configured <= 0 ? Number.MAX_SAFE_INTEGER : configured;
    const symbol = firstGrapheme(optString(options, "truncation_symbol"));

    const branchName = truncateGraphemes(branch, length, symbol);
    const remoteBranch = truncateGraphemes(
      repo.hasRemote ? (repo.remoteBranch ?? "") : "",
      length,
      symbol,
    );
    const remoteName = truncateGraphemes(
      repo.hasRemote ? (repo.remoteName ?? "") : "",
      length,
      symbol,
    );

    const showRemote =
      optBool(options, "always_show_remote") ||
      (branchName !== remoteBranch && remoteBranch !== "");

    return {
      variables: {
        symbol: renderMeta(optString(options, "symbol"), ctx),
        branch: branchName,
        remote_branch: showRemote && remoteBranch !== "" ? remoteBranch : undefined,
        remote_name: showRemote && remoteName !== "" ? remoteName : undefined,
      },
    };
  },
};
