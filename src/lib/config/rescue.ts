/**
 * Getting a config back out of a broken app.
 *
 * Everything here lives in memory: a render crash loses the editor but not the
 * store behind it, so the config someone spent an hour on is still reachable.
 * The error boundary uses this to offer it back as a file rather than leaving
 * them with a blank page and a lost afternoon.
 */

import { ALL_MODULES } from "@/lib/engine/modules";
import { serialiseConfig } from "@/lib/config/toml";
import type { StarshipConfig } from "@/lib/engine/prompt";

/**
 * Every module's defaults, keyed by name.
 *
 * The serialiser needs these to know which values are worth writing out.
 * Built once: the definitions are static.
 */
export const MODULE_DEFAULTS: Record<string, Record<string, unknown>> =
  Object.fromEntries(ALL_MODULES.map((definition) => [definition.name, definition.defaults]));

/** Whether a config holds anything worth rescuing. */
export function isWorthRescuing(config: StarshipConfig | undefined): boolean {
  return Boolean(config && Object.keys(config).length > 0);
}

/**
 * The config as the TOML someone would have downloaded.
 *
 * Kept tolerant on purpose: this runs after something has already gone wrong,
 * and a rescue that throws is no rescue. A config the serialiser cannot handle
 * comes back as JSON, which is still everything they typed.
 */
export function rescueToml(config: StarshipConfig | undefined): string | null {
  if (!isWorthRescuing(config)) return null;
  try {
    return serialiseConfig(config as StarshipConfig, { defaults: MODULE_DEFAULTS });
  } catch {
    try {
      return `# This config could not be written as TOML, so here it is as JSON.\n# ${JSON.stringify(config)}\n`;
    } catch {
      return null;
    }
  }
}
