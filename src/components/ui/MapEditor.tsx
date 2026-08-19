"use client";

/**
 * Key/value editor for a module's map options.
 *
 * These are the options that used to fall through to a raw JSON textarea:
 * `os.symbols` (62 glyphs), `aws.region_aliases`, `kubernetes.context_aliases`.
 * Editing a Nerd Font glyph inside a JSON blob meant the value rendered in the
 * interface font — so it showed as tofu — and there was no way to insert one.
 *
 * The value side is a SymbolInput, so every entry renders in the terminal font
 * and has the glyph picker. Keys get the font too — a key is an OS name or a
 * region, so a glyph there is unlikely but a mismatched pair of fields is not
 * worth the inconsistency — but no picker, since nothing about a key wants one.
 */

import { useId } from "react";

import { SymbolInput } from "./SymbolInput";

interface MapEditorProps {
  value: Record<string, string>;
  onChange(next: Record<string, string>): void;
  fontStack: string;
  /** Names the rows for assistive tech, e.g. "symbols". */
  label: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function MapEditor({
  value,
  onChange,
  fontStack,
  label,
  keyPlaceholder = "key",
  valuePlaceholder = "value",
}: MapEditorProps) {
  const id = useId();
  const rows = Object.entries(value);

  /**
   * Renaming rebuilds the object so insertion order — and therefore row
   * order — survives the edit; assigning a new key would jump the row to the
   * end mid-keystroke.
   */
  const rename = (from: string, to: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of rows) next[k === from ? to : k] = v;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([key, entry], index) => (
        <div key={`${id}-${index}`} className="flex items-start gap-1.5">
          <input
            aria-label={`${label} key ${index + 1}`}
            value={key}
            placeholder={keyPlaceholder}
            onChange={(event) => rename(key, event.target.value)}
            spellCheck={false}
            style={{ fontFamily: fontStack }}
            className="w-2/5 shrink-0 rounded border border-white/10 bg-neutral-950 px-2 py-1 text-base text-neutral-100 focus:border-accent-400 focus:outline-none"
          />
          <SymbolInput
            value={entry}
            onChange={(next) => onChange({ ...value, [key]: next })}
            fontStack={fontStack}
            ariaLabel={`${label} value for ${key || "new entry"}`}
            placeholder={valuePlaceholder}
            className="w-full rounded border border-white/10 bg-neutral-950 px-2 py-1 text-base text-neutral-100 focus:border-accent-400 focus:outline-none"
          />
          <button
            type="button"
            aria-label={`Remove ${key || "entry"}`}
            onClick={() => {
              const next = { ...value };
              delete next[key];
              onChange(next);
            }}
            className="shrink-0 rounded px-1.5 py-1 text-xs text-neutral-500 transition hover:bg-white/10 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...value, "": "" })}
        className="self-start rounded border border-white/15 px-2 py-1 text-xs text-neutral-200 transition hover:border-accent-400 hover:text-accent-200"
      >
        + Add entry
      </button>
    </div>
  );
}
