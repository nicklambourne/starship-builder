"use client";

/**
 * Preview pane: the simulated terminal, the controls for how it looks, and the
 * environment it is simulating.
 *
 * There is no scenario picker: the environment panel can express every
 * scenario the app used to ship and any number besides, so a fixed menu beside
 * it would only be a second, weaker way to say the same thing.
 *
 * The font selector is the reason the terminal is hand-rendered: switching
 * between patched Nerd Fonts and an unpatched system stack is the fastest way
 * for someone to see whether their prompt will actually render on a machine
 * without a patched font.
 */

import { EnvironmentPanel } from "./EnvironmentPanel";
import { Terminal } from "@/components/terminal/Terminal";
import { TERMINAL_FONTS } from "@/lib/fonts";
import { TERMINAL_THEMES, type TerminalTheme } from "@/lib/terminalThemes";
import type { Segment } from "@/lib/engine/types";
import type { Scenario } from "@/lib/scenarios/types";

interface PreviewPaneProps {
  lines: Segment[][];
  right: Segment[];
  leadingNewline: boolean;
  warnings: string[];

  themeId: string;
  onThemeChange(id: string): void;
  fontId: string;
  onFontChange(id: string): void;
  theme: TerminalTheme;
  fontStack: string;
  scenario: Scenario;
  onScenarioEdit(patch: Partial<Scenario>): void;
}

const SELECT_CLASS =
  "rounded border border-white/10 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none";

export function PreviewPane({
  lines,
  right,
  leadingNewline,
  warnings,
  themeId,
  onThemeChange,
  fontId,
  onFontChange,
  theme,
  fontStack,
  scenario,
  onScenarioEdit,
}: PreviewPaneProps) {
  const font = TERMINAL_FONTS.find((f) => f.id === fontId) ?? TERMINAL_FONTS[0];

  return (
    <div className="flex flex-col gap-3">
      <Terminal
        lines={lines}
        right={right}
        leadingNewline={leadingNewline}
        theme={theme}
        fontStack={fontStack}
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="theme-select" className="text-xs text-neutral-400">
            Terminal color scheme
          </label>
          <select
            id="theme-select"
            value={themeId}
            onChange={(e) => onThemeChange(e.target.value)}
            className={SELECT_CLASS}
          >
            {TERMINAL_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="font-select" className="text-xs text-neutral-400">
            Terminal font
          </label>
          <select
            id="font-select"
            value={fontId}
            onChange={(e) => onFontChange(e.target.value)}
            className={SELECT_CLASS}
          >
            {TERMINAL_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        <span style={{ fontFamily: font.stack }}>
          Glyph check: ✔
        </span>{" "}
        {font.licenceUrl ? (
          <>
            {font.label} is licensed under{" "}
            <a
              href={font.licenceUrl}
              className="underline underline-offset-2 hover:text-neutral-300"
              rel="noreferrer noopener"
              target="_blank"
            >
              {font.licence}
            </a>
            .
          </>
        ) : (
          <>
            Using your operating system&rsquo;s monospace font — Nerd Font glyphs
            will show as replacement boxes, exactly as they would in a terminal
            without a patched font.
          </>
        )}
      </p>

      <EnvironmentPanel scenario={scenario} onChange={onScenarioEdit} />

      {warnings.length > 0 ? (
        <ul
          role="status"
          className="flex flex-col gap-1 rounded border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-200"
        >
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
