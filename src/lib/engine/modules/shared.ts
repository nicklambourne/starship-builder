/**
 * Helpers shared by the core (non-language) modules.
 *
 * Two starship behaviours need a little machinery on this side of the port:
 *
 *  - `map_meta` variables. Starship treats some variable values as format
 *    strings parsed in the module's own scope — `character`'s
 *    `success_symbol = "[❯](bold green)"` is the obvious case, but every
 *    `$symbol` is a meta variable. `ModuleVariable` has no meta form, so those
 *    values are rendered here and bound as pre-styled segments instead.
 *  - `detect_env_vars`, whose negation rules (`"!VAR"`) are shared by
 *    `username` and `hostname`.
 */

import { type VariableMap, type VariableValue, renderFormatString } from "../render";
import { type Palette, resolvePalette } from "../styleString";
import type { Segment } from "../types";
import type { ModuleContext } from "./types";
import type { Scenario } from "@/lib/scenarios/types";

/** The palette named by the root config, used when parsing nested styles. */
export function paletteFor(ctx: ModuleContext): Palette | undefined {
  const { palette, palettes } = ctx.rootConfig;
  if (typeof palette !== "string") return undefined;
  if (typeof palettes !== "object" || palettes === null) return undefined;
  return resolvePalette(palettes as Record<string, Palette>, palette);
}

/**
 * Renders a nested format string (a starship `map_meta` value, or one of
 * `git_status`'s count formats) into segments.
 */
export function renderMeta(
  format: string,
  ctx: ModuleContext,
  variables: Record<string, string> = {},
  styleVariables: Record<string, string | undefined> = {},
): { segments: Segment[] } {
  const variableMap: VariableMap = new Map(
    Object.entries(variables).map(([name, value]): [string, VariableValue] => [
      name,
      { type: "plain", value },
    ]),
  );

  try {
    return {
      segments: renderFormatString(format, {
        variables: variableMap,
        styleVariables: new Map(Object.entries(styleVariables)),
        palette: paletteFor(ctx),
      }),
    };
  } catch {
    // Starship drops the whole module when a nested format fails to parse; the
    // builder keeps rendering so the rest of the prompt stays visible while the
    // user is mid-edit.
    return { segments: [] };
  }
}

/** Starship treats an `SSH_CONNECTION` in the environment as an SSH session. */
export function isSshSession(scenario: Scenario): boolean {
  return scenario.ssh || scenario.env.SSH_CONNECTION !== undefined;
}

export type Detected = "empty" | "negated" | "yes" | "no";

/** Port of `Context::detect_env_vars2`. */
export function detectEnvVars(names: string[], env: Record<string, string>): Detected {
  if (names.length === 0) return "empty";
  const negated = names
    .filter((name) => name.startsWith("!"))
    .some((name) => env[name.slice(1)] !== undefined);
  if (negated) return "negated";

  const positive = names.filter((name) => !name.startsWith("!"));
  return positive.some((name) => env[name] !== undefined) ? "yes" : "no";
}

/**
 * Port of `Context::detect_env_vars`: true when the list is empty, or when no
 * negated variable is set and either every entry was negated or at least one
 * positive entry is set.
 */
export function detectEnvVarsBool(names: string[], env: Record<string, string>): boolean {
  const detected = detectEnvVars(names, env);
  if (detected === "empty") return true;
  if (detected === "negated") return false;
  const positive = names.filter((name) => !name.startsWith("!"));
  return positive.length === 0 || detected === "yes";
}

/** Reads an option that starship models as `Option<&str>` (no default). */
export function optOptionalString(
  options: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
}

/** Whether a format string references `$name` or `${name}`. */
export function formatMentions(format: string, name: string): boolean {
  return format.includes(`$${name}`) || format.includes(`\${${name}}`);
}
