/**
 * What each option in a module's settings does.
 *
 * Starship publishes a JSON Schema, and the builder's option rows are built
 * from it — but it describes none of them: every option arrives typed as a
 * string with no `description`, so the rows have always been a list of bare
 * keys. The prose exists only in the documentation's per-module Options
 * table, which `scripts/build-module-docs.mjs` parses alongside the Variables
 * table it already read.
 *
 * Keyed by documentation anchor, for the same reason as the variables: the
 * parser knows headings, `meta.ts` knows which module each heading belongs to.
 */

import generated from "../../../data/options.generated.json";
import { docsAnchor } from "./meta";

const BY_ANCHOR = generated as Record<string, Record<string, { description: string }>>;

/**
 * Options upstream documents on dozens of modules but omits from one.
 *
 * The wording is theirs, taken verbatim from the majority of the tables that
 * do carry the row — `detect_folders` is worded identically in 51 of the 57
 * modules that document it, and `version_format` in 50 of 52 — so this fills
 * a hole in the source rather than paraphrasing around it. Anything whose
 * meaning genuinely differs per module is left blank instead.
 */
const BORROWED: Record<string, Record<string, string>> = {
  gleam: { detect_folders: "Which folders should trigger this module." },
  haskell: {
    version_format: "The version format. Available vars are raw, major, minor, & patch",
  },
  python: {
    detect_env_vars: "Which environment variable(s) should trigger this module.",
  },
};

export function describeOption(
  moduleName: string,
  option: string,
): string | undefined {
  const anchor = docsAnchor(moduleName);
  const documented = anchor ? BY_ANCHOR[anchor]?.[option]?.description : undefined;
  return documented ?? BORROWED[moduleName]?.[option];
}
