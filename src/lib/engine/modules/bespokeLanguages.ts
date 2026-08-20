/**
 * Language / toolchain modules that do more than "detect, then show a version".
 *
 * Defaults are copied verbatim from starship's `src/configs/*.rs`. Where a
 * module reads something the scenario cannot model — file contents, `opam
 * switch show`, `mise doctor` — the closest available scenario field is used
 * and the substitution is noted on the module.
 */

import {
  type ModuleContext,
  type ModuleDefinition,
  type ModuleOptions,
  type ModuleResult,
  optBool,
  optString,
  optStringArray,
} from "./types";
import {
  LANGUAGE_FORMAT,
  LANGUAGE_VERSION_FORMAT,
  VERSIONED_MODULE_NAMES,
  defineLanguageModule,
  detectsEnvVars,
  detectsProject,
  toolVersion,
} from "./language";

/** Manifests `package` knows how to read a project version out of. */
const PACKAGE_MANIFESTS = [
  "Cargo.toml",
  "package.json",
  "deno.json",
  "deno.jsonc",
  "jsr.json",
  "jsr.jsonc",
  "pyproject.toml",
  "setup.cfg",
  "composer.json",
  "gradle.properties",
  "build.gradle",
  "build.gradle.kts",
  "Project.toml",
  "mix.exs",
  "Chart.yaml",
  "pom.xml",
  "meson.build",
  "shard.yml",
  "v.mod",
  "vpkg.json",
  "build.sbt",
  "daml.yaml",
  "pubspec.yaml",
  "DESCRIPTION",
  "galaxy.yml",
];

const python: ModuleDefinition = {
  name: "python",
  defaults: {
    pyenv_version_name: false,
    pyenv_prefix: "pyenv ",
    python_binary: ["python", "python3", "python2"],
    format: "via [${symbol}${pyenv_prefix}(${version} )(\\($virtualenv\\) )]($style)",
    version_format: LANGUAGE_VERSION_FORMAT,
    style: "yellow bold",
    symbol: "🐍 ",
    disabled: false,
    detect_extensions: ["py", "ipynb"],
    detect_files: [
      "requirements.txt",
      ".python-version",
      "pyproject.toml",
      "Pipfile",
      "tox.ini",
      "setup.py",
      "__init__.py",
    ],
    detect_folders: [],
    detect_env_vars: ["VIRTUAL_ENV"],
    // Names treated as too generic to display (starship then shows the parent
    // directory). The scenario supplies a resolved name, not a path, so this
    // option is carried for config fidelity but cannot change the output.
    generic_venv_names: [],
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    const { scenario } = ctx;
    const virtualenv = scenario.python?.virtualenv;
    const envNames = optStringArray(options, "detect_env_vars");
    // An active virtualenv implies VIRTUAL_ENV is set, whether or not the
    // scenario also spells it out in `env`.
    const envDetected =
      envNames.length > 0 &&
      (detectsEnvVars(envNames, scenario) ||
        (virtualenv !== undefined && envNames.includes("VIRTUAL_ENV")));

    if (!detectsProject(options, scenario) && !envDetected) return null;

    const usePyenv = optBool(options, "pyenv_version_name");
    // pyenv reports a version *name* (e.g. `system`, `3.12.1`), so starship
    // skips `version_format` on this path.
    const version = usePyenv
      ? (scenario.env["PYENV_VERSION"] ?? scenario.toolVersions["python"])
      : toolVersion("python", options, ctx);

    // An active virtualenv is worth showing even with no python on PATH.
    if (version === undefined && virtualenv === undefined) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        pyenv_prefix: usePyenv ? optString(options, "pyenv_prefix") : "",
        version,
        virtualenv,
      },
    };
  },
};

const nodejs: ModuleDefinition = {
  name: "nodejs",
  defaults: {
    format: LANGUAGE_FORMAT,
    version_format: LANGUAGE_VERSION_FORMAT,
    // Nerd Font private-use glyph.
    symbol: "\ue718 ",
    style: "bold green",
    disabled: false,
    // Approximation: `not_capable_style` and `$engines_version` require the
    // `engines.node` range from package.json, which the scenario does not
    // carry. The module therefore always renders as capable, in `style`.
    not_capable_style: "bold red",
    detect_extensions: ["js", "mjs", "cjs", "ts", "mts", "cts"],
    detect_files: [
      "package.json",
      ".node-version",
      ".nvmrc",
      "!bunfig.toml",
      "!bun.lock",
      "!bun.lockb",
      "!deno.json",
      "!deno.jsonc",
      "!deno.lock",
    ],
    detect_folders: ["node_modules"],
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    if (!detectsProject(options, ctx.scenario)) return null;
    // esy projects are OCaml projects that happen to look like Node ones.
    const isEsy = ctx.scenario.files.some((f) => f === "esy.lock" || f === "esy.lock/");
    if (isEsy) return null;

    const version = toolVersion("nodejs", options, ctx);
    if (version === undefined) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        version,
        engines_version: undefined,
      },
    };
  },
};

