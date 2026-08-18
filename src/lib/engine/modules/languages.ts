/**
 * Every language / toolchain module, in starship's own module order.
 *
 * Cloud and context modules (aws, kubernetes, conda, …) and the core prompt
 * modules (character, directory, git_*, …) live elsewhere in this directory.
 */

import type { ModuleDefinition } from "./types";
import { SIMPLE_LANGUAGE_MODULES } from "./simpleLanguages";
import { BESPOKE_LANGUAGE_MODULES } from "./bespokeLanguages";
import { VCS_ALTERNATIVE_MODULES } from "./vcsAlternatives";

export const LANGUAGE_MODULES: ModuleDefinition[] = [
  ...SIMPLE_LANGUAGE_MODULES,
  ...BESPOKE_LANGUAGE_MODULES,
  ...VCS_ALTERNATIVE_MODULES,
].sort((a, b) => a.name.localeCompare(b.name));
