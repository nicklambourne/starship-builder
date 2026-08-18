/**
 * Helpers shared by the cloud / context modules.
 *
 * These are ports of starship internals that live outside the module registry:
 * `Context::detect_env_vars`, `utils::directory::truncate` and
 * `utils::truncate::truncate_text`.
 */

import type { Scenario } from "@/lib/scenarios/types";
import type { ModuleOptions } from "./types";

/**
 * Port of `Context::detect_env_vars`.
 *
 * An empty list always matches. A `!VAR` entry is negated: if that variable is
 * set the module is suppressed outright. Otherwise at least one non-negated
 * variable must be set — unless every entry was negated, which also matches.
 */
export function detectEnvVars(scenario: Scenario, names: string[]): boolean {
  if (names.length === 0) return true;

  const isSet = (name: string): boolean => scenario.env[name] !== undefined;

  if (names.some((name) => name.startsWith("!") && isSet(name.slice(1)))) return false;

  const positive = names.filter((name) => !name.startsWith("!"));
  return positive.length === 0 || positive.some(isSet);
}

/**
 * Reads a table of string→string option values, e.g. `region_aliases`.
 * Non-string entries are dropped rather than coerced.
 */
export function optAliasTable(
  options: ModuleOptions,
  key: string,
): Record<string, string> {
  const value = options[key];
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  const table: Record<string, string> = {};
  for (const [name, alias] of Object.entries(value as Record<string, unknown>)) {
    if (typeof alias === "string") table[name] = alias;
  }
  return table;
}

/** Applies an exact-match alias table, leaving unknown names untouched. */
export function aliasFor<T extends string | undefined>(
  name: T,
  aliases: Record<string, string>,
): string | undefined {
  if (name === undefined) return undefined;
  return aliases[name] ?? name;
}

/**
 * Port of `utils::directory::truncate`: keeps the last `length` `/`-separated
 * components. Conda and spack use it so that a path-shaped environment name
 * collapses to its final segment.
 */
export function truncateComponents(value: string, length: number): string {
  if (length <= 0) return value;

  const components = value.split("/");
  // A leading "/" produces an empty first component that must not be counted.
  if (components[0] === "") components.shift();
  if (components.length <= length) return value;

  return components.slice(components.length - length).join("/");
}

/**
 * Port of `utils::truncate::truncate_text`: keeps the first `length` graphemes
 * and appends the first grapheme of `truncationSymbol` when it actually cut.
 *
 * Code points stand in for grapheme clusters; the two differ only for combining
 * marks and emoji sequences, which branch names essentially never contain.
 */
export function truncateText(
  text: string,
  length: number,
  truncationSymbol: string,
): string {
  if (length <= 0) return text;

  const graphemes = [...text];
  if (graphemes.length <= length) return text;

  return graphemes.slice(0, length).join("") + ([...truncationSymbol][0] ?? "");
}
