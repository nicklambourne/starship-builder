"use client";

/**
 * The builder.
 *
 * One page, no tabs: the prompt preview stays pinned while everything that can
 * change it — the format, the modules, the TOML — scrolls beneath it. Splitting
 * these across tabs meant a change and its effect were never on screen
 * together, which is the whole point of a live configurator.
 */

import { useCallback, useMemo, useState } from "react";

import { FormatBuilder } from "./FormatBuilder";
import { PreviewPane } from "./PreviewPane";
import { SettingsForm, type OptionDescriptor } from "./SettingsForm";
import { TomlPane } from "./TomlPane";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toggle } from "@/components/ui/Toggle";
import {
  CheckIcon,
  DownloadIcon,
  GitHubIcon,
  MoonIcon,
  SunIcon,
  RedoIcon,
  ResetIcon,
  ShareIcon,
  UndoIcon,
} from "@/components/ui/icons";
import { ALL_MODULES, MODULES_BY_NAME } from "@/lib/engine/modules";
import { PROMPT_ORDER } from "@/lib/engine/promptOrder";
import { DEFAULT_FORMAT, renderPrompt } from "@/lib/engine/prompt";
import { collectVariables, tryParseFormatString } from "@/lib/engine/formatString";
import { resolvePalette } from "@/lib/engine/styleString";
import { structuredFormatString } from "@/lib/config/defaultFormat";
import { MODULE_META, optionKind } from "@/lib/config/meta";
import { PRESETS } from "@/lib/config/presets";
import { encodeShare } from "@/lib/config/share";
import { parseConfig, serialiseConfig } from "@/lib/config/toml";
import { TERMINAL_FONTS } from "@/lib/fonts";
import { NAMED_COLORS } from "@/lib/engine/types";
import { getTheme } from "@/lib/terminalThemes";
import { useBuilderStore } from "@/state/builderStore";

/** Root options that are not the format itself; format gets its own section. */
const ROOT_OPTIONS: OptionDescriptor[] = [
  {
    key: "palette",
    kind: "string",
    defaultValue: "",
    description: "Name of the palette in [palettes] to activate.",
  },
  {
    key: "continuation_prompt",
    kind: "format",
    defaultValue: "[∙](bright-black) ",
    description: "Shown for continuation lines of a multi-line command.",
  },
  {
    key: "scan_timeout",
    kind: "number",
    defaultValue: 30,
    description: "Milliseconds starship may spend scanning files.",
  },
  {
    key: "command_timeout",
    kind: "number",
    defaultValue: 500,
    description: "Milliseconds starship may spend running a command.",
  },
];

const CARD = "rounded-xl border border-white/10 bg-neutral-900/40 p-4";
const BUTTON =
  "rounded border border-white/10 px-2.5 py-1.5 text-sm text-neutral-300 transition enabled:hover:border-sky-400 disabled:opacity-40";
const ICON_BUTTON =
  "grid size-9 place-items-center rounded border border-white/10 text-neutral-300 transition enabled:hover:border-sky-400 enabled:hover:text-sky-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";

