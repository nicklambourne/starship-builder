"use client";

/**
 * The builder itself.
 *
 * Layout is deliberately different per breakpoint rather than a single grid
 * that squashes: on desktop the three panes sit side by side so a settings
 * change and its effect on the prompt are visible at once, while on narrow
 * screens they become tabs, because a 390px-wide three-column layout helps
 * nobody.
 */

import { useCallback, useMemo, useState } from "react";

import { ModuleList, type ModuleListEntry } from "./ModuleList";
import { PreviewPane } from "./PreviewPane";
import { SettingsForm, type OptionDescriptor } from "./SettingsForm";
import { TomlPane } from "./TomlPane";
import { ALL_MODULES, MODULES_BY_NAME } from "@/lib/engine/modules";
import { PROMPT_ORDER } from "@/lib/engine/promptOrder";
import { DEFAULT_FORMAT, renderPrompt } from "@/lib/engine/prompt";
import { collectVariables, tryParseFormatString } from "@/lib/engine/formatString";
import { resolvePalette } from "@/lib/engine/styleString";
import { MODULE_META, optionKind } from "@/lib/config/meta";
import { PRESETS } from "@/lib/config/presets";
import { encodeShare } from "@/lib/config/share";
import { TERMINAL_FONTS } from "@/lib/fonts";
import { getScenario } from "@/lib/scenarios";
import { NAMED_COLORS } from "@/lib/engine/types";
import { getTheme } from "@/lib/terminalThemes";
import { useBuilderStore } from "@/state/builderStore";
import { parseConfig } from "@/lib/config/toml";

