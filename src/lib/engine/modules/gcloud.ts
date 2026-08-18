/**
 * `gcloud` — active Google Cloud configuration, account, project and region.
 *
 * Port of `src/modules/gcloud.rs`.
 */

import { aliasFor, detectEnvVars, optAliasTable } from "./cloudUtils";
import { type ModuleDefinition, optString, optStringArray } from "./types";

export const gcloud: ModuleDefinition = {
  name: "gcloud",
  defaults: {
    format: "on [$symbol$account(@$domain)(\\($region\\))]($style) ",
    symbol: "☁️  ",
    style: "bold blue",
    disabled: false,
    region_aliases: {},
    project_aliases: {},
    detect_env_vars: [],
  },

  evaluate(options, { scenario }) {
    const gcloud = scenario.gcloud;
    if (!gcloud) return null;

    if (!detectEnvVars(scenario, optStringArray(options, "detect_env_vars"))) return null;

    // `$active` is the name of the gcloud configuration, which the scenario has
    // no field for; the CLI's own out-of-the-box name is `default`.
    const active = scenario.env.CLOUDSDK_ACTIVE_CONFIG_NAME ?? "default";
    if (active === "NONE") return null;

    // `account` is stored as `user@domain`, split on the first "@" only.
    const at = gcloud.account?.indexOf("@") ?? -1;
    const account = at >= 0 ? gcloud.account?.slice(0, at) : gcloud.account;
    const domain = at >= 0 ? gcloud.account?.slice(at + 1) : undefined;

    const region = scenario.env.CLOUDSDK_COMPUTE_REGION ?? gcloud.region;
    const project = scenario.env.CLOUDSDK_CORE_PROJECT ?? gcloud.project;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        account,
        domain,
        region: aliasFor(region, optAliasTable(options, "region_aliases")),
        project: aliasFor(project, optAliasTable(options, "project_aliases")),
        active,
      },
    };
  },
};
