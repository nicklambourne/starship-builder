/**
 * `openstack` — the selected OpenStack cloud and project.
 *
 * Port of `src/modules/openstack.rs`. Starship falls back to `clouds.yaml` for
 * the project name; with no filesystem, only `OS_PROJECT_NAME` is available.
 */

import { type ModuleDefinition, optString } from "./types";

export const openstack: ModuleDefinition = {
  name: "openstack",
  defaults: {
    format: "on [$symbol$cloud(\\($project\\))]($style) ",
    symbol: "☁️  ",
    style: "bold yellow",
    disabled: false,
  },

  evaluate(options, { scenario }) {
    const cloud = scenario.env.OS_CLOUD;
    if (cloud === undefined) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        cloud,
        project: scenario.env.OS_PROJECT_NAME,
      },
    };
  },
};
