"use client";

/**
 * Naming colours, and choosing which set of names is live.
 *
 * A palette is a `[palettes.<name>]` table of colour names, activated by the
 * root `palette` option. Four of the bundled presets ship one, and the style
 * pickers have always offered their entries as swatches — but there was no way
 * to add, rename or recolour anything without hand-writing TOML, which is the
 * one thing this app exists to avoid.
 */

import { useId, useState } from "react";

import { StyleSwatch } from "@/components/ui/StyleSwatch";
import { TrashIcon } from "@/components/ui/icons";
import { parseColorString, type Palette } from "@/lib/engine/styleString";
import type { TerminalTheme } from "@/lib/terminalThemes";

interface PaletteEditorProps {
  /** Every named palette in the config, keyed by palette name. */
  palettes: Record<string, Record<string, string>>;
  /** The one the prompt is using, if any. */
  active: string | null;
  onChange(palettes: Record<string, Record<string, string>>): void;
  onActivate(name: string | null): void;
  theme: TerminalTheme;
}

const INPUT =
  "w-full rounded border border-white/10 bg-neutral-950 px-2 py-1 text-base text-neutral-100 focus:border-accent-400 focus:outline-none";

const BUTTON =
  "rounded border border-white/15 px-2 py-1 text-xs text-neutral-200 transition hover:border-accent-400 hover:text-accent-200";

/** A colour value the browser's own picker can show, or black if it cannot. */
function asHex(value: string, palette: Palette | undefined, theme: TerminalTheme): string {
  const parsed = parseColorString(value.toLowerCase(), palette);
  if (parsed?.kind === "rgb") {
    return `#${[parsed.r, parsed.g, parsed.b]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  if (parsed?.kind === "named") {
    const index = [
      "black", "red", "green", "yellow", "blue", "purple", "cyan", "white",
      "bright-black", "bright-red", "bright-green", "bright-yellow",
      "bright-blue", "bright-purple", "bright-cyan", "bright-white",
    ].indexOf(parsed.name);
    if (index >= 0) return theme.ansi[index];
  }
  return "#000000";
}

export function PaletteEditor({
  palettes,
  active,
  onChange,
  onActivate,
  theme,
}: PaletteEditorProps) {
  const selectId = useId();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const names = Object.keys(palettes);
  const entries = active ? Object.entries(palettes[active] ?? {}) : [];
  const current = active ? palettes[active] : undefined;

  const setEntries = (next: Record<string, string>) => {
    if (!active) return;
    onChange({ ...palettes, [active]: next });
  };

  /*
   * Renaming a key rebuilds the table rather than editing it in place, so the
   * row keeps its position while it is being typed. Dropping and re-adding
   * would send a half-typed name to the bottom on every keystroke.
   */
  const renameEntry = (from: string, to: string) => {
    if (!current) return;
    setEntries(
      Object.fromEntries(
        Object.entries(current).map(([key, value]) => (key === from ? [to, value] : [key, value])),
      ),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-neutral-500">
        A palette gives colours names, so a prompt can say{" "}
        <code className="text-neutral-400">peach</code> instead of{" "}
        <code className="text-neutral-400">#fab387</code> and every module using
        it changes at once. Names defined here appear in every style picker.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={selectId} className="text-xs text-neutral-400">
            Active palette
          </label>
          <select
            id={selectId}
            value={active ?? ""}
            onChange={(event) => onActivate(event.target.value || null)}
            className={INPUT}
          >
            <option value="">None — colours are written out in full</option>
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {adding ? (
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = newName.trim();
              if (!name) return;
              onChange({ ...palettes, [name]: palettes[name] ?? {} });
              onActivate(name);
              setNewName("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              aria-label="New palette name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="name"
              className={`${INPUT} nerd-font w-36`}
            />
            <button type="submit" className={BUTTON}>
              Create
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={BUTTON}>
            + New palette
          </button>
        )}
      </div>

      {active ? (
        <div className="flex flex-col gap-1.5">
          {entries.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Nothing in <code className="text-neutral-400">{active}</code> yet.
            </p>
          ) : null}

          {entries.map(([name, value]) => (
            <div key={name} className="flex items-center gap-2">
              <StyleSwatch style={value} theme={theme} palette={current} />
              <input
                aria-label={`Name of colour ${name}`}
                value={name}
                onChange={(event) => renameEntry(name, event.target.value)}
                className={`${INPUT} nerd-font w-36`}
              />
              <input
                aria-label={`Value of colour ${name}`}
                value={value}
                onChange={(event) => setEntries({ ...current, [name]: event.target.value })}
                spellCheck={false}
                placeholder="#rrggbb, a colour name, or 0-255"
                className={`${INPUT} nerd-font min-w-0 flex-1`}
              />
              <input
                type="color"
                aria-label={`Pick a colour for ${name}`}
                value={asHex(value, current, theme)}
                onChange={(event) => setEntries({ ...current, [name]: event.target.value })}
                className="h-8 w-10 shrink-0 cursor-pointer rounded border border-white/10 bg-transparent"
              />
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => {
                  const next = { ...current };
                  delete next[name];
                  setEntries(next);
                }}
                className="shrink-0 rounded px-1.5 py-1 text-neutral-500 transition hover:bg-white/10 hover:text-red-300"
              >
                <TrashIcon />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEntries({ ...current, "": "#ffffff" })}
              className={`${BUTTON} self-start`}
            >
              + Add a colour
            </button>
            <button
              type="button"
              onClick={() => {
                const next = { ...palettes };
                delete next[active];
                onChange(next);
                onActivate(null);
              }}
              className={`${BUTTON} self-start hover:border-red-400 hover:text-red-300`}
            >
              Delete this palette
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
