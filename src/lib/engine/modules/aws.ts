/**
 * `aws` — current AWS profile, region and credential expiry.
 *
 * Port of `src/modules/aws.rs`.
 */

import { aliasFor, optAliasTable } from "./cloudUtils";
import { type ModuleDefinition, optBool, optString } from "./types";

/** Any of these being set is enough for starship to consider AWS usable. */
const CREDENTIAL_ENV_VARS = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
];

export const aws: ModuleDefinition = {
  name: "aws",
  defaults: {
    format: "on [$symbol($profile )(\\($region\\) )(\\[$duration\\] )]($style)",
    symbol: "☁️  ",
    style: "bold yellow",
    disabled: false,
    region_aliases: {},
    profile_aliases: {},
    expiration_symbol: "X",
    force_display: false,
  },

  evaluate(options, { scenario }) {
    const aws = scenario.aws;
    if (!aws) return null;

    const { profile, region, duration } = aws;
    if (profile === undefined && region === undefined) return null;

    // starship hides the module unless it can find usable credentials in
    // `~/.aws`. There is no filesystem here, so a named profile stands in for a
    // credentials-file entry and the key env vars are honoured as they are in
    // starship; `force_display` overrides both, exactly as it does upstream.
    const hasCredentials =
      profile !== undefined ||
      CREDENTIAL_ENV_VARS.some((name) => scenario.env[name] !== undefined);
    if (!optBool(options, "force_display") && !hasCredentials) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        profile: aliasFor(profile, optAliasTable(options, "profile_aliases")),
        region: aliasFor(region, optAliasTable(options, "region_aliases")),
        // The scenario supplies an already-rendered remaining time rather than
        // an expiry timestamp; a leading "-" marks credentials already expired.
        duration:
          duration === undefined
            ? undefined
            : duration.startsWith("-")
              ? optString(options, "expiration_symbol")
              : duration,
      },
    };
  },
};
