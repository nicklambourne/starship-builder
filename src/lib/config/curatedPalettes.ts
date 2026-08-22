/**
 * Palettes worth starting from, taken from the presets that ship one.
 *
 * Nothing here is invented: each is lifted whole from a bundled preset's
 * `[palettes]` table, so the names and the hex values are the palette's
 * authors'. A preset that gains a palette upstream turns up here on the next
 * `pnpm build:presets` without anyone writing it down twice.
 *
 * Terminal themes are deliberately not a source. They would give a palette
 * per bundled scheme, but their colours are the sixteen ANSI names — and a
 * palette entry called `red` shadows ANSI red everywhere in the app, so
 * "curated" would mean handing someone that trap on a plate.
 */

import { PRESETS } from "./presets";
import { parseConfig } from "./toml";

export interface CuratedPalette {
  /** Unique across the list; also the name it is copied in under. */
  name: string;
  /** Where it came from, for the picker. */
  from: string;
  colours: Record<string, string>;
}

function collect(): CuratedPalette[] {
  const out: CuratedPalette[] = [];
  for (const preset of PRESETS) {
    const parsed = parseConfig(preset.toml);
    if (!parsed.ok) continue;
    const palettes = parsed.config.palettes as
      | Record<string, Record<string, string>>
      | undefined;
    for (const [name, colours] of Object.entries(palettes ?? {})) {
      if (Object.keys(colours).length === 0) continue;
      if (out.some((existing) => existing.name === name)) continue;
      out.push({ name, from: preset.label, colours });
    }
  }
  return out;
}

export const CURATED_PALETTES: CuratedPalette[] = collect();
