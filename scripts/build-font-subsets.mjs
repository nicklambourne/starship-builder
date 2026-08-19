/**
 * Splits each bundled Nerd Font into the pieces a page actually needs.
 *
 * A patched Nerd Font is ~12,000 glyphs, and roughly 10,500 of those are icons
 * nobody has asked for yet — the symbol picker offers them all, but a prompt
 * uses a couple of dozen. Downloading two megabytes to draw `~/code` and a
 * branch symbol is the single largest cost of opening this site.
 *
 * So each face is emitted three ways, and `fonts.css` gives them disjoint
 * `unicode-range`s so the browser fetches only what a character needs:
 *
 *   1. `-text`   everything below the private-use area: letters, digits,
 *                punctuation, box drawing.
 *   2. `-icons`  the glyphs starship's own modules and presets reference, plus
 *                the powerline separators and the devicon band the language
 *                modules draw from.
 *   3. the original, untouched, for the long tail — reached only when someone
 *                inserts a rare glyph from the picker.
 *
 * Subsetting is a modification, so the licence question matters: of the twelve
 * families, only Cascadia Code, Bitstream Vera, Plex and Source reserve their
 * names, and the Nerd Fonts project has already renamed each of those
 * (CaskaydiaCove, Hack, BlexMono, SauceCodePro). No reserved name is used, the
 * licences still travel with the fonts, and the subsets stay under them.
 *
 * Run with `pnpm build:fonts`. The output is committed, like `data/`, so a
 * normal build needs no font tooling.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import subsetFont from "subset-font";

const FONT_DIR = "src/assets/fonts";

/** Every code point below the private-use area, as characters. */
function textCharacters() {
  let out = "";
  for (let cp = 0x20; cp <= 0x2bff; cp += 1) out += String.fromCodePoint(cp);
  // Variation selectors and the replacement character, which the terminal can
  // emit for an unmapped byte.
  for (let cp = 0xfe00; cp <= 0xfe0f; cp += 1) out += String.fromCodePoint(cp);
  out += "�";
  return out;
}

/**
 * The icons this app draws without being asked: whatever the module defaults
 * and the vendored presets reference, plus two bands.
 *
 * The bands matter because a preset can be edited into using a neighbouring
 * separator, and fetching the long-tail file for one arrow would undo the
 * point of the split.
 */
async function iconCharacters() {
  const points = new Set();

  // Powerline separators, and the devicon band the language modules use.
  for (let cp = 0xe0a0; cp <= 0xe0d4; cp += 1) points.add(cp);
  for (let cp = 0xe5fa; cp <= 0xe6b7; cp += 1) points.add(cp);

  const roots = ["src/lib/engine/modules", "src/lib/config", "data/presets"];
  for (const root of roots) {
    for (const file of await walk(root)) {
      const text = await readFile(file, "utf8");
      for (const character of text) {
        const cp = character.codePointAt(0);
        if (isIcon(cp)) points.add(cp);
      }
      // Symbols written as escapes rather than literal glyphs.
      for (const match of text.matchAll(/\\u\{?([0-9a-fA-F]{4,6})\}?/g)) {
        const cp = Number.parseInt(match[1], 16);
        if (isIcon(cp)) points.add(cp);
      }
    }
  }
  return [...points].map((cp) => String.fromCodePoint(cp)).join("");
}

function isIcon(cp) {
  return cp !== undefined && ((cp >= 0xe000 && cp <= 0xf8ff) || cp >= 0xf0000);
}

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else if (/\.(ts|tsx|toml)$/.test(entry.name)) found.push(path);
  }
  return found;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const text = textCharacters();
const icons = await iconCharacters();
console.log(`icon set: ${[...icons].length} glyphs`);

const sources = (await readdir(FONT_DIR))
  .filter((name) => name.endsWith(".woff2") && !name.includes(".text.") && !name.includes(".icons."))
  .sort();

let before = 0;
let after = 0;

for (const name of sources) {
  const source = await readFile(join(FONT_DIR, name));
  const stem = basename(name, ".woff2");

  for (const [suffix, characters] of [
    ["text", text],
    ["icons", icons],
  ]) {
    const out = await subsetFont(source, characters, { targetFormat: "woff2" });
    await writeFile(join(FONT_DIR, `${stem}.${suffix}.woff2`), out);
    after += out.length;
  }
  before += source.length;
  console.log(`  ${stem}`);
}

console.log(
  `\n${sources.length} faces: ${kb(before)} of originals, ${kb(after)} of subsets ` +
    `(${((100 * after) / before).toFixed(0)}% — what a first visit now fetches)`,
);