const packageModule: ModuleDefinition = {
  name: "package",
  defaults: {
    format: "is [$symbol$version]($style) ",
    symbol: "📦 ",
    style: "208 bold",
    display_private: false,
    disabled: false,
    version_format: LANGUAGE_VERSION_FORMAT,
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    const { files } = ctx.scenario;
    const hasManifest =
      files.some((f) => PACKAGE_MANIFESTS.includes(f)) || files.some((f) => f.endsWith(".nimble"));
    if (!hasManifest) return null;

    // The project version stands in `toolVersions.package`, since the scenario
    // lists file names but not their contents. `display_private` is carried for
    // config fidelity: whether a package.json is private is unknowable here.
    const version = toolVersion("package", options, ctx);
    if (version === undefined) return null;

    return { variables: { symbol: optString(options, "symbol"), version } };
  },
};

const ruby: ModuleDefinition = {
  name: "ruby",
  defaults: {
    format: LANGUAGE_FORMAT,
    version_format: LANGUAGE_VERSION_FORMAT,
    symbol: "💎 ",
    style: "bold red",
    disabled: false,
    detect_extensions: ["rb"],
    detect_files: ["Gemfile", ".ruby-version"],
    detect_folders: [],
    detect_variables: ["RUBY_VERSION", "RBENV_VERSION"],
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    const detected =
      detectsProject(options, ctx.scenario) ||
      detectsEnvVars(optStringArray(options, "detect_variables"), ctx.scenario);
    if (!detected) return null;

    const version = toolVersion("ruby", options, ctx);
    if (version === undefined) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        version,
        // `$gemset` comes from `rvm current`, which has no scenario equivalent.
        gemset: undefined,
      },
    };
  },
};

const ocaml = defineLanguageModule({
  name: "ocaml",
  format: "via [$symbol($version )(\\($switch_indicator$switch_name\\) )]($style)",
  symbol: "🐫 ",
  style: "bold yellow",
  extraDefaults: { global_switch_indicator: "", local_switch_indicator: "*" },
  detectExtensions: ["opam", "ml", "mli", "re", "rei"],
  detectFiles: ["dune", "dune-project", "jbuild", "jbuild-ignore", ".merlin"],
  detectFolders: ["_opam", "esy.lock"],
  // starship runs `opam switch show`; OPAMSWITCH is the same value opam itself
  // reads. An absolute path is a local (per-project) switch, shown by its last
  // path component; anything else is a global switch.
  variables(options, ctx) {
    const opamSwitch = ctx.scenario.env["OPAMSWITCH"];
    if (opamSwitch === undefined || opamSwitch.length === 0) return {};
    const isLocal = opamSwitch.startsWith("/");
    return {
      switch_indicator: optString(
        options,
        isLocal ? "local_switch_indicator" : "global_switch_indicator",
      ),
      switch_name: isLocal ? (opamSwitch.split("/").pop() ?? opamSwitch) : opamSwitch,
    };
  },
});

const elixir = defineLanguageModule({
  name: "elixir",
  format: "via [$symbol($version \\(OTP $otp_version\\) )]($style)",
  symbol: "💧 ",
  style: "bold purple",
  detectFiles: ["mix.exs"],
  // starship reads both versions out of `elixir --version`; here the OTP
  // release is taken from the Erlang toolchain the scenario reports.
  variables(_options, ctx) {
    return { otp_version: ctx.scenario.toolVersions["erlang"] };
  },
});

const raku = defineLanguageModule({
  name: "raku",
  format: "via [$symbol($version-$vm_version )]($style)",
  versionFormat: "${raw}",
  symbol: "🦋 ",
  style: "149 bold",
  detectExtensions: ["p6", "pm6", "pod6", "raku", "rakumod"],
  detectFiles: ["META6.json"],
  // `raku --version` also reports the backend VM; scenarios supply it under
  // the separate `raku_vm` key.
  variables(_options, ctx) {
    return { vm_version: ctx.scenario.toolVersions["raku_vm"] };
  },
});

