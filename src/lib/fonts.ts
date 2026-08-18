/**
 * The terminal fonts offered by the preview.
 *
 * Every bundled face is a Nerd Font patched build, self-hosted as woff2 under
 * `public/fonts/`, and redistributable under a licence that permits web
 * embedding (SIL OFL 1.1, MIT, or Bitstream Vera). The matching `@font-face`
 * declarations are in `src/app/fonts.css` — the `font-family` names below must
 * stay identical to the ones declared there.
 *
 * Provenance, per-font licence reasoning and the fonts deliberately excluded
 * are documented in `public/fonts/README.md` and `THIRD_PARTY.md`. Verbatim
 * licence texts ship alongside the fonts in `public/fonts/licences/`, served
 * at `/starship-builder/fonts/licences/<file>`.
 *
 * `licenceUrl` intentionally points at the upstream canonical licence rather
 * than the bundled copy: it is an absolute URL, so it is safe to render as a
 * plain link without worrying about the site's `/starship-builder` base path.
 */

export interface TerminalFont {
  /** Stable identifier; persisted in shareable links, so never renamed. */
  id: string;
  /** Human-readable name for the font picker. */
  label: string;
  /** Ready-to-use CSS `font-family` value, including fallbacks. */
  stack: string;
  /** Short licence name, e.g. "SIL OFL 1.1". */
  licence: string;
  /** Upstream canonical licence URL. Empty for the non-bundled system option. */
  licenceUrl: string;
  /** Where the bundled file came from. Empty for the non-bundled system option. */
  source: string;
}

/** Appended to every bundled stack so a failed webfont still renders as mono. */
const FALLBACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const TERMINAL_FONTS: TerminalFont[] = [
  {
    id: "jetbrains-mono",
    label: "JetBrainsMono Nerd Font",
    stack: `'JetBrainsMono Nerd Font Mono', 'JetBrainsMono NFM', 'JetBrains Mono', ${FALLBACK}`,
    licence: "SIL OFL 1.1",
    licenceUrl: "https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt",
    source:
      "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip",
  },
  {
    id: "fira-code",
    label: "FiraCode Nerd Font",
    stack: `'FiraCode Nerd Font Mono', 'FiraCode NFM', 'Fira Code', ${FALLBACK}`,
    licence: "SIL OFL 1.1",
    licenceUrl: "https://github.com/tonsky/FiraCode/blob/master/LICENSE",
    source:
      "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/FiraCode.zip",
  },
  {
    id: "hack",
    label: "Hack Nerd Font",
    stack: `'Hack Nerd Font Mono', 'Hack NFM', 'Hack', ${FALLBACK}`,
    licence: "MIT (with Bitstream Vera for inherited outlines)",
    licenceUrl: "https://github.com/source-foundry/Hack/blob/master/LICENSE.md",
    source:
      "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/Hack.zip",
  },
  {
    id: "caskaydia-cove",
    label: "CaskaydiaCove Nerd Font (Cascadia Code)",
    stack: `'CaskaydiaCove Nerd Font Mono', 'CaskaydiaCove NFM', 'Cascadia Code', ${FALLBACK}`,
    licence: "SIL OFL 1.1",
    licenceUrl:
      "https://github.com/microsoft/cascadia-code/blob/main/LICENSE",
    source:
      "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/CascadiaCode.zip",
  },
  {
    id: "sauce-code-pro",
    label: "SauceCodePro Nerd Font (Source Code Pro)",
    stack: `'SauceCodePro Nerd Font Mono', 'SauceCodePro NFM', 'Source Code Pro', ${FALLBACK}`,
    licence: "SIL OFL 1.1",
    licenceUrl:
      "https://github.com/adobe-fonts/source-code-pro/blob/release/LICENSE.md",
    source:
      "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/SourceCodePro.zip",
  },
  {
    /**
     * Not bundled: renders with whatever monospace font the OS provides, so
     * users can see how the prompt degrades without a patched Nerd Font.
     */
    id: "system",
    label: "System monospace (no Nerd Font)",
    stack: FALLBACK,
    licence: "Not bundled — provided by the operating system",
    licenceUrl: "",
    source: "",
  },
];
