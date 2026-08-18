#!/usr/bin/env node
/**
 * Trims starship's published JSON Schema down to the shape the builder needs.
 *
 * `data/config-schema.json` is ~167 KB of JSON, most of it prose: every module
 * carries its full docs page as a `description`, and every option repeats the
 * `$ref`/`additionalProperties` scaffolding schemars emits. Importing it
 * directly would put all of that in the client bundle and force a normalisation
 * pass on every page load.
 *
 * This script pre-resolves the `$ref`s, normalises types, and keeps only the
 * first paragraph of each module description (the rest is reference material
 * already reachable via the per-module docs link in `src/lib/config/meta.ts`).
 * The result — `data/schema.generated.json`, ~55 KB — is committed so the app
 * builds without a codegen step.
 *
 * Run after `pnpm sync:schema`:  pnpm build:schema
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(repoRoot, "data", "config-schema.json");
const TARGET = join(repoRoot, "data", "schema.generated.json");

/** Root keys the builder exposes as prompt-wide settings. */
const ROOT_KEYS = [
  "format",
  "right_format",
  "add_newline",
  "palette",
  "palettes",
  "continuation_prompt",
  "scan_timeout",
  "command_timeout",
  "follow_symlinks",
];

const schema = JSON.parse(readFileSync(SOURCE, "utf8"));
const defs = schema.$defs ?? {};

const deref = (node) => {
  let current = node;
  const seen = new Set();
  while (current?.$ref) {
    const name = current.$ref.replace("#/$defs/", "");
    if (seen.has(name)) break;
    seen.add(name);
    current = defs[name];
  }
  return current ?? {};
};

const KIND_BY_JSON_TYPE = {
  string: "string",
  boolean: "boolean",
  integer: "number",
  number: "number",
  array: "array",
  object: "object",
};

const kindOfNode = (node) => {
  const resolved = deref(node);
  const declared = resolved.type ?? node.type;
  const primary = Array.isArray(declared)
    ? declared.find((t) => t !== "null")
    : declared;
  if (primary) return KIND_BY_JSON_TYPE[primary] ?? "unknown";
  if (Array.isArray(resolved.anyOf)) return kindOfUnion(resolved.anyOf);
  return "unknown";
};

/**
 * `VecOr_string` and friends accept a scalar or a list of it; the UI can edit
 * both with a list editor, so those collapse to "array". Genuinely
 * heterogeneous unions (`custom.when` is a bool or a shell command,
 * `directory.substitutions` is a list or a table) have no single editor and
 * stay "unknown", which is the signal to fall back to a raw value editor.
 */
const kindOfUnion = (arms) => {
  const kinds = new Set(arms.map(kindOfNode));
  kinds.delete("unknown");
  if (kinds.size === 1) return [...kinds][0];
  if (kinds.size === 2 && kinds.has("array") && kinds.has("string")) return "array";
  return "unknown";
};

/**
 * Collapses a JSON Schema type into the kinds the UI has editors for.
 * Nullable options are declared as `["string", "null"]`.
 */
const normaliseType = (node) => kindOfNode(node);

/** Enums are inlined by schemars either directly or behind a `$ref`. */
const enumOf = (node, resolved) => {
  const values = node.enum ?? resolved.enum;
  if (!Array.isArray(values)) return undefined;
  const strings = values.filter((v) => typeof v === "string");
  return strings.length === values.length && strings.length > 0 ? strings : undefined;
};

const firstParagraph = (text) => {
  if (typeof text !== "string") return undefined;
  const trimmed = text.split("\n\n")[0].replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toOption = (key, node) => {
  const resolved = deref(node);
  const defaultValue = node.default ?? resolved.default;
  const option = { key, type: normaliseType(node) };

  const description = firstParagraph(node.description ?? resolved.description);
  if (description) option.description = description;
  if (defaultValue !== undefined) option.default = defaultValue;
  const values = enumOf(node, resolved);
  if (values) option.enum = values;

  return option;
};

const optionsOf = (objectSchema) =>
  Object.entries(objectSchema.properties ?? {}).map(([key, node]) =>
    toOption(key, node),
  );

const root = ROOT_KEYS.map((key) => {
  const node = schema.properties[key];
  if (!node) throw new Error(`Root option "${key}" is missing from the schema`);
  return toOption(key, node);
});

const modules = [];
for (const [name, node] of Object.entries(schema.properties)) {
  if (name.startsWith("$")) continue;

  // Plain module tables are a `$ref` to their config struct.
  if (node.$ref) {
    const resolved = deref(node);
    const entry = { name, options: optionsOf(resolved) };
    const description = firstParagraph(resolved.description);
    if (description) entry.description = description;
    modules.push(entry);
    continue;
  }

  // `env_var` and `custom` are maps of user-named instances; their option list
  // lives on `additionalProperties`.
  const instance = node.additionalProperties;
  if (node.type === "object" && instance?.$ref) {
    const resolved = deref(instance);
    const entry = { name, options: optionsOf(resolved) };
    const description = firstParagraph(resolved.description);
    if (description) entry.description = description;
    modules.push(entry);
  }
}

modules.sort((a, b) => a.name.localeCompare(b.name));

const output = {
  generatedFrom: "data/config-schema.json",
  schemaTitle: schema.title ?? "FullConfig",
  root,
  modules,
};

writeFileSync(TARGET, `${JSON.stringify(output, null, 2)}\n`);

const bytes = readFileSync(TARGET).length;
process.stdout.write(
  `${TARGET}: ${modules.length} modules, ${root.length} root options, ${(bytes / 1024).toFixed(1)} KiB\n`,
);
