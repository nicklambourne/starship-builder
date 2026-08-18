/**
 * Shared shape for language / toolchain modules.
 *
 * Nearly every starship language module does the same three things: decide
 * whether the current directory looks like a project of that language, read the
 * tool's version, and expose `$symbol` / `$version` to its format string. This
 * file captures that shape; anything that deviates (python's virtualenv,
 * nodejs's engines check, package's manifest scan, …) is written out longhand
 * in its own file.
 *
 * The version always comes from `scenario.toolVersions[<module name>]`, which
 * stands in for running the tool's `--version` command. A missing entry means
 * the tool is not installed, so the module renders nothing.
 */

import type { Scenario } from "@/lib/scenarios/types";
import {
  type ModuleContext,
  type ModuleDefinition,
  type ModuleOptions,
  type ModuleResult,
  type ModuleVariable,
  detects,
  formatVersion,
  optString,
  optStringArray,
} from "./types";

/** The format almost every language module uses. */
export const LANGUAGE_FORMAT = "via [$symbol($version )]($style)";
/** The `version_format` almost every language module uses. */
export const LANGUAGE_VERSION_FORMAT = "v${raw}";

export interface LanguageModuleSpec {
  /** Config key, e.g. `golang` — also the `toolVersions` key. */
  name: string;
  symbol: string;
  style: string;
  /** Defaults to `LANGUAGE_FORMAT`. */
  format?: string;
  /**
   * Defaults to `LANGUAGE_VERSION_FORMAT`. `null` for the handful of modules
   * starship gives no `version_format` option at all (mojo, odin), whose
   * version is shown exactly as the tool reports it.
   */
  versionFormat?: string | null;
  disabled?: boolean;
  detectExtensions?: string[];
  detectFiles?: string[];
  detectFolders?: string[];
  /** Options starship exposes that need no logic here, e.g. `lua_binary`. */
  extraDefaults?: ModuleOptions;
  /** Extra format variables, merged over `symbol` and `version`. */
  variables?(options: ModuleOptions, ctx: ModuleContext): Record<string, ModuleVariable>;
}

function partitionDetections(values: string[]): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  for (const value of values) {
    if (value.startsWith("!")) negative.push(value.slice(1));
    else positive.push(value);
  }
  return { positive, negative };
}

/**
 * Detection with starship's `!` prefix honoured: a leading `!` marks an entry
 * whose presence *vetoes* the match (see `ScanDir::is_match`). nodejs uses this
 * to stand down inside bun and deno projects.
 */
export function detectsProject(options: ModuleOptions, scenario: Scenario): boolean {
  const files = partitionDetections(optStringArray(options, "detect_files"));
  const extensions = partitionDetections(optStringArray(options, "detect_extensions"));
  const folders = partitionDetections(optStringArray(options, "detect_folders"));

  const vetoed = detects(
    {
      detect_files: files.negative,
      detect_extensions: extensions.negative,
      detect_folders: folders.negative,
    },
    scenario,
  );
  if (vetoed) return false;

  return detects(
    {
      detect_files: files.positive,
      detect_extensions: extensions.positive,
      detect_folders: folders.positive,
    },
    scenario,
  );
}

/**
 * The version a module should display, or undefined when the tool is absent.
 * `version_format` is applied when the module has that option.
 */
export function toolVersion(
  name: string,
  options: ModuleOptions,
  ctx: ModuleContext,
): string | undefined {
  const raw = ctx.scenario.toolVersions[name];
  if (raw === undefined) return undefined;
  const versionFormat = options["version_format"];
  return typeof versionFormat === "string" ? formatVersion(raw, versionFormat) : raw.trim();
}

/** Whether any of `detect_variables` / `detect_env_vars` is set in the scenario. */
export function detectsEnvVars(names: string[], scenario: Scenario): boolean {
  return names.some((name) => scenario.env[name] !== undefined);
}

export function defineLanguageModule(spec: LanguageModuleSpec): ModuleDefinition {
  const defaults: ModuleOptions & { format: string; disabled: boolean } = {
    format: spec.format ?? LANGUAGE_FORMAT,
    symbol: spec.symbol,
    style: spec.style,
    disabled: spec.disabled ?? false,
    detect_extensions: spec.detectExtensions ?? [],
    detect_files: spec.detectFiles ?? [],
    detect_folders: spec.detectFolders ?? [],
    ...spec.extraDefaults,
  };
  if (spec.versionFormat !== null) {
    defaults["version_format"] = spec.versionFormat ?? LANGUAGE_VERSION_FORMAT;
  }

  return {
    name: spec.name,
    defaults,
    evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
      if (!detectsProject(options, ctx.scenario)) return null;
      // No reported version means the tool is not installed, and the module
      // has nothing left to show.
      const version = toolVersion(spec.name, options, ctx);
      if (version === undefined) return null;

      const variables: Record<string, ModuleVariable> = {
        symbol: optString(options, "symbol"),
        version,
      };
      return { variables: { ...variables, ...spec.variables?.(options, ctx) } };
    },
  };
}
