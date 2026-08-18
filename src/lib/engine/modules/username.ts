import { detectEnvVars, isSshSession } from "./shared";
import {
  type ModuleDefinition,
  type ModuleOptions,
  optBool,
  optString,
  optStringArray,
} from "./types";

/** `aliases` is a `from = to` table. */
function aliasFor(options: ModuleOptions, username: string): string | undefined {
  const aliases = options.aliases;
  if (typeof aliases !== "object" || aliases === null) return undefined;
  const alias = (aliases as Record<string, unknown>)[username];
  return typeof alias === "string" ? alias : undefined;
}

export const username: ModuleDefinition = {
  name: "username",
  defaults: {
    detect_env_vars: [],
    format: "[$user]($style) in ",
    style_root: "red bold",
    style_user: "yellow bold",
    show_always: false,
    disabled: false,
    aliases: {},
  },
  evaluate(options, ctx) {
    const { scenario } = ctx;
    const detected = detectEnvVars(optStringArray(options, "detect_env_vars"), scenario.env);

    const isRoot = scenario.isRoot;
    // `$LOGNAME` differing from the username means this is not the login user.
    const isLoginUser =
      scenario.env.LOGNAME === undefined || scenario.env.LOGNAME === scenario.username;

    const show =
      optBool(options, "show_always") ||
      isRoot ||
      !isLoginUser ||
      isSshSession(scenario) ||
      detected === "yes";

    if (!show || detected === "negated") return null;

    const user = aliasFor(options, scenario.username) ?? scenario.username;
    const style = optString(options, isRoot ? "style_root" : "style_user");

    return { variables: { user }, styleVariables: { style } };
  },
};
