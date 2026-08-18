/**
 * The structure the format editor starts from.
 *
 * Starship's default `format` is the single token `$all`, which is nothing to
 * look at and nothing to rearrange. The editor therefore opens on an expanded,
 * grouped equivalent: every module written out, with related ones collected
 * into named groups.
 *
 * Two constraints shape this:
 *
 *  - Only some categories are gathered. Gathering moves a category's modules
 *    together, and `character` must stay at the very end of the prompt, so the
 *    Core and System categories are deliberately left where they are.
 *  - The structure is written into the config, not merely displayed. Gathering
 *    reorders modules, so a view that grouped without committing would show an
 *    order the exported TOML does not produce — the preview would be lying
 *    about what the user's shell will render. The cost is a long `format` line
 *    in the export, which is the honest representation of what is on screen.
 */

import {
  type FormatItem,
  fromItems,
  gatherCategory,
  toItems,
} from "./formatItems";

/**
 * Categories collected into a group by default.
 *
 * Deliberately conservative. Gathering moves modules, so the default only
 * touches the runs that are already broadly adjacent in starship's own order:
 *
 *  - Core and System would drag `character` away from the end of the prompt,
 *    where starship needs it.
 *  - Cloud & Tools spans from `kubernetes` (before the directory) all the way
 *    to `azure`, so gathering it by default would hoist AWS and gcloud above
 *    the current path — a far bigger change to the default prompt than
 *    grouping is meant to be. It is still one click away.
 */
export const DEFAULT_GROUPED_CATEGORIES = ["Git", "Languages", "Build Tools"] as const;

/** Expands `$all` into the modules it stands for, in starship's order. */
export function expandAll(format: string, promptOrder: string[]): string {
  if (!/\$\{?all\}?/.test(format)) return format;
  const named = new Set(
    [...format.matchAll(/\$\{?([a-zA-Z_][a-zA-Z0-9_.]*)\}?/g)].map((m) => m[1]),
  );
  const expansion = promptOrder
    .filter((module) => !named.has(module))
    .map((module) => `$${module}`)
    .join("");
  return format.replace(/\$\{?all\}?/, expansion);
}

/**
 * The structured view of a format string: `$all` expanded, related modules
 * gathered into groups. Returns the items, or null if the format will not
 * parse.
 */
export function structuredFormat(
  format: string,
  promptOrder: string[],
  categoryOf: (moduleName: string) => string | undefined,
): FormatItem[] | null {
  const items = toItems(expandAll(format, promptOrder));
  if (!items) return null;

  let grouped = items;
  for (const category of DEFAULT_GROUPED_CATEGORIES) {
    grouped = gatherCategory(grouped, categoryOf, category);
  }
  return grouped;
}

/** The same thing as a format string, for committing on first edit. */
export function structuredFormatString(
  format: string,
  promptOrder: string[],
  categoryOf: (moduleName: string) => string | undefined,
): string {
  const items = structuredFormat(format, promptOrder, categoryOf);
  return items ? fromItems(items) : format;
}
