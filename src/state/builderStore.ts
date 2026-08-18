"use client";

/**
 * Builder state.
 *
 * The config object mirrors the TOML structure exactly, so importing, editing
 * and exporting are all the same shape. Derived values (rendered segments,
 * serialised TOML) are computed by the components rather than stored, which
 * keeps undo/redo a simple matter of snapshotting `config`.
 */

import { create } from "zustand";

import type { StarshipConfig } from "@/lib/engine/prompt";
import type { Scenario } from "@/lib/scenarios/types";
import { DEFAULT_SCENARIO_ID, getScenario } from "@/lib/scenarios";
import { DEFAULT_THEME_ID } from "@/lib/terminalThemes";

const HISTORY_LIMIT = 100;

export interface BuilderState {
  config: StarshipConfig;
  scenarioId: string;
  /**
   * The environment the preview renders against.
   *
   * Seeded from the chosen scenario, then edited freely — the bundled
   * scenarios are starting points, not a fixed menu, because which modules
   * appear depends entirely on this.
   */
  scenario: Scenario;
  themeId: string;
  fontId: string;
  /** Light or dark chrome for the app itself, distinct from the terminal's. */
  appTheme: "dark" | "light";
  /** Module currently open in the settings pane; null means the root options. */
  selectedModule: string | null;

  past: StarshipConfig[];
  future: StarshipConfig[];

  setConfig(next: StarshipConfig, options?: { transient?: boolean }): void;
  updateModuleOption(module: string, key: string, value: unknown): void;
  resetModuleOption(module: string, key: string): void;
  setModuleDisabled(module: string, disabled: boolean): void;
  setRootOption(key: string, value: unknown): void;
  selectModule(name: string | null): void;
  setScenario(id: string): void;
  updateScenario(patch: Partial<Scenario>): void;
  setTheme(id: string): void;
  setFont(id: string): void;
  setAppTheme(theme: "dark" | "light"): void;
  undo(): void;
  redo(): void;
  reset(): void;
}

const EMPTY_CONFIG: StarshipConfig = {};

function withModuleOption(
  config: StarshipConfig,
  module: string,
  key: string,
  value: unknown,
): StarshipConfig {
  const existing = (config[module] as Record<string, unknown> | undefined) ?? {};
  return { ...config, [module]: { ...existing, [key]: value } };
}

function withoutModuleOption(
  config: StarshipConfig,
  module: string,
  key: string,
): StarshipConfig {
  const existing = config[module] as Record<string, unknown> | undefined;
  if (!existing) return config;
  const next = { ...existing };
  delete next[key];
  if (Object.keys(next).length === 0) {
    const copy = { ...config };
    delete copy[module];
    return copy;
  }
  return { ...config, [module]: next };
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  config: EMPTY_CONFIG,
  scenarioId: DEFAULT_SCENARIO_ID,
  scenario: getScenario(DEFAULT_SCENARIO_ID),
  themeId: DEFAULT_THEME_ID,
  fontId: "jetbrains-mono",
  appTheme: "dark",
  selectedModule: null,
  past: [],
  future: [],

  setConfig(next, options) {
    const { config, past } = get();
    if (options?.transient) {
      set({ config: next });
      return;
    }
    set({
      config: next,
      past: [...past, config].slice(-HISTORY_LIMIT),
      future: [],
    });
  },

  updateModuleOption(module, key, value) {
    get().setConfig(withModuleOption(get().config, module, key, value));
  },

  resetModuleOption(module, key) {
    get().setConfig(withoutModuleOption(get().config, module, key));
  },

  setModuleDisabled(module, disabled) {
    get().setConfig(withModuleOption(get().config, module, "disabled", disabled));
  },

  setRootOption(key, value) {
    const config = { ...get().config };
    if (value === undefined) delete config[key];
    else config[key] = value;
    get().setConfig(config);
  },

  selectModule(name) {
    set({ selectedModule: name });
  },

  setScenario(id) {
    // Picking a scenario resets any edits: it is a starting point, and
    // silently keeping overrides would make the named scenarios untrustworthy.
    set({ scenarioId: id, scenario: getScenario(id) });
  },

  updateScenario(patch) {
    set({ scenario: { ...get().scenario, ...patch } });
  },

  setTheme(id) {
    set({ themeId: id });
  },

  setFont(id) {
    set({ fontId: id });
  },

  setAppTheme(theme) {
    set({ appTheme: theme });
    // The reversed neutral ramp keys off the document element, so the whole
    // interface flips from one attribute.
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  },

  undo() {
    const { past, config, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      config: previous,
      past: past.slice(0, -1),
      future: [config, ...future].slice(0, HISTORY_LIMIT),
    });
  },

  redo() {
    const { future, config, past } = get();
    if (future.length === 0) return;
    set({
      config: future[0],
      future: future.slice(1),
      past: [...past, config].slice(-HISTORY_LIMIT),
    });
  },

  reset() {
    get().setConfig(EMPTY_CONFIG);
  },
}));