export function Builder() {
  const {
    config,
    scenario,
    themeId,
    fontId,
    selectedModule,
    setConfig,
    updateModuleOption,
    resetModuleOption,
    setModuleDisabled,
    setRootOption,
    selectModule,
    updateScenario,
    setTheme,
    setFont,
    appTheme,
    setAppTheme,
    undo,
    redo,
    reset,
    past,
    future,
  } = useBuilderStore();

  const [shareCopied, setShareCopied] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const theme = getTheme(themeId);
  const font = TERMINAL_FONTS.find((f) => f.id === fontId) ?? TERMINAL_FONTS[0];
  const palette = resolvePalette(config.palettes, config.palette);
  const paletteNames = useMemo(
    () => Object.keys(config.palettes?.[config.palette ?? ""] ?? {}),
    [config.palettes, config.palette],
  );

  /**
   * The format the editor works on.
   *
   * Starship's default is the single token `$all`, which is nothing to look at
   * and nothing to rearrange, so the editor opens on its expanded, grouped
   * equivalent. This is the *effective* format — it is what the preview renders
   * and what the TOML exports, so the two can never disagree with what the
   * editor shows.
   */
  const structuredDefault = useMemo(
    () =>
      structuredFormatString(
        DEFAULT_FORMAT,
        PROMPT_ORDER,
        (name) => MODULE_META[name]?.group,
      ),
    [],
  );
  const format =
    typeof config.format === "string" ? config.format : structuredDefault;
  const rendered = useMemo(
    () =>
      renderPrompt({
        config: { ...config, format },
        scenario,
        modules: ALL_MODULES,
        defaultOrder: PROMPT_ORDER,
      }),
    [config, format, scenario],
  );



  const rightFormat = typeof config.right_format === "string" ? config.right_format : "";

  /** Module names available to the root format. */
  const moduleVocabulary = useMemo(
    () => ["all", ...ALL_MODULES.map((m) => m.name)],
    [],
  );

  const optionsFor = useCallback((name: string): OptionDescriptor[] => {
    const definition = MODULES_BY_NAME.get(name);
    if (!definition) return [];
    const meta = MODULE_META[name];
    return Object.entries(definition.defaults)
      .filter(([key]) => key !== "disabled")
      .map(([key, defaultValue]) => ({
        key,
        kind: optionKind(name, key, defaultValue, meta),
        defaultValue,
      }));
  }, []);

  /** Variables a module's own format strings may reference. */
  const variablesFor = useCallback(
    (name: string) => {
      const definition = MODULES_BY_NAME.get(name);
      if (!definition) return [];
      let fromEvaluate: string[] = [];
      try {
        const result = definition.evaluate(definition.defaults, {
          scenario,
          rootConfig: config,
        });
        fromEvaluate = result ? Object.keys(result.variables) : [];
      } catch {
        fromEvaluate = [];
      }
      const parsed = tryParseFormatString(definition.defaults.format);
      const fromFormat = parsed.ok ? collectVariables(parsed.elements) : [];
      return [...new Set([...fromEvaluate, ...fromFormat])].sort();
    },
    [scenario, config],
  );

  const moduleControls = useMemo(
    () => ({
      isEnabled(name: string) {
        const options = (config[name] as Record<string, unknown>) ?? {};
        const disabled =
          typeof options.disabled === "boolean"
            ? options.disabled
            : (MODULES_BY_NAME.get(name)?.defaults.disabled ?? false);
        return !disabled;
      },
      setEnabled(name: string, enabled: boolean) {
        setModuleDisabled(name, !enabled);
      },
      renderSettings(name: string) {
        return renderSettings(name);
      },
    }),
    // renderSettings is redefined whenever the config changes, which is also
    // exactly when enablement can change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, setModuleDisabled],
  );

  const renderSettings = useCallback(
    (name: string) => (
      <SettingsForm
        options={optionsFor(name)}
        values={(config[name] as Record<string, unknown>) ?? {}}
        onChange={(key, value) => updateModuleOption(name, key, value)}
        onReset={(key) => resetModuleOption(name, key)}
        formatVariables={variablesFor(name)}
        palette={palette}
        paletteNames={paletteNames}
        theme={theme}
      />
    ),
    [
      config,
      optionsFor,
      variablesFor,
      updateModuleOption,
      resetModuleOption,
      palette,
      paletteNames,
      theme,
    ],
  );

  const defaultsByModule = useMemo(() => {
    const out: Record<string, Record<string, unknown>> = {};
    for (const definition of ALL_MODULES) out[definition.name] = definition.defaults;
    return out;
  }, []);

  const downloadConfig = useCallback(() => {
    const text = serialiseConfig(
      { ...config, format },
      { defaults: defaultsByModule },
    );
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "starship.toml";
    link.click();
    URL.revokeObjectURL(url);
  }, [config, format, defaultsByModule]);

  const share = useCallback(async () => {
    const fragment = encodeShare(config);
    const url = `${window.location.origin}${window.location.pathname}#${fragment}`;
    await navigator.clipboard.writeText(url);
    window.history.replaceState(null, "", `#${fragment}`);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1500);
  }, [config]);

  const loadPreset = useCallback(
    (id: string) => {
      const preset = PRESETS.find((p) => p.id === id);
      if (!preset) return;
      const result = parseConfig(preset.toml);
      if (result.ok) setConfig(result.config);
    },
    [setConfig],
  );

  // The style pickers' swatches follow the active terminal colour scheme.
  const ansiVars = useMemo(() => {
    const vars: Record<string, string> = {};
    NAMED_COLORS.forEach((name, index) => {
      vars[`--ansi-${name}`] = theme.ansi[index];
    });
    return vars as React.CSSProperties;
  }, [theme]);


  return (
    <div style={ansiVars} className="min-h-screen">
      <ConfirmDialog
        open={confirmingReset}
        title="Reset everything?"
        body={
          <>
            Every module setting, style and grouping goes back to the starting
            prompt. The simulated environment is left as it is, and undo will
            bring your config back.
          </>
        }
        confirmLabel="Reset"
        onCancel={() => setConfirmingReset(false)}
        onConfirm={() => {
          setConfirmingReset(false);
          reset();
        }}
      />
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">🚀 Starship Builder</h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={past.length === 0}
            aria-label="Undo"
            title="Undo"
            className={ICON_BUTTON}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={future.length === 0}
            aria-label="Redo"
            title="Redo"
            className={ICON_BUTTON}
          >
            <RedoIcon />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            aria-label="Reset to defaults"
            title="Reset to defaults"
            className={`${ICON_BUTTON} hover:border-red-400 hover:text-red-300`}
          >
            <ResetIcon />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${appTheme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${appTheme === "dark" ? "light" : "dark"} theme`}
            className={ICON_BUTTON}
          >
            {appTheme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <a
            href="https://github.com/nicklambourne/starship-builder"
            aria-label="View this project on GitHub"
            title="View this project on GitHub"
            className={ICON_BUTTON}
          >
            <GitHubIcon />
          </a>
          <button
            type="button"
            onClick={share}
            aria-label={shareCopied ? "Share link copied" : "Copy a share link"}
            title={shareCopied ? "Link copied" : "Copy a share link"}
            className={`${ICON_BUTTON} ${shareCopied ? "border-emerald-400 text-emerald-300" : ""}`}
          >
            {shareCopied ? <CheckIcon /> : <ShareIcon />}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)] lg:items-start">
        {/* Left column: everything that changes the prompt. */}
        <div className="flex min-w-0 flex-col gap-4">
          <section className={CARD} aria-labelledby="format-heading">
            <h2 id="format-heading" className="mb-1 text-sm font-semibold text-neutral-100">
              Prompt format
            </h2>
            <p className="mb-3 text-xs text-neutral-500">
              What the prompt contains, and in what order. Reorder, remove, recolour,
              or add pieces here. Drag the handles to reorder; group a run of
              related modules so they share one style.
            </p>
            <FormatBuilder
              value={format}
              onChange={(next) => setRootOption("format", next)}
              vocabulary={moduleVocabulary}
              palette={palette}
              paletteNames={paletteNames}
              allowCategoryGrouping
              scope="root-format"
              theme={theme}
              modules={moduleControls}
              searchable
            />

            <h3 className="mb-2 mt-5 text-sm font-semibold text-neutral-100">
              Right prompt
            </h3>
            <p className="mb-2 text-xs text-neutral-500">
              Rendered flush against the right edge. Not supported by every shell.
            </p>
            <FormatBuilder
              value={rightFormat}
              onChange={(next) => setRootOption("right_format", next)}
              vocabulary={moduleVocabulary}
              palette={palette}
              paletteNames={paletteNames}
              scope="right-format"
              theme={theme}
              modules={moduleControls}
            />

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
              <span className="text-sm text-neutral-300">
                Blank line before each prompt
                <span className="block text-xs text-neutral-500">add_newline</span>
              </span>
              <Toggle
                label="Blank line before each prompt"
                checked={config.add_newline !== false}
                onChange={(next) => setRootOption("add_newline", next)}
              />
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
                Other prompt-wide options
              </summary>
              <div className="mt-1">
                <SettingsForm
                  options={ROOT_OPTIONS}
                  values={config as Record<string, unknown>}
                  onChange={(key, value) => setRootOption(key, value)}
                  onReset={(key) => setRootOption(key, undefined)}
                  formatVariables={moduleVocabulary}
                  palette={palette}
                  paletteNames={paletteNames}
                  theme={theme}
                />
              </div>
            </details>
          </section>

        </div>

        {/*
          The result. Sticky beside the controls on desktop; ordered FIRST when
          the grid collapses to one column, because a preview sitting below a
          102-module list is a preview nobody sees while editing.
        */}
        <div className="order-first flex min-w-0 flex-col gap-4 lg:order-none lg:sticky lg:top-4">
          <section className={CARD} aria-label="Preview">
            <PreviewPane
              lines={rendered.lines}
              right={rendered.right}
              leadingNewline={rendered.leadingNewline}
              warnings={rendered.warnings}
              themeId={themeId}
              onThemeChange={setTheme}
              fontId={fontId}
              onFontChange={setFont}
              presetId=""
              onPresetChange={loadPreset}
              scenario={scenario}
              onScenarioEdit={updateScenario}
              theme={theme}
              fontStack={font.stack}
            />
          </section>

          {/*
            The TOML is the output, not an input, so it stays closed — but the
            download is the reason most people came, so it lives in the header
            bar and works without opening anything.
          */}
          <details className={CARD}>
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <span className="text-sm font-semibold text-neutral-100">
                starship.toml
              </span>
              <span className="text-xs text-neutral-500">view or paste a config</span>
              <span
                role="button"
                tabIndex={0}
                aria-label="Download config"
                onClick={(event) => {
                  event.preventDefault();
                  downloadConfig();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    downloadConfig();
                  }
                }}
                className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                <DownloadIcon />
                Download config
              </span>
            </summary>
            <div className="mt-3">
              <TomlPane
                config={{ ...config, format }}
                onConfigChange={setConfig}
                defaults={defaultsByModule}
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
