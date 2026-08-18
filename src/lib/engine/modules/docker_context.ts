/**
 * `docker_context` — the active Docker context.
 *
 * Port of `src/modules/docker_context.rs`.
 */

import { type ModuleDefinition, detects, optBool, optString } from "./types";

/** Contexts starship treats as "nothing worth showing". */
const IMPLICIT_CONTEXTS = ["default", "desktop-linux"];

export const dockerContext: ModuleDefinition = {
  name: "docker_context",
  defaults: {
    symbol: "🐳 ",
    style: "blue bold",
    format: "via [$symbol$context]($style) ",
    only_with_files: true,
    disabled: false,
    detect_extensions: [],
    detect_files: [
      "compose.yml",
      "compose.yaml",
      "docker-compose.yml",
      "docker-compose.yaml",
      "Dockerfile",
    ],
    detect_folders: [],
  },

  evaluate(options, { scenario }) {
    if (optBool(options, "only_with_files", true) && !detects(options, scenario)) {
      return null;
    }

    // Same precedence as docker itself: the env vars override the value that
    // `~/.docker/config.json` (modelled by `scenario.docker`) would supply.
    const fromEnv = ["DOCKER_MACHINE_NAME", "DOCKER_HOST", "DOCKER_CONTEXT"]
      .map((name) => scenario.env[name])
      .find((value) => value !== undefined);

    const context = fromEnv ?? scenario.docker?.context;
    if (context === undefined) return null;
    if (IMPLICIT_CONTEXTS.includes(context) || context.startsWith("unix://")) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        context,
      },
    };
  },
};
