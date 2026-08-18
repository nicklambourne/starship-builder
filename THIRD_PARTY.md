# Third-party notices

Starship Builder is [MIT licensed](LICENSE). It redistributes the third-party
work listed below. Nothing here is affiliated with or endorsed by the projects
named.

## Bundled fonts

The terminal preview self-hosts five [Nerd Fonts](https://www.nerdfonts.com)
patched monospace families as woff2, so prompt glyphs render for visitors who
have no patched font installed. All were taken from the **Nerd Fonts v3.5.0**
release (published 2026-08-02) at
`https://github.com/ryanoasis/nerd-fonts/releases/latest/download/<Name>.zip`.

Only the Regular and Bold weights of each family's `NerdFontMono` variant are
bundled. Files live in [`public/fonts/`](public/fonts); verbatim licence texts
are in [`public/fonts/licences/`](public/fonts/licences).

| Font | Upstream project | Copyright | Licence | Size |
| --- | --- | --- | --- | ---: |
| JetBrainsMono Nerd Font | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) | © 2020 The JetBrains Mono Project Authors | [SIL OFL 1.1](public/fonts/licences/JetBrainsMono-OFL.txt) | 2.03 MiB |
| FiraCode Nerd Font | [tonsky/FiraCode](https://github.com/tonsky/FiraCode) | © 2014 The Fira Code Project Authors | [SIL OFL 1.1](public/fonts/licences/FiraCode-OFL.txt) | 2.33 MiB |
| Hack Nerd Font | [source-foundry/Hack](https://github.com/source-foundry/Hack) | © 2018 Source Foundry Authors; © 2003 Bitstream, Inc. | [MIT + Bitstream Vera](public/fonts/licences/Hack-LICENSE.md) | 2.34 MiB |
| CaskaydiaCove Nerd Font | [microsoft/cascadia-code](https://github.com/microsoft/cascadia-code) | © 2019–present Microsoft Corporation | [SIL OFL 1.1](public/fonts/licences/CascadiaCode-OFL.txt) | 2.36 MiB |
| SauceCodePro Nerd Font | [adobe-fonts/source-code-pro](https://github.com/adobe-fonts/source-code-pro) | © 2010–2020 Adobe | [SIL OFL 1.1](public/fonts/licences/SourceCodePro-OFL.txt) | 2.00 MiB |

**Total bundled font payload: 11.04 MiB (11,586,668 bytes).**

Each of these licences permits redistribution and embedding, including as a
webfont. The OFL additionally requires that the licence accompany the font and
that the fonts not be sold on their own — both are satisfied here.

### Nerd Fonts patch layer

A patched build is a derivative work, so it carries the upstream font's licence
*plus* the Nerd Fonts project's own terms: MIT for the `font-patcher` tooling
and SIL OFL 1.1 for the patched font output and glyph sources, © 2014 Ryan L
McIntyre. See [`public/fonts/licences/NerdFonts-LICENSE.txt`](public/fonts/licences/NerdFonts-LICENSE.txt).

Two families are renamed upstream for licence compliance: Cascadia Code and
Source Code Pro carry OFL Reserved Font Names, so their patched builds ship as
**CaskaydiaCove** and **SauceCodePro**.

### Fonts considered and excluded

- **UbuntuMono Nerd Font** (Ubuntu Font Licence 1.0) — the UFL requires that
  derivatives stay under the UFL and that *Substantially Changed* versions be
  renamed to drop the original name entirely; the patched build is published
  under the OFL and still called "UbuntuMono". Excluded as unverifiable.
- **Meslo Nerd Font** (Apache 2.0, claimed) — Meslo is a customisation of
  Apple's Menlo and its copyright string credits Apple Inc.; Apple has not
  licensed Menlo for redistribution, so the upstream Apache grant may exceed
  the grantor's rights. Excluded as unverifiable.
- **IosevkaTerm Nerd Font** (SIL OFL 1.1) and **DejaVuSansM Nerd Font**
  (Bitstream Vera) — both licence-clean, excluded only to keep the payload
  within budget. See [`public/fonts/README.md`](public/fonts/README.md).

## Vendored Starship data

Starship's configuration JSON Schema (and, later, its official preset TOMLs)
are vendored under [`data/`](data). Starship is © the Starship contributors and
[ISC licensed](https://github.com/starship/starship/blob/master/LICENSE). See
[`data/README.md`](data/README.md) for retrieval details.
