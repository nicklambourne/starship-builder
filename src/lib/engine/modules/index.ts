/**
 * Module registry.
 *
 * The three groups are implemented independently, so this file is the single
 * point where they are combined — and where a name collision between groups
 * would otherwise silently shadow one implementation with another.
 */

import { CLOUD_MODULES } from "./cloud";
import { CORE_MODULES } from "./core";
import { LANGUAGE_MODULES } from "./languages";
import { MISC_MODULES } from "./misc";
import type { ModuleDefinition } from "./types";

function mergeUnique(...groups: ModuleDefinition[][]): ModuleDefinition[] {
  const byName = new Map<string, ModuleDefinition>();
  const duplicates: string[] = [];

  for (const group of groups) {
    for (const definition of group) {
      if (byName.has(definition.name)) {
        duplicates.push(definition.name);
        continue;
      }
      byName.set(definition.name, definition);
    }
  }

  if (duplicates.length > 0 && process.env.NODE_ENV !== "production") {
    // A duplicate means two groups claim the same module; the first wins, but
    // it is always a bug worth fixing at the source.
    console.warn(
      `Duplicate module definitions ignored: ${[...new Set(duplicates)].join(", ")}`,
    );
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const ALL_MODULES: ModuleDefinition[] = mergeUnique(
  CORE_MODULES,
  LANGUAGE_MODULES,
  CLOUD_MODULES,
  MISC_MODULES,
);

export const MODULES_BY_NAME: ReadonlyMap<string, ModuleDefinition> = new Map(
  ALL_MODULES.map((m) => [m.name, m]),
);

export function getModule(name: string): ModuleDefinition | undefined {
  return MODULES_BY_NAME.get(name);
}

export type { ModuleDefinition } from "./types";
