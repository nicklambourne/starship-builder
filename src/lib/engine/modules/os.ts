import type { OsType } from "@/lib/scenarios/types";
import { renderMeta } from "./shared";
import { type ModuleDefinition, type ModuleOptions } from "./types";

/**
 * Starship's default symbol table, keyed by `os_info::Type`. The scenario's
 * `OsType` is a subset of these keys; the rest stay here so a user's config
 * round-trips and so the symbol picker has the full list.
 */
const DEFAULT_SYMBOLS: Record<string, string> = {
  AIX: "➿ ",
  Alpaquita: "🔔 ",
  AlmaLinux: "💠 ",
  Alpine: "🏔️ ",
  ALTLinux: "Ⓐ ",
  Amazon: "🙂 ",
  Android: "🤖 ",
  AOSC: "🐱 ",
  Arch: "🎗️ ",
  Artix: "🎗️ ",
  Bazzite: "🎮 ",
  Bluefin: "🐟 ",
  CachyOS: "🎗️ ",
  CentOS: "💠 ",
  Debian: "🌀 ",
  Elementary: "🍏 ",
  DragonFly: "🐉 ",
  Emscripten: "🔗 ",
  EndeavourOS: "🚀 ",
  Fedora: "🎩 ",
  FreeBSD: "😈 ",
  Garuda: "🦅 ",
  Gentoo: "🗜️ ",
  HardenedBSD: "🛡️ ",
  Hurd: "🐂 ",
  Illumos: "🐦 ",
  Ios: "📱 ",
  InstantOS: "⏲️ ",
  Kali: "🐉 ",
  KDENeon: "⚛️ ",
  Linux: "🐧 ",
  Mabox: "📦 ",
  Macos: "🍎 ",
  Manjaro: "🥭 ",
  Mariner: "🌊 ",
  MidnightBSD: "🌘 ",
  Mint: "🌿 ",
  NetBSD: "🚩 ",
  NixOS: "❄️ ",
  Nobara: "🎩 ",
  OpenBSD: "🐡 ",
  OpenCloudOS: "☁️ ",
  openEuler: "🦉 ",
  openSUSE: "🦎 ",
  OracleLinux: "🦴 ",
  PikaOS: "🐤 ",
  Pop: "🍭 ",
  Raspbian: "🍓 ",
  Redhat: "🎩 ",
  RedHatEnterprise: "🎩 ",
  RockyLinux: "💠 ",
  Redox: "🧪 ",
  Solus: "⛵ ",
  SUSE: "🦎 ",
  Ubuntu: "🎯 ",
  Ultramarine: "🔷 ",
  Unknown: "❓ ",
  Uos: "🐲 ",
  Void: "\u{e299} ",
  Windows: "🪟 ",
  Zorin: "🔹 ",
};

/** A user's `symbols` table overrides the defaults entry by entry. */
function symbolFor(options: ModuleOptions, type: OsType): string | undefined {
  const symbols = options.symbols;
  if (typeof symbols === "object" && symbols !== null) {
    const configured = (symbols as Record<string, unknown>)[type];
    if (typeof configured === "string") return configured;
  }
  return DEFAULT_SYMBOLS[type];
}

export const os: ModuleDefinition = {
  name: "os",
  defaults: {
    format: "[$symbol]($style)",
    style: "bold white",
    symbols: DEFAULT_SYMBOLS,
    disabled: true,
  },
  evaluate(options, ctx) {
    const info = ctx.scenario.os;
    if (!info) return null;

    const symbol = symbolFor(options, info.type);

    return {
      variables: {
        symbol: symbol === undefined ? undefined : renderMeta(symbol, ctx),
        // `name` is the display name ("Mac OS"), `type` the enum name ("Macos").
        name: info.name,
        type: info.type,
        codename: info.codename,
        // The scenario models neither the OS version nor its edition.
        edition: undefined,
        version: undefined,
      },
    };
  },
};
