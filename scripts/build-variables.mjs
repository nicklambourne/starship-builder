#!/usr/bin/env node
/**
 * Extracts each module's format variables from starship's own documentation.
 *
 * Every module section in `docs/config/README.md` carries a "Variables" table
 * — variable, example, description — which is the only authoritative account
 * of what `$branch` or `$symbol` means in that module's `format`. Writing
 * those by hand would be a hundred modules' worth of paraphrase that drifts
 * from upstream on the next release, so they are parsed instead.
 *
 * The result is keyed by the section's anchor (`git-branch`), not by module
 * name: `src/lib/config/meta.ts` already records each module's deep link into
 * that page, so the anchor is a mapping the project maintains anyway.
 *
 * Run after `pnpm sync:docs`:  pnpm build:variables
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(repoRoot, "data", "config-docs.md");
const TARGET = join(repoRoot, "data", "variables.generated.json");

/**
 * VuePress's heading slugs, which are what the anchors in `meta.ts` point at.
 * Punctuation becomes a dash rather than disappearing — "Node.js" anchors at
 * `#node-js`, not `#nodejs` — which is the whole reason this is not a
 * one-liner.
 */
function slugify(heading) {
  return heading
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/[^\w\u00C0-\uFFFF]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/** Markdown inline syntax, reduced to plain text a row can show. */
function plain(cell) {
  return cell
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\\([*_[\]])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function splitRow(line) {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

const lines = readFileSync(SOURCE, "utf8").split("\n");
const variables = {};

/** Column positions from a table's header row, by what the column is called. */
function columns(header) {
  const cells = splitRow(header).map((cell) => plain(cell).toLowerCase());
  const name = cells.indexOf("variable");
  const description = cells.indexOf("description");
  return name < 0 || description < 0
    ? null
    : { name, description, example: cells.indexOf("example") };
}

let anchor = null;
for (let i = 0; i < lines.length; i += 1) {
  const heading = /^##\s+(.+)$/.exec(lines[i]);
  if (heading) {
    anchor = slugify(heading[1]);
    continue;
  }
  if (!anchor || !/^###\s+Variables\s*$/.test(lines[i])) continue;

  const table = {};
  // Every table in the section, not just the first: `directory` keeps the
  // repository variables in a <details>, and `git_status` documents what its
  // nested format strings accept in tables of their own.
  for (let row = i + 1; row < lines.length && !/^###?\s/.test(lines[row]); row += 1) {
    if (!lines[row].startsWith("|")) continue;
    const shape = columns(lines[row]);
    if (!shape) continue;
    row += 2; // past the header and its separator
    for (; row < lines.length && lines[row].startsWith("|"); row += 1) {
      const cells = splitRow(lines[row]);
      // `style\*` marks "usable only inside a style string", which the builder
      // shows in its own way; the name is what has to match the format string.
      const name = plain(cells[shape.name] ?? "").replace(/\*+$/, "").trim();
      const description = plain(cells[shape.description] ?? "");
      if (!name || !description) continue;
      const example = shape.example >= 0 ? plain(cells[shape.example] ?? "") : "";
      table[name] ??= example ? { description, example } : { description };
    }
  }
  if (Object.keys(table).length > 0) variables[anchor] ??= table;
}

const sorted = Object.fromEntries(
  Object.keys(variables)
    .sort()
    .map((key) => [
      key,
      Object.fromEntries(Object.keys(variables[key]).sort().map((v) => [v, variables[key][v]])),
    ]),
);

writeFileSync(TARGET, `${JSON.stringify(sorted, null, 2)}\n`);
const count = Object.values(sorted).reduce((n, t) => n + Object.keys(t).length, 0);
console.log(`${Object.keys(sorted).length} sections, ${count} variables → ${TARGET}`);
