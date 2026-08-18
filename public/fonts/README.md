# Bundled terminal fonts

The terminal preview offers a set of self-hosted [Nerd Fonts](https://www.nerdfonts.com)
patched builds so that prompt glyphs (powerline separators, devicons, git
symbols) render for every visitor, whether or not they have a patched font
installed locally.

Every font here is redistributable and web-embeddable under its licence. All
files were taken from the **Nerd Fonts v3.5.0** release (published 2026-08-02),
via `https://github.com/ryanoasis/nerd-fonts/releases/latest/download/<Name>.zip`.

## What is bundled

Only the **Regular** and **Bold** weights of the **Mono** (`NerdFontMono`)
variant of each family. The Mono variant forces the added icon glyphs into a
single cell, which is how a real terminal renders them — the default and Propo
variants use wider icons and would misalign the simulated columns. Italics are
not bundled; nothing in the preview renders italic text.

| Font | CSS family | Upstream project | Licence | Licence file | Regular | Bold |
| --- | --- | --- | --- | --- | ---: | ---: |
| JetBrainsMono Nerd Font (default) | `JetBrainsMono Nerd Font Mono` | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) | SIL OFL 1.1 | [`licences/JetBrainsMono-OFL.txt`](licences/JetBrainsMono-OFL.txt) | 1.01 MiB | 1.02 MiB |
| FiraCode Nerd Font | `FiraCode Nerd Font Mono` | [tonsky/FiraCode](https://github.com/tonsky/FiraCode) | SIL OFL 1.1 | [`licences/FiraCode-OFL.txt`](licences/FiraCode-OFL.txt) | 1.16 MiB | 1.16 MiB |
| Hack Nerd Font | `Hack Nerd Font Mono` | [source-foundry/Hack](https://github.com/source-foundry/Hack) | MIT (+ Bitstream Vera) | [`licences/Hack-LICENSE.md`](licences/Hack-LICENSE.md) | 1.17 MiB | 1.17 MiB |
| CaskaydiaCove Nerd Font | `CaskaydiaCove Nerd Font Mono` | [microsoft/cascadia-code](https://github.com/microsoft/cascadia-code) | SIL OFL 1.1 | [`licences/CascadiaCode-OFL.txt`](licences/CascadiaCode-OFL.txt) | 1.18 MiB | 1.18 MiB |
| SauceCodePro Nerd Font | `SauceCodePro Nerd Font Mono` | [adobe-fonts/source-code-pro](https://github.com/adobe-fonts/source-code-pro) | SIL OFL 1.1 | [`licences/SourceCodePro-OFL.txt`](licences/SourceCodePro-OFL.txt) | 1.00 MiB | 1.00 MiB |

**Total: 11.04 MiB (11,586,668 bytes) across 10 woff2 files.**

The picker also offers a *System monospace (no Nerd Font)* option. It bundles
nothing and falls back to the OS monospace stack, so users can see how their
prompt degrades on an unpatched font.

Two names differ from their upstream project on purpose. Cascadia Code and
Source Code Pro are released under the OFL with Reserved Font Names
(`Cascadia Code` and `Source` respectively); OFL §3 forbids a modified build
from carrying a reserved name, so Nerd Fonts ships the patched versions as
**CaskaydiaCove** and **SauceCodePro**. Those are the correct, licence-compliant
names and are kept verbatim here.

## Licensing

A patched Nerd Font is a derivative work carrying two licence layers:

1. **The upstream font's licence**, which governs the original outlines. Verbatim
   copies of each are in [`licences/`](licences), taken from the release archives.
2. **The Nerd Fonts project's own licence** for the patcher and the added glyph
   set — MIT for the tooling, SIL OFL 1.1 for the patched font output and glyph
   sources (Copyright © 2014 Ryan L McIntyre). See
   [`licences/NerdFonts-LICENSE.txt`](licences/NerdFonts-LICENSE.txt).

All five bundled fonts permit redistribution and embedding, including as
webfonts. The OFL requires that the licence travel with the font and that the
fonts not be sold on their own; both hold here. Hack adds the Bitstream Vera
licence for the outlines it inherits via DejaVu, which likewise permits
redistribution and embedding and only reserves the names "Bitstream" and
"Vera" — neither of which appears in "Hack Nerd Font".

## Deliberately excluded

| Font | Licence | Why it is not bundled |
| --- | --- | --- |
| **UbuntuMono Nerd Font** | Ubuntu Font Licence 1.0 | Two unresolved problems. The UFL states that fonts and derivatives "cannot be released under any other licence", which conflicts with Nerd Fonts publishing its patched output under the OFL; and a *Substantially Changed* derivative "must be renamed to avoid use of the name of the Original Version or similar names entirely", yet the patched build ships as "UbuntuMono Nerd Font". "Ubuntu" is also a Canonical trademark. Excluded as unverifiable. |
| **Meslo Nerd Font** | Apache 2.0 (claimed) | Meslo is Apache-2.0 by André Berg, but it is a customisation of **Apple's Menlo**, and the font's own copyright string credits Apple Inc. (2009) alongside Bitstream. Apple has not licensed Menlo for redistribution, so the Apache grant is made by someone who may not hold the necessary rights. The chain cannot be verified; excluded. |
| **IosevkaTerm Nerd Font** | SIL OFL 1.1 | Licence is fine — excluded purely on size. At 4.94 MiB for two weights it costs 2.5× any other candidate and alone would have broken the payload budget. |
| **DejaVuSansM Nerd Font** | Bitstream Vera + Arev | Licence is fine — excluded on size/redundancy. It was the marginal font over budget, and its Bitstream Vera lineage is already represented by Hack. |

## Size policy

Nerd Font builds carry several thousand icon glyphs, and the preview renders
arbitrary glyphs from user-supplied config — a user may put any Unicode
codepoint in a `format` string. Subsetting to a fixed glyph list would silently
break those configs, so **glyph coverage is never reduced**. The only levers
used are:

- woff2 compression (roughly 2.7 MB TTF → 1.1 MB woff2, ~57% saved);
- Regular + Bold only, Mono variant only;
- limiting the *number* of bundled families.

All seven licence-clean candidates would have totalled 18.4 MiB, over the
~12 MiB budget, so the two largest/most redundant were dropped rather than
subsetting any font. The result is 11.04 MiB.

This is a repository and deploy cost, not a page-load cost: `@font-face` faces
are fetched lazily, so a visitor downloads only the weights of the font they
actually select — about 1 MiB for the default, and nothing at all for the
system-monospace option.

## Reproducing these files

```sh
curl -LO https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip
unzip -j JetBrainsMono.zip 'JetBrainsMonoNerdFontMono-Regular.ttf' \
                           'JetBrainsMonoNerdFontMono-Bold.ttf' -d ttf/
nix-shell -p woff2 --run 'woff2_compress ttf/JetBrainsMonoNerdFontMono-Regular.ttf'
```

The woff2 files are a lossless repackaging of the release TTFs — the conversion
changes the container only, never the outlines, metrics, or name table.
