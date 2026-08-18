/**
 * The remaining modules from starship's prompt order: shell nesting, NATS,
 * network namespaces, direnv, and Mercurial state.
 *
 * Each depends on state a browser cannot observe, so each reads from a
 * dedicated Scenario field instead. All five are `disabled: true` upstream
 * except `netns`, and that faithfully carries over.
 *
 * Nerd Font and emoji glyphs are written as escapes rather than literals —
 * private-use-area characters do not survive every editor and tooling round
 * trip, and a silently mangled symbol is invisible until it renders wrong.
 */

import type { ModuleDefinition } from "./types";
import { optBool, optNumber, optString, optStringArray } from "./types";

const shlvl: ModuleDefinition = {
  name: "shlvl",
  defaults: {
    threshold: 2,
    format: "[$symbol$shlvl]($style) ",
    // "↕️" plus the two spaces starship ships to pad the emoji.
    symbol: "↕️  ",
    repeat: false,
    repeat_offset: 0,
    style: "bold yellow",
    disabled: true,
  },
  evaluate(options, { scenario }) {
    const level = scenario.shlvl ?? 1;
    if (level < optNumber(options, "threshold", 2)) return null;

    const symbol = optString(options, "symbol");
    const repeat = optBool(options, "repeat");
    const offset = optNumber(options, "repeat_offset", 0);

    // With `repeat`, the symbol is drawn once per level (less the offset)
    // instead of the level being printed as a number.
    const repeats = Math.max(0, level - offset);
    return {
      variables: {
        shlvl: String(level),
        symbol: repeat ? symbol.repeat(repeats) : symbol,
      },
    };
  },
};

const nats: ModuleDefinition = {
  name: "nats",
  defaults: {
    format: "[$symbol($name )]($style)",
    symbol: "✉️ ",
    style: "bold purple",
    disabled: true,
  },
  evaluate(options, { scenario }) {
    if (!scenario.nats?.name) return null;
    return {
      variables: {
        name: scenario.nats.name,
        symbol: optString(options, "symbol"),
      },
    };
  },
};

const netns: ModuleDefinition = {
  name: "netns",
  defaults: {
    format: "[$symbol \\[$name\\]]($style) ",
    symbol: "\u{1F6DC}",
    style: "blue bold dimmed",
    disabled: false,
  },
  evaluate(options, { scenario }) {
    if (!scenario.netns?.name) return null;
    return {
      variables: {
        name: scenario.netns.name,
        symbol: optString(options, "symbol"),
      },
    };
  },
};

const direnv: ModuleDefinition = {
  name: "direnv",
  defaults: {
    format: "[$symbol$loaded/$allowed]($style) ",
    symbol: "direnv ",
    style: "bold bright-yellow",
    disabled: true,
    detect_extensions: [],
    detect_env_vars: ["DIRENV_FILE"],
    detect_files: [".envrc"],
    detect_folders: [],
    allowed_msg: "allowed",
    not_allowed_msg: "not allowed",
    denied_msg: "denied",
    loaded_msg: "loaded",
    unloaded_msg: "not loaded",
  },
  evaluate(options, { scenario }) {
    const files = optStringArray(options, "detect_files");
    const folders = optStringArray(options, "detect_folders");
    const extensions = optStringArray(options, "detect_extensions");
    const envVars = optStringArray(options, "detect_env_vars");

    const detected =
      files.some((f) => scenario.files.includes(f)) ||
      folders.some((f) => scenario.files.includes(f)) ||
      extensions.some((ext) => scenario.files.some((f) => f.endsWith(`.${ext}`))) ||
      envVars.some((name) => scenario.env[name] !== undefined);

    if (!detected) return null;

    // Without a direnv status to read, an .envrc present but unmentioned by the
    // scenario is treated as allowed and loaded — the state a working setup is
    // in, and the one users are configuring the prompt to confirm.
    const state = scenario.direnv ?? { loaded: true, allowed: "allowed" as const };

    const allowedMsg =
      state.allowed === "allowed"
        ? optString(options, "allowed_msg")
        : state.allowed === "denied"
          ? optString(options, "denied_msg")
          : optString(options, "not_allowed_msg");

    return {
      variables: {
        symbol: optString(options, "symbol"),
        loaded: state.loaded
          ? optString(options, "loaded_msg")
          : optString(options, "unloaded_msg"),
        allowed: allowedMsg,
        rc_path: ".envrc",
      },
    };
  },
};

const HG_STATE_KEYS = [
  "merge",
  "rebase",
  "update",
  "bisect",
  "shelve",
  "graft",
  "transplant",
  "histedit",
] as const;

const hgState: ModuleDefinition = {
  name: "hg_state",
  defaults: {
    merge: "MERGING",
    rebase: "REBASING",
    update: "UPDATING",
    bisect: "BISECTING",
    shelve: "SHELVING",
    graft: "GRAFTING",
    transplant: "TRANSPLANTING",
    histedit: "HISTEDITING",
    style: "bold yellow",
    format: "\\([$state]($style)\\) ",
    disabled: true,
  },
  evaluate(options, { scenario }) {
    const current = scenario.hgState;
    if (!current) return null;
    if (!HG_STATE_KEYS.includes(current)) return null;
    return { variables: { state: optString(options, current) } };
  },
};

export const MISC_MODULES: ModuleDefinition[] = [
  direnv,
  hgState,
  nats,
  netns,
  shlvl,
];
