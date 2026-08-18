/**
 * `terraform` — selected Terraform workspace (and, on request, version).
 *
 * Port of `src/modules/terraform.rs`.
 */

import { type ModuleDefinition, detects, formatVersion, optString } from "./types";

export const terraform: ModuleDefinition = {
  name: "terraform",
  defaults: {
    format: "via [$symbol$workspace]($style) ",
    version_format: "v${raw}",
    symbol: "💠 ",
    style: "bold 105",
    disabled: false,
    detect_extensions: ["tf", "tfplan", "tfstate"],
    detect_files: [],
    detect_folders: [".terraform"],
    commands: [
      ["terraform", "version"],
      ["tofu", "version"],
    ],
  },

  evaluate(options, { scenario }) {
    if (!detects(options, scenario)) return null;

    // `TF_WORKSPACE` overrides `.terraform/environment`, which itself defaults
    // to "default" when the file is absent — so a Terraform directory always
    // has a workspace to show.
    const workspace =
      scenario.env.TF_WORKSPACE ?? scenario.terraform?.workspace ?? "default";

    const raw = scenario.toolVersions.terraform;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        version:
          raw === undefined
            ? undefined
            : formatVersion(raw, optString(options, "version_format")),
        workspace,
      },
    };
  },
};
