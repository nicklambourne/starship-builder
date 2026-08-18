/**
 * Language modules that are pure "detect the project, show the version".
 *
 * Every default here is copied verbatim from starship's `src/configs/*.rs`.
 * Symbols are Nerd Font / emoji glyphs and must stay byte-exact; the ones that
 * are invisible or ambiguous in an editor are written as escapes.
 */

import { type ModuleDefinition } from "./types";
import { defineLanguageModule } from "./language";

export const SIMPLE_LANGUAGE_MODULES: ModuleDefinition[] = [
  defineLanguageModule({
    name: "buf",
    format: "with [$symbol($version )]($style)",
    symbol: "🐃 ",
    style: "bold blue",
    detectFiles: ["buf.yaml", "buf.gen.yaml", "buf.work.yaml"],
  }),
  defineLanguageModule({
    name: "bun",
    symbol: "🥟 ",
    style: "bold red",
    detectFiles: ["bun.lock", "bun.lockb", "bunfig.toml"],
  }),
  defineLanguageModule({
    name: "c",
    format: "via [$symbol($version(-$name) )]($style)",
    symbol: "C ",
    style: "149 bold",
    // `$name` is the detected compiler (gcc / clang). It comes from parsing
    // `cc --version` output, which the scenario does not model, so it stays
    // empty and its conditional group renders nothing.
    extraDefaults: {
      commands: [
        ["cc", "--version"],
        ["gcc", "--version"],
        ["clang", "--version"],
      ],
    },
    detectExtensions: ["c", "h"],
  }),
  defineLanguageModule({
    name: "cmake",
    symbol: "△ ",
    style: "bold blue",
    detectFiles: ["CMakeLists.txt", "CMakeCache.txt"],
  }),
  defineLanguageModule({
    name: "cobol",
    // U+2699 plus a variation selector, then one space.
    symbol: "⚙️ ",
    style: "bold blue",
    detectExtensions: ["cbl", "cob", "CBL", "COB"],
  }),
  defineLanguageModule({
    name: "cpp",
    format: "via [$symbol($version(-$name) )]($style)",
    symbol: "C++ ",
    style: "149 bold",
    disabled: true,
    // See the `c` module for why `$name` is never bound.
    extraDefaults: {
      commands: [
        ["c++", "--version"],
        ["g++", "--version"],
        ["clang++", "--version"],
      ],
    },
    detectExtensions: ["cpp", "cc", "cxx", "c++", "hpp", "hh", "hxx", "h++", "tcc"],
  }),
  defineLanguageModule({
    name: "crystal",
    symbol: "🔮 ",
    style: "bold red",
    detectExtensions: ["cr"],
    detectFiles: ["shard.yml"],
  }),
  defineLanguageModule({
    name: "daml",
    symbol: "Λ ",
    style: "bold cyan",
    detectFiles: ["daml.yaml"],
  }),
  defineLanguageModule({
    name: "dart",
    symbol: "🎯 ",
    style: "bold blue",
    detectExtensions: ["dart"],
    detectFiles: ["pubspec.yaml", "pubspec.yml", "pubspec.lock"],
    detectFolders: [".dart_tool"],
  }),
  defineLanguageModule({
    name: "deno",
    symbol: "🦕 ",
    style: "green bold",
    detectFiles: [
      "deno.json",
      "deno.jsonc",
      "deno.lock",
      "mod.ts",
      "deps.ts",
      "mod.js",
      "deps.js",
    ],
  }),
  defineLanguageModule({
    name: "dotnet",
    format: "via [$symbol($version )(🎯 $tfm )]($style)",
    symbol: ".NET ",
    style: "blue bold",
    // `heuristic` picks between reading the SDK version from project files and
    // shelling out to `dotnet --version`; both resolve to the scenario's
    // version here. `$tfm` needs the .csproj contents, so it stays empty.
    extraDefaults: { heuristic: true },
    detectExtensions: ["csproj", "fsproj", "xproj"],
    detectFiles: [
      "global.json",
      "project.json",
      "Directory.Build.props",
      "Directory.Build.targets",
      "Packages.props",
    ],
  }),
  defineLanguageModule({
    name: "elm",
    symbol: "🌳 ",
    style: "cyan bold",
    detectExtensions: ["elm"],
    detectFiles: ["elm.json", "elm-package.json", ".elm-version"],
    detectFolders: ["elm-stuff"],
  }),
  defineLanguageModule({
    name: "erlang",
    // Nerd Font private-use glyph.
    symbol: " ",
    style: "bold red",
    detectFiles: ["rebar.config", "erlang.mk"],
  }),
  defineLanguageModule({
    name: "fennel",
    symbol: "🧅 ",
    style: "bold green",
    disabled: true,
    detectExtensions: ["fnl"],
  }),
  defineLanguageModule({
    name: "fortran",
    format: "via [$symbol($version(-$name) )]($style)",
    versionFormat: "${raw}",
    // U+1F175 followed by TWO spaces, as in starship.
    symbol: "🅵  ",
    style: "bold purple",
    // See the `c` module for why `$name` is never bound.
    extraDefaults: {
      commands: [
        ["gfortran", "--version"],
        ["flang", "--version"],
        ["flang-new", "--version"],
      ],
    },
    detectExtensions: [
      "f",
      "F",
      "for",
      "FOR",
      "ftn",
      "FTN",
      "f77",
      "F77",
      "f90",
      "F90",
      "f95",
      "F95",
      "f03",
      "F03",
      "f08",
      "F08",
      "f18",
      "F18",
    ],
    detectFiles: ["fpm.toml"],
  }),
  defineLanguageModule({
    name: "gleam",
    symbol: "⭐ ",
    style: "bold #FFAFF3",
    detectExtensions: ["gleam"],
    detectFiles: ["gleam.toml"],
  }),
  defineLanguageModule({
    name: "golang",
    symbol: "🐹 ",
    style: "bold cyan",
    // `not_capable_style` and `$mod_version` need go.mod's `go` directive, which
    // the scenario does not carry; the module always renders as capable.
    extraDefaults: { not_capable_style: "bold red" },
    detectExtensions: ["go"],
    detectFiles: [
      "go.mod",
      "go.sum",
      "go.work",
      "glide.yaml",
      "Gopkg.yml",
      "Gopkg.lock",
      ".go-version",
    ],
    detectFolders: ["Godeps"],
  }),
  defineLanguageModule({
    name: "gradle",
    symbol: "🅶 ",
    style: "bold bright-cyan",
    // `recursive` widens the search for gradle-wrapper.properties; the scenario
    // only lists the current directory, so it has no effect here.
    extraDefaults: { recursive: false },
    detectExtensions: ["gradle", "gradle.kts"],
    detectFolders: ["gradle"],
  }),
  defineLanguageModule({
    name: "haskell",
    symbol: "λ ",
    style: "bold purple",
    detectExtensions: ["hs", "cabal", "hs-boot"],
    detectFiles: ["stack.yaml", "cabal.project"],
  }),
  defineLanguageModule({
    name: "haxe",
    symbol: "⌘ ",
    style: "bold fg:202",
    detectExtensions: ["hx", "hxml"],
    detectFiles: ["haxelib.json", "hxformat.json", ".haxerc"],
    detectFolders: [".haxelib", "haxe_libraries"],
  }),
  defineLanguageModule({
    name: "helm",
    symbol: "⎈ ",
    style: "bold white",
    detectFiles: ["helmfile.yaml", "Chart.yaml"],
  }),
  defineLanguageModule({
    name: "java",
    symbol: "☕ ",
    style: "red dimmed",
    detectExtensions: ["java", "class", "jar", "gradle", "clj", "cljc"],
    detectFiles: [
      "pom.xml",
      "build.gradle.kts",
      "build.sbt",
      ".java-version",
      "deps.edn",
      "project.clj",
      "build.boot",
      ".sdkmanrc",
    ],
  }),
  defineLanguageModule({
    name: "julia",
    symbol: "ஃ ",
    style: "bold purple",
    detectExtensions: ["jl"],
    detectFiles: ["Project.toml", "Manifest.toml"],
  }),
  defineLanguageModule({
    name: "kotlin",
    symbol: "🅺 ",
    style: "bold blue",
    extraDefaults: { kotlin_binary: "kotlin" },
    detectExtensions: ["kt", "kts"],
  }),
  defineLanguageModule({
    name: "lua",
    symbol: "🌙 ",
    style: "bold blue",
    extraDefaults: { lua_binary: "lua" },
    detectExtensions: ["lua"],
    detectFiles: [".lua-version"],
    detectFolders: ["lua"],
  }),
  defineLanguageModule({
    name: "maven",
    symbol: "🅼 ",
    style: "bold bright-cyan",
    extraDefaults: { recursive: false },
    detectFiles: ["pom.xml"],
  }),
  defineLanguageModule({
    name: "mojo",
    format: "with [$symbol($version )]($style)",
    // starship gives mojo no `version_format`; the version is shown verbatim.
    versionFormat: null,
    symbol: "🔥 ",
    style: "bold 208",
    detectExtensions: ["mojo", "🔥"],
  }),
  defineLanguageModule({
    name: "nim",
    symbol: "👑 ",
    style: "yellow bold",
    detectExtensions: ["nim", "nims", "nimble"],
    detectFiles: ["nim.cfg"],
  }),
  defineLanguageModule({
    name: "opa",
    symbol: "🪖 ",
    style: "bold blue",
    detectExtensions: ["rego"],
  }),
  defineLanguageModule({
    name: "perl",
    symbol: "🐪 ",
    style: "149 bold",
    detectExtensions: ["pl", "pm", "pod"],
    detectFiles: [
      "Makefile.PL",
      "Build.PL",
      "cpanfile",
      "cpanfile.snapshot",
      "META.json",
      "META.yml",
      ".perl-version",
    ],
  }),
  defineLanguageModule({
    name: "php",
    symbol: "🐘 ",
    style: "147 bold",
    detectExtensions: ["php"],
    detectFiles: ["composer.json", ".php-version"],
  }),
  defineLanguageModule({
    name: "purescript",
    symbol: "<=> ",
    style: "bold white",
    detectExtensions: ["purs"],
    detectFiles: ["spago.dhall", "spago.yaml", "spago.lock"],
  }),
  defineLanguageModule({
    name: "quarto",
    symbol: "⨁ ",
    style: "bold #75AADB",
    detectExtensions: ["qmd"],
    detectFiles: ["_quarto.yml"],
  }),
  defineLanguageModule({
    name: "red",
    symbol: "🔺 ",
    style: "red bold",
    detectExtensions: ["red", "reds"],
  }),
  defineLanguageModule({
    name: "rlang",
    symbol: "📐 ",
    style: "blue bold",
    detectExtensions: ["R", "Rd", "Rmd", "Rproj", "Rsx"],
    detectFiles: ["DESCRIPTION"],
    detectFolders: [".Rproj.user"],
  }),
  defineLanguageModule({
    name: "rust",
    symbol: "🦀 ",
    style: "bold red",
    detectExtensions: ["rs"],
    detectFiles: ["Cargo.toml"],
  }),
  defineLanguageModule({
    name: "scala",
    symbol: "🆂 ",
    style: "red bold",
    detectExtensions: ["sbt", "scala"],
    detectFiles: [".scalaenv", ".sbtenv", "build.sbt"],
    detectFolders: [".metals"],
  }),
  defineLanguageModule({
    name: "solidity",
    format: "via [$symbol($version)]($style)",
    versionFormat: "v${major}.${minor}.${patch}",
    symbol: "S ",
    style: "bold blue",
    extraDefaults: { compiler: ["solc"] },
    detectExtensions: ["sol"],
  }),
  defineLanguageModule({
    name: "swift",
    symbol: "🐦 ",
    style: "bold 202",
    detectExtensions: ["swift"],
    detectFiles: ["Package.swift"],
  }),
  defineLanguageModule({
    name: "typst",
    symbol: "t ",
    style: "bold #0093A7",
    detectExtensions: ["typ"],
    detectFiles: ["template.typ"],
  }),
  defineLanguageModule({
    name: "vagrant",
    symbol: "⍱ ",
    style: "cyan bold",
    detectFiles: ["Vagrantfile"],
  }),
  defineLanguageModule({
    name: "vlang",
    symbol: "V ",
    style: "blue bold",
    detectExtensions: ["v"],
    detectFiles: ["v.mod", "vpkg.json", ".vpkg-lock.json"],
  }),
  defineLanguageModule({
    name: "xmake",
    symbol: "△ ",
    style: "bold green",
    detectFiles: ["xmake.lua"],
  }),
  defineLanguageModule({
    name: "zig",
    symbol: "↯ ",
    style: "bold yellow",
    detectExtensions: ["zig"],
  }),
];
