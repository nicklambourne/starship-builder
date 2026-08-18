/**
 * Typed access to starship's configuration schema.
 *
 * The upstream schema (`data/config-schema.json`, ~167 KB) is not imported
 * here. `scripts/build-schema.mjs` pre-resolves its `$ref`s, normalises the
 * types and drops the reference prose, producing `data/schema.generated.json`
 * — the artefact this module reads. That keeps the bundle to roughly a third
 * of the raw schema and removes any runtime normalisation pass.
 *
 * The schema describes shapes only. Anything it cannot express — which string
 * options are format strings, which are style strings, how modules group in
 * the UI — lives in `./meta`.
 */

import generated from "../../../data/schema.generated.json";

export type OptionType =
  | "string"
  | "boolean"
  | "number"
  | "array"
  | "object"
  | "unknown";

export interface OptionSchema {
  key: string;
  type: OptionType;
  description?: string;
  default?: unknown;
  enum?: string[];
}

export interface ModuleSchema {
  name: string;
  description?: string;
  options: OptionSchema[];
}

/**
 * Prompt-wide options, in the order the builder presents them. These are the
 * root scalars; every other root key is a module table.
 */
export const ROOT_OPTIONS: readonly OptionSchema[] = Object.freeze(
  generated.root as OptionSchema[],
);

/**
 * Every module table starship accepts, sorted by name.
 *
 * `env_var` and `custom` are included even though they are maps of
 * user-named instances (`[env_var.SHELL]`, `[custom.giturl]`) rather than
 * single tables — their entry describes the options one instance takes.
 */
const MODULE_SCHEMAS: readonly ModuleSchema[] = Object.freeze(
  generated.modules as ModuleSchema[],
);

const BY_NAME: ReadonlyMap<string, ModuleSchema> = new Map(
  MODULE_SCHEMAS.map((module) => [module.name, module]),
);

export function getModuleSchemas(): readonly ModuleSchema[] {
  return MODULE_SCHEMAS;
}

export function getModuleSchema(name: string): ModuleSchema | undefined {
  return BY_NAME.get(name);
}

export function getOptionSchema(
  moduleName: string,
  optionKey: string,
): OptionSchema | undefined {
  return BY_NAME.get(moduleName)?.options.find((o) => o.key === optionKey);
}

export function getRootOption(key: string): OptionSchema | undefined {
  return ROOT_OPTIONS.find((o) => o.key === key);
}

/** Whether `name` is a module table starship knows about. */
export function isKnownModule(name: string): boolean {
  return BY_NAME.has(name);
}
