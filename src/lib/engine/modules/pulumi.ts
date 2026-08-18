/**
 * `pulumi` — the Pulumi stack for the project in this directory.
 *
 * Port of `src/modules/pulumi.rs`. Upstream reads the stack from
 * `$PULUMI_HOME/workspaces/*.json` and the username from `credentials.json`;
 * neither exists here, so the builder sources them from the scenario's
 * `PULUMI_STACK` and `PULUMI_USERNAME` env vars instead.
 */

import { type ModuleDefinition, formatVersion, optString } from "./types";

const PROJECT_FILES = ["Pulumi.yaml", "Pulumi.yml"];

export const pulumi: ModuleDefinition = {
  name: "pulumi",
  defaults: {
    format: "via [$symbol($username@)$stack]($style) ",
    version_format: "v${raw}",
    // Nerd Font U+F1B2 (nf-fa-cubes), escaped so the glyph survives tooling.
    symbol: "\uF1B2 ",
    style: "bold 5",
    disabled: false,
    search_upwards: true,
  },

  evaluate(options, { scenario }) {
    // `search_upwards` walks parent directories upstream; the scenario only
    // describes the cwd, so both settings collapse to "project file is here".
    if (!PROJECT_FILES.some((file) => scenario.files.includes(file))) return null;

    const raw = scenario.toolVersions.pulumi;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        version:
          raw === undefined
            ? undefined
            : formatVersion(raw, optString(options, "version_format")),
        username: scenario.env.PULUMI_USERNAME,
        stack: scenario.env.PULUMI_STACK,
      },
    };
  },
};