const ROOT_OPTIONS: OptionDescriptor[] = [
  {
    key: "format",
    kind: "format",
    defaultValue: DEFAULT_FORMAT,
    description:
      "The whole prompt. $all expands to every module not named explicitly here.",
  },
  {
    key: "right_format",
    kind: "format",
    defaultValue: "",
    description: "Rendered flush against the right edge. Not supported by every shell.",
  },
  {
    key: "add_newline",
    kind: "boolean",
    defaultValue: true,
    description: "Insert a blank line before each prompt.",
  },
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

type MobileTab = "modules" | "settings" | "preview" | "toml";

export function Builder() {
  const {
    config,
    scenarioId,
    themeId,
    fontId,
    selectedModule,
    setConfig,
    updateModuleOption,
    resetModuleOption,
    setModuleDisabled,
    selectModule,
    setScenario,
    setTheme,
    setFont,
    undo,
    redo,
    reset,
    past,
    future,
  } = useBuilderStore();

  const [tab, setTab] = useState<MobileTab>("preview");
  const [shareCopied, setShareCopied] = useState(false);

  const scenario = getScenario(scenarioId);
  const theme = getTheme(themeId);
  const font = TERMINAL_FONTS.find((f) => f.id === fontId) ?? TERMINAL_FONTS[0];
  const palette = resolvePalette(config.palettes, config.palette);
  const paletteNames = useMemo(
    () => Object.keys(config.palettes?.[config.palette ?? ""] ?? {}),
    [config.palettes, config.palette],
  );

  const rendered = useMemo(
    () =>
      renderPrompt({
        config,
        scenario,
        modules: ALL_MODULES,
        defaultOrder: PROMPT_ORDER,
      }),
    [config, scenario],
  );

  /** Which modules actually contribute output, for the "no output" hint. */
  const activeModules = useMemo(() => {
    const active = new Set<string>();
    for (const definition of ALL_MODULES) {
      const options = {
        ...definition.defaults,
        ...((config[definition.name] as Record<string, unknown>) ?? {}),
      };
      try {
        if (definition.evaluate(options, { scenario, rootConfig: config })) {
          active.add(definition.name);
        }
      } catch {
        // A module that throws simply is not active; renderPrompt surfaces it.
      }
    }
    return active;
  }, [config, scenario]);

  const entries: ModuleListEntry[] = useMemo(
    () =>
      ALL_MODULES.map((definition) => {
        const options = (config[definition.name] as Record<string, unknown>) ?? {};
        const disabled =
          typeof options.disabled === "boolean"
            ? options.disabled
            : definition.defaults.disabled;
        return {
          name: definition.name,
          group: MODULE_META[definition.name]?.group ?? "Other",
          enabled: !disabled,
          active: activeModules.has(definition.name),
        };
      }),
    [config, activeModules],
  );

  const selectedDefinition = selectedModule
    ? MODULES_BY_NAME.get(selectedModule)
    : undefined;

  const moduleOptions: OptionDescriptor[] = useMemo(() => {
    if (!selectedDefinition) return ROOT_OPTIONS;
    const meta = MODULE_META[selectedDefinition.name];
    return Object.entries(selectedDefinition.defaults)
      .filter(([key]) => key !== "disabled")
      .map(([key, defaultValue]) => ({
        key,
        kind: optionKind(selectedDefinition.name, key, defaultValue, meta),
        defaultValue,
      }));
  }, [selectedDefinition]);

  /** Variables the selected module's format string may reference. */
  const formatVariables = useMemo(() => {
    if (!selectedDefinition) return ALL_MODULES.map((m) => m.name).concat("all");
    const result = selectedDefinition.evaluate(selectedDefinition.defaults, {
      scenario,
      rootConfig: config,
    });
    const fromEvaluate = result ? Object.keys(result.variables) : [];
    const parsed = tryParseFormatString(selectedDefinition.defaults.format);
    const fromFormat = parsed.ok ? collectVariables(parsed.elements) : [];
    return [...new Set([...fromEvaluate, ...fromFormat])].sort();
  }, [selectedDefinition, scenario, config]);

  const values = selectedModule
    ? ((config[selectedModule] as Record<string, unknown>) ?? {})
    : (config as Record<string, unknown>);

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      if (selectedModule) updateModuleOption(selectedModule, key, value);
      else useBuilderStore.getState().setRootOption(key, value);
    },
    [selectedModule, updateModuleOption],
  );

  const handleReset = useCallback(
    (key: string) => {
      if (selectedModule) resetModuleOption(selectedModule, key);
      else useBuilderStore.getState().setRootOption(key, undefined);
    },
    [selectedModule, resetModuleOption],
  );

  /**
   * Reordering writes an explicit root `format`, since order is only
   * expressible there. The current effective order is materialised first so a
   * single move does not silently drop `$all`'s remaining modules.
   */
  const handleMove = useCallback(
    (name: string, direction: -1 | 1) => {
      const current =
        typeof config.format === "string" && config.format.includes("$")
          ? config.format
          : PROMPT_ORDER.map((m) => `$${m}`).join("");
      const tokens = [...current.matchAll(/\$\{?([a-zA-Z_][a-zA-Z0-9_.]*)\}?/g)].map(
        (m) => m[1],
      );
      const order = tokens.includes(name) ? tokens : PROMPT_ORDER;
      const index = order.indexOf(name);
      if (index === -1) return;
      const target = index + direction;
      if (target < 0 || target >= order.length) return;
      const next = [...order];
      [next[index], next[target]] = [next[target], next[index]];
      setConfig({ ...config, format: next.map((m) => `$${m}`).join("") });
    },
    [config, setConfig],
  );

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

  // ANSI swatches in the style builder follow the active terminal theme.
  const ansiVars = useMemo(() => {
    const vars: Record<string, string> = {};
    NAMED_COLORS.forEach((name, index) => {
      vars[`--ansi-${name}`] = theme.ansi[index];
    });
    return vars as React.CSSProperties;
  }, [theme]);

  const defaultsByModule = useMemo(() => {
    const out: Record<string, Record<string, unknown>> = {};
    for (const definition of ALL_MODULES) out[definition.name] = definition.defaults;
    return out;
  }, []);

  const settingsPane = (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h2 className="font-mono text-base text-neutral-100">
          {selectedModule ?? "Prompt-wide settings"}
        </h2>
        {selectedModule && MODULE_META[selectedModule]?.docs ? (
          <a
            href={MODULE_META[selectedModule].docs}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-sky-400 underline underline-offset-2"
          >
            starship documentation ↗
          </a>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        <SettingsForm
          options={moduleOptions}
          values={values}
          onChange={handleChange}
          onReset={handleReset}
          formatVariables={formatVariables}
          palette={palette}
          paletteNames={paletteNames}
        />
      </div>
    </div>
  );

  const tomlPane = (
    <TomlPane config={config} onConfigChange={setConfig} defaults={defaultsByModule} />
  );

  const previewPane = (
    <PreviewPane
      lines={rendered.lines}
      right={rendered.right}
      leadingNewline={rendered.leadingNewline}
      warnings={rendered.warnings}
      scenarioId={scenarioId}
      onScenarioChange={setScenario}
      themeId={themeId}
      onThemeChange={setTheme}
      fontId={fontId}
      onFontChange={setFont}
      theme={theme}
      fontStack={font.stack}
    />
  );

  const modulesPane = (
    <ModuleList
      entries={entries}
      selected={selectedModule}
      onSelect={selectModule}
      onToggle={(name, enabled) => setModuleDisabled(name, !enabled)}
      onMove={handleMove}
      canReorder
    />
  );

  return (
    <div style={ansiVars} className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">🚀 Starship Builder</h1>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="preset-select" className="sr-only">
            Load a preset
          </label>
          <select
            id="preset-select"
            defaultValue=""
            onChange={(e) => {
              loadPreset(e.target.value);
              e.target.value = "";
            }}
            className="rounded border border-white/10 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-200 focus:border-sky-400 focus:outline-none"
          >
            <option value="" disabled>
              Load a preset…
            </option>
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={undo}
            disabled={past.length === 0}
            className="rounded border border-white/10 px-2.5 py-1.5 text-sm text-neutral-300 transition enabled:hover:border-sky-400 disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={future.length === 0}
            className="rounded border border-white/10 px-2.5 py-1.5 text-sm text-neutral-300 transition enabled:hover:border-sky-400 disabled:opacity-40"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={share}
            className="rounded border border-white/10 px-2.5 py-1.5 text-sm text-neutral-300 transition hover:border-sky-400"
          >
            {shareCopied ? "Link copied" : "Share"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded border border-white/10 px-2.5 py-1.5 text-sm text-neutral-400 transition hover:border-red-400 hover:text-red-300"
          >
            Reset
          </button>
        </div>

        <a
          href="https://github.com/nicklambourne/starship-builder"
          className="ml-auto text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-100"
        >
          GitHub
        </a>
      </header>

      {/* Mobile: one pane at a time. */}
      <nav className="flex border-b border-white/10 lg:hidden" aria-label="Builder panes">
        {(["preview", "modules", "settings", "toml"] as MobileTab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id}
            className={`flex-1 px-2 py-2.5 text-sm capitalize transition ${
              tab === id
                ? "border-b-2 border-sky-400 text-sky-200"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {id === "toml" ? "TOML" : id}
          </button>
        ))}
      </nav>

      {/*
        One DOM for both layouts. Rendering a separate mobile tree and desktop
        tree would duplicate every label, heading and form control, which reads
        as two of everything to a screen reader and makes ids ambiguous — so
        each pane is rendered exactly once and CSS decides the arrangement.
        On desktop all panes show as three columns; on mobile all but the
        active tab are hidden.
      */}
      <main className="flex-1 gap-4 p-4 lg:grid lg:grid-cols-[minmax(220px,1fr)_minmax(320px,1.4fr)_minmax(360px,1.6fr)]">
        <section
          aria-label="Modules"
          className={`min-h-0 ${tab === "modules" ? "" : "hidden"} lg:block`}
        >
          {modulesPane}
        </section>
        <section
          aria-label="Settings"
          className={`min-h-0 ${tab === "settings" ? "" : "hidden"} lg:block`}
        >
          {settingsPane}
        </section>
        {/*
          `lg:flex` groups preview and TOML into one column on desktop, while
          `contents` on mobile lets each be shown or hidden independently as
          its own tab.
        */}
        <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:gap-4">
          <section
            aria-label="Preview"
            className={`${tab === "preview" ? "" : "hidden"} lg:block`}
          >
            {previewPane}
          </section>
          <section
            aria-label="TOML"
            className={`min-h-0 ${tab === "toml" ? "" : "hidden"} lg:block lg:flex-1`}
          >
            {tomlPane}
          </section>
        </div>
      </main>
    </div>
  );
}
