# Vendored data

## `config-schema.json`

Starship's published configuration JSON Schema, generated from its Rust config
structs. Source: https://starship.rs/config-schema.json (retrieved 2026-08-18).

Starship is © the Starship contributors, [ISC
licensed](https://github.com/starship/starship/blob/master/LICENSE).

Refresh with:

```sh
curl -fsSL https://starship.rs/config-schema.json -o data/config-schema.json
```

(A `pnpm sync:schema` script with a diff report is planned — see PLAN.md §6.)

## `presets/` (planned, M3)

Official preset TOMLs vendored from
https://github.com/starship/starship/tree/master/docs/public/presets/toml —
same ISC licence and attribution.
