/**
 * Starship's default configuration, resolved into a plain `StarshipConfig`.
 *
 * `serialiseConfig` diffs against this so a minimal export contains only what
 * the user actually changed.
 *
 * Two sources, in increasing order of authority:
 *
 *  1. `data/schema.generated.json` — covers every module starship ships,
 *     including ones the preview engine does not implement yet. Complete, but
 *     only as accurate as the published schema.
 *  2. A `ModuleDefinition[]` registry from `src/lib/engine/modules/`, whose
 *     defaults are held byte-for-byte identical to starship's Rust sources.
 *
 * The registry is passed in rather than imported so this module does not
 * depend on the engine's barrel file.
 */

import { ROOT_OPTIONS, getModuleSchemas } from "./schema";
import type { ModuleDefinition } from "@/lib/engine/modules/types";
import type { StarshipConfig } from "@/lib/engine/prompt";

/**
 * Modules configured as maps of user-named instances (`[env_var.SHELL]`,
 * `[custom.giturl]`). Their schema entry describes one instance, so the
 * default for the root key itself is an empty map, not that instance's
 * defaults.
 */
const INSTANCE_MODULES = new Set(["env_var", "custom"]);

function buildSchemaDefaults(): StarshipConfig {
  const config: StarshipConfig = {};

  for (const option of ROOT_OPTIONS) {
    if (option.default !== undefined) config[option.key] = option.default;
  }

  for (const module of getModuleSchemas()) {
    const table: Record<string, unknown> = {};
    if (!INSTANCE_MODULES.has(module.name)) {
      for (const option of module.options) {
        if (option.default !== undefined) table[option.key] = option.default;
      }
    }
    config[module.name] = table;
  }

  return config;
}

/**
 * Schema-derived defaults for every root option and module table.
 *
 * Treat as read-only — it is shared by every caller.
 */
export const DEFAULT_CONFIG: StarshipConfig = buildSchemaDefaults();

/**
 * `DEFAULT_CONFIG` with a module registry's defaults layered on top.
 *
 * Pass the engine's `ModuleDefinition[]`; modules it does not implement keep
 * their schema defaults.
 */
export function resolveDefaults(
  modules: readonly ModuleDefinition[] = [],
): StarshipConfig {
  const config: StarshipConfig = { ...DEFAULT_CONFIG };

  for (const definition of modules) {
    const fromSchema = DEFAULT_CONFIG[definition.name];
    const base =
      fromSchema && typeof fromSchema === "object" && !Array.isArray(fromSchema)
        ? (fromSchema as Record<string, unknown>)
        : {};
    config[definition.name] = { ...base, ...definition.defaults };
  }

  return config;
}
