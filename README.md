# 🚀 Starship Builder

A live, in-browser configurator for the [Starship](https://starship.rs)
cross-shell prompt. Toggle modules, tweak formats and styles, and watch a
simulated terminal re-render your prompt instantly — then export the
`starship.toml` that reproduces it.

**Live:** https://nicklambourne.github.io/starship-builder/

> **Status: early days.** The scaffold and project plan are in place; the
> rendering engine is next. See [PLAN.md](PLAN.md) for the full roadmap.

## What it will do

- **Live preview** — a simulated terminal renders your prompt under mocked
  shell contexts: dirty git repo, failed command, polyglot project, SSH, …
- **Every setting, visually** — schema-driven forms for all starship modules,
  with dedicated builders for format strings and style strings.
- **Import / export** — paste your existing `starship.toml`, tweak, export a
  minimal diff-only config. Unknown keys survive the round-trip.
- **Presets** — start from the official presets (Tokyo Night, Pastel
  Powerline, Gruvbox Rainbow, …).
- **Shareable links** — configs compress into the URL fragment. No backend,
  no accounts, nothing leaves your browser.

## Development

With [nix](https://nixos.org) + [direnv](https://direnv.net) (recommended —
pins node/pnpm):

```sh
direnv allow
pnpm install
pnpm dev
```

Or bring your own Node ≥ 20 with pnpm. The site is a fully static Next.js
export (`pnpm build` → `out/`), served under the `/starship-builder` base path.

Stack: Next.js 16 · React 19 · HeroUI v3 · Tailwind CSS v4 · TypeScript.

## Contributing

Not quite ready for contributions until the M1 engine lands (see
[PLAN.md](PLAN.md)) — after that, each starship module is a well-isolated,
~one-file contribution and will be labelled `good first issue`.

## Licence

[MIT](LICENSE). Starship Builder is an unaffiliated community tool. Starship
itself is ISC-licensed — vendored artefacts (config schema, presets) retain
attribution in [data/README.md](data/README.md).
