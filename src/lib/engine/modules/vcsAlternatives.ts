/**
 * Fossil and Pijul modules.
 *
 * Both are disabled by default in starship and both read state from their own
 * CLIs. The scenario models git only, so a check-out is recognised from its
 * marker file/folder in the directory listing, and the branch, channel and diff
 * counts are read from environment variables a scenario can set:
 *
 *   fossil_branch   FOSSIL_BRANCH
 *   fossil_metrics  FOSSIL_ADDED, FOSSIL_DELETED
 *   pijul_channel   PIJUL_CHANNEL
 */

import type { Scenario } from "@/lib/scenarios/types";
import {
  type ModuleContext,
  type ModuleDefinition,
  type ModuleOptions,
  type ModuleResult,
  optBool,
  optString,
} from "./types";
import { truncateText } from "./bespokeLanguages";

function hasEntry(scenario: Scenario, name: string): boolean {
  return scenario.files.includes(name) || scenario.files.includes(`${name}/`);
}

const fossilBranch: ModuleDefinition = {
  name: "fossil_branch",
  defaults: {
    format: "on [$symbol$branch]($style) ",
    // Nerd Font branch glyph (U+E0A0).
    symbol: "\ue0a0 ",
    style: "bold purple",
    // starship's default is i64::MAX, i.e. "never truncate".
    truncation_length: Number.MAX_SAFE_INTEGER,
    truncation_symbol: "…",
    disabled: true,
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    // `_FOSSIL_` on Windows, `.fslckout` elsewhere; accept either.
    if (!hasEntry(ctx.scenario, ".fslckout") && !hasEntry(ctx.scenario, "_FOSSIL_")) return null;
    const branch = ctx.scenario.env["FOSSIL_BRANCH"];
    if (branch === undefined) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        branch: truncateText(branch, options),
      },
    };
  },
};

const fossilMetrics: ModuleDefinition = {
  name: "fossil_metrics",
  defaults: {
    format: "([+$added]($added_style) )([-$deleted]($deleted_style) )",
    added_style: "bold green",
    deleted_style: "bold red",
    only_nonzero_diffs: true,
    disabled: true,
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    if (!hasEntry(ctx.scenario, ".fslckout") && !hasEntry(ctx.scenario, "_FOSSIL_")) return null;

    const onlyNonzero = optBool(options, "only_nonzero_diffs", true);
    const count = (value: string | undefined): string | undefined => {
      const parsed = Number.parseInt(value ?? "0", 10);
      if (!Number.isFinite(parsed)) return undefined;
      if (parsed === 0 && onlyNonzero) return undefined;
      return String(parsed);
    };

    return {
      variables: {
        added: count(ctx.scenario.env["FOSSIL_ADDED"]),
        deleted: count(ctx.scenario.env["FOSSIL_DELETED"]),
      },
      styleVariables: {
        added_style: optString(options, "added_style"),
        deleted_style: optString(options, "deleted_style"),
      },
    };
  },
};

const pijulChannel: ModuleDefinition = {
  name: "pijul_channel",
  defaults: {
    // Nerd Font branch glyph (U+E0A0).
    symbol: "\ue0a0 ",
    style: "bold purple",
    format: "on [$symbol$channel]($style) ",
    truncation_length: Number.MAX_SAFE_INTEGER,
    truncation_symbol: "…",
    disabled: true,
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    if (!hasEntry(ctx.scenario, ".pijul")) return null;
    const channel = ctx.scenario.env["PIJUL_CHANNEL"];
    if (channel === undefined) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        channel: truncateText(channel, options),
      },
    };
  },
};

export const VCS_ALTERNATIVE_MODULES: ModuleDefinition[] = [
  fossilBranch,
  fossilMetrics,
  pijulChannel,
];
