#!/usr/bin/env node
/**
 * Bundles the vendored preset TOMLs into a single JSON artefact.
 *
 * Neither Next.js nor vitest can `import` a `.toml` file as text without a
 * loader that would have to be configured identically in both, so the raw
 * TOMLs in `data/presets/` are folded into `data/presets.generated.json`,
 * which both toolchains read through `resolveJsonModule`.
 *
 * Labels and descriptions come from starship's own presets index
 * (docs/presets/README.md) and are maintained here, since the TOMLs carry no
 * metadata of their own.
 *
 * Run:  pnpm build:presets
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(repoRoot, "data", "presets");
const TARGET = join(repoRoot, "data", "presets.generated.json");

/** Ordered as starship's presets index orders them. */
const METADATA = [
  {
    id: "nerd-font-symbols",
    label: "Nerd Font Symbols",
    description: "Changes the symbols for each module to use Nerd Font symbols.",
  },
  {
    id: "no-nerd-font",
    label: "No Nerd Fonts",
    description:
      "Changes the symbols for several modules so that no Nerd Font symbols are used anywhere in the prompt.",
  },
  {
    id: "bracketed-segments",
    label: "Bracketed Segments",
    description:
      "Shows each module's segment in brackets instead of starship's default wording (“via”, “on”, and so on).",
  },
  {
    id: "plain-text-symbols",
    label: "Plain Text Symbols",
    description:
      "Replaces every module symbol with plain text — useful without Unicode support.",
  },
  {
    id: "no-runtime-versions",
    label: "No Runtime Versions",
    description:
      "Hides language runtime versions, for containers and virtualised environments.",
  },
  {
    id: "no-empty-icons",
    label: "No Empty Icons",
    description: "Hides a module's icon when the toolset is not found.",
  },
  {
    id: "pure-preset",
    label: "Pure Prompt",
    description: "Emulates the look and behaviour of the Pure prompt.",
  },
  {
    id: "pastel-powerline",
    label: "Pastel Powerline",
    description:
      "Powerline styling inspired by M365Princess; also demonstrates path substitution.",
  },
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    description: "Inspired by the tokyo-night VS Code theme.",
  },
  {
    id: "gruvbox-rainbow",
    label: "Gruvbox Rainbow",
    description: "A Gruvbox palette take on Pastel Powerline and Tokyo Night.",
  },
  {
    id: "jetpack",
    label: "Jetpack",
    description:
      "A pseudo-minimalist prompt inspired by the geometry and spaceship prompts.",
  },
  {
    id: "catppuccin-powerline",
    label: "Catppuccin Powerline",
    description: "Gruvbox Rainbow restyled with the Catppuccin palette.",
  },
];

const onDisk = new Set(
  readdirSync(SOURCE_DIR)
    .filter((f) => f.endsWith(".toml"))
    .map((f) => f.replace(/\.toml$/, "")),
);

const described = new Set(METADATA.map((p) => p.id));
const missing = [...onDisk].filter((id) => !described.has(id));
if (missing.length > 0) {
  throw new Error(`Preset TOMLs with no metadata entry: ${missing.join(", ")}`);
}

const presets = METADATA.map(({ id, label, description }) => {
  if (!onDisk.has(id)) throw new Error(`Missing data/presets/${id}.toml`);
  return {
    id,
    label,
    description,
    toml: readFileSync(join(SOURCE_DIR, `${id}.toml`), "utf8"),
  };
});

writeFileSync(TARGET, `${JSON.stringify({ presets }, null, 2)}\n`);
process.stdout.write(`${TARGET}: ${presets.length} presets\n`);
