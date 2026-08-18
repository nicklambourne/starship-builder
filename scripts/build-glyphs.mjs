/**
 * Builds the Nerd Font symbol picker's dataset from the upstream glyph names.
 *
 * Nerd Fonts publishes ~11,000 glyphs in `glyphnames.json`, keyed by a name
 * whose prefix identifies the icon set it came from. That file is ~1.5 MB and
 * carries fields the picker does not need, so this trims it to a name, a
 * codepoint and a category, which the picker loads on demand.
 *
 *   pnpm build:glyphs
 */

import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "https://raw.githubusercontent.com/ryanoasis/nerd-fonts/master/glyphnames.json";
const INPUT = process.argv[2] ?? "/tmp/glyphnames.json";
const OUTPUT = "data/glyphs.generated.json";

/**
 * Prefix to human category. Ordered so the sets people reach for while
 * building a prompt — powerline separators, language logos — come first.
 */
const CATEGORIES = [
  ["pl", "Powerline"],
  ["ple", "Powerline Extra"],
  ["dev", "Devicons"],
  ["seti", "Seti UI"],
  ["fa", "Font Awesome"],
  ["oct", "Octicons"],
  ["cod", "Codicons"],
  ["md", "Material Design"],
  ["weather", "Weather"],
  ["fae", "Font Awesome Extension"],
  ["iec", "IEC Power"],
  ["pom", "Pomicons"],
  ["linux", "Linux"],
  ["custom", "Custom"],
  ["indent", "Indentation"],
  ["indentation", "Indentation"],
];

const raw = JSON.parse(readFileSync(INPUT, "utf8"));
const metadata = raw.METADATA ?? {};

const glyphs = [];
for (const [name, entry] of Object.entries(raw)) {
  if (name === "METADATA") continue;
  if (!entry?.code || !entry?.char) continue;

  const prefix = name.includes("-") ? name.slice(0, name.indexOf("-")) : "";
  const match = CATEGORIES.find(([key]) => key === prefix);

  glyphs.push({
    // Name without its set prefix: searching for "python" should not require
    // knowing whether it lives in Devicons or Font Awesome.
    n: match ? name.slice(prefix.length + 1) : name,
    c: entry.code,
    g: match ? match[1] : "Other",
  });
}

// Sort by category order, then name, so the picker can slice contiguously.
const order = new Map(CATEGORIES.map(([, label], index) => [label, index]));
glyphs.sort((a, b) => {
  const ga = order.get(a.g) ?? CATEGORIES.length;
  const gb = order.get(b.g) ?? CATEGORIES.length;
  return ga - gb || a.n.localeCompare(b.n);
});

const categories = [...new Set(glyphs.map((glyph) => glyph.g))];

writeFileSync(
  OUTPUT,
  JSON.stringify({
    source: SOURCE,
    nerdFontsVersion: metadata.version ?? "unknown",
    categories,
    glyphs,
  }),
);

console.log(
  `wrote ${OUTPUT}: ${glyphs.length} glyphs across ${categories.length} categories`,
);
for (const category of categories) {
  console.log(`  ${category}: ${glyphs.filter((g) => g.g === category).length}`);
}
