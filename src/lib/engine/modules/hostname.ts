import { detectEnvVarsBool, isSshSession, renderMeta } from "./shared";
import {
  type ModuleDefinition,
  type ModuleOptions,
  optBool,
  optString,
  optStringArray,
} from "./types";

function aliasFor(options: ModuleOptions, host: string): string | undefined {
  const aliases = options.aliases;
  if (typeof aliases !== "object" || aliases === null) return undefined;
  const alias = (aliases as Record<string, unknown>)[host];
  return typeof alias === "string" ? alias : undefined;
}

export const hostname: ModuleDefinition = {
  name: "hostname",
  defaults: {
    ssh_only: true,
    ssh_symbol: "🌐 ",
    trim_at: ".",
    detect_env_vars: [],
    format: "[$ssh_symbol$hostname]($style) in ",
    style: "green dimmed bold",
    disabled: false,
    aliases: {},
  },
  evaluate(options, ctx) {
    const { scenario } = ctx;
    const ssh = isSshSession(scenario);

    if (optBool(options, "ssh_only", true) && !ssh) return null;
    if (!detectEnvVarsBool(optStringArray(options, "detect_env_vars"), scenario.env)) return null;

    const trimAt = optString(options, "trim_at");
    const index = trimAt === "" ? -1 : scenario.hostname.indexOf(trimAt);
    const trimmed = index === -1 ? scenario.hostname : scenario.hostname.slice(0, index);

    return {
      variables: {
        ssh_symbol: ssh ? renderMeta(optString(options, "ssh_symbol"), ctx) : undefined,
        hostname: aliasFor(options, trimmed) ?? trimmed,
      },
    };
  },
};