const odin = defineLanguageModule({
  name: "odin",
  // starship gives odin no `version_format`.
  versionFormat: null,
  symbol: "Ø ",
  style: "bold bright-blue",
  extraDefaults: { show_commit: false },
  detectExtensions: ["odin"],
  // `odin version` reports `dev-2024-03:hash`; the commit is dropped unless
  // `show_commit` is set.
  variables(options, ctx) {
    const raw = ctx.scenario.toolVersions["odin"];
    if (raw === undefined) return {};
    const trimmed = raw.trim();
    return { version: optBool(options, "show_commit") ? trimmed : trimmed.split(":")[0] };
  },
});

const meson: ModuleDefinition = {
  name: "meson",
  defaults: {
    // starship's default is u32::MAX, i.e. "never truncate".
    truncation_length: Number.MAX_SAFE_INTEGER,
    truncation_symbol: "…",
    format: "via [$symbol$project]($style) ",
    symbol: "⬢ ",
    style: "blue bold",
    disabled: false,
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    const { env } = ctx.scenario;
    const project = env["MESON_PROJECT_NAME"];
    if (env["MESON_DEVENV"] !== "1" || project === undefined || project.trim().length === 0) {
      return null;
    }
    return {
      variables: {
        symbol: optString(options, "symbol"),
        project: truncateText(project, options),
      },
    };
  },
};

const mise: ModuleDefinition = {
  name: "mise",
  defaults: {
    format: "on [$symbol$health]($style) ",
    symbol: "mise ",
    style: "bold purple",
    disabled: true,
    detect_extensions: [],
    detect_files: ["mise.toml", "mise.local.toml", ".mise.toml", ".mise.local.toml"],
    detect_folders: [".mise"],
    healthy_symbol: "healthy",
    unhealthy_symbol: "unhealthy",
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    if (!detectsProject(options, ctx.scenario)) return null;
    // starship's health check is whether `mise doctor` runs at all, i.e.
    // whether mise is installed — here, whether the scenario reports it.
    const healthy = ctx.scenario.toolVersions["mise"] !== undefined;
    return {
      variables: {
        symbol: optString(options, "symbol"),
        health: optString(options, healthy ? "healthy_symbol" : "unhealthy_symbol"),
      },
    };
  },
};

const pixi: ModuleDefinition = {
  name: "pixi",
  defaults: {
    pixi_binary: ["pixi"],
    show_default_environment: true,
    format: "via [$symbol($version )(\\($environment\\) )]($style)",
    version_format: LANGUAGE_VERSION_FORMAT,
    symbol: "🧚 ",
    style: "yellow bold",
    disabled: false,
    detect_extensions: [],
    detect_files: ["pixi.toml", "pixi.lock"],
    detect_folders: [],
  },
  evaluate(options: ModuleOptions, ctx: ModuleContext): ModuleResult | null {
    const { env } = ctx.scenario;
    const environmentName = env["PIXI_ENVIRONMENT_NAME"];
    if (environmentName === undefined && !detectsProject(options, ctx.scenario)) return null;

    const hideDefault =
      !optBool(options, "show_default_environment", true) && environmentName === "default";
    const environment = hideDefault ? undefined : environmentName;

    const version = toolVersion("pixi", options, ctx);
    if (version === undefined && environment === undefined) return null;

    return {
      variables: {
        symbol: optString(options, "symbol"),
        version,
        environment,
        project_name: env["PIXI_PROJECT_NAME"],
      },
    };
  },
};

/**
 * starship's `truncate_text`: keep the first `truncation_length` characters and
 * append one character of `truncation_symbol` when anything was cut. A length
 * of 0 means no truncation.
 */
export function truncateText(text: string, options: ModuleOptions): string {
  const length = Math.trunc(
    typeof options["truncation_length"] === "number"
      ? options["truncation_length"]
      : Number.MAX_SAFE_INTEGER,
  );
  if (length <= 0) return text;

  const characters = Array.from(text);
  if (characters.length <= length) return text;
  const symbol = Array.from(optString(options, "truncation_symbol")).slice(0, 1).join("");
  return characters.slice(0, length).join("") + symbol;
}

// The longhand modules that still read a version, which the factory would
// otherwise have recorded for them.
for (const name of ["nodejs", "package", "pixi", "python", "ruby"]) {
  VERSIONED_MODULE_NAMES.add(name);
}

export const BESPOKE_LANGUAGE_MODULES: ModuleDefinition[] = [
  elixir,
  meson,
  mise,
  nodejs,
  ocaml,
  odin,
  packageModule,
  pixi,
  python,
  raku,
  ruby,
];
