"use client";

/**
 * Nerd Font symbol picker.
 *
 * Prompt symbols are private-use-area glyphs that nobody can type and few
 * people can name, so choosing one by eye is the only workable way. The
 * catalogue is ~11,000 glyphs, which shapes the design: it loads on demand,
 * results are capped rather than paginated, and the grid renders plain buttons
 * so a keystroke costs one cheap re-render.
 *
 * Glyphs are drawn in the terminal font the preview is using — in any other
 * font they are all tofu.
 *
 * It renders inside a popover rather than inline: embedded in a format row it
 * stretched the row and was clipped by the scrolling panes, and a tall narrow
 * column is the wrong shape for a grid of icons.
 */

import { useEffect, useMemo, useState } from "react";

import { Popover } from "./Popover";
import { type Glyph, type GlyphCatalogue, loadGlyphs, searchGlyphs } from "@/lib/config/glyphs";

interface SymbolPickerProps {
  open: boolean;
  onClose(): void;
  onPick(char: string): void;
  /** The terminal font stack, so the glyphs actually render. */
  fontStack: string;
  /** The button the popover hangs off. */
  anchor: HTMLElement | null;
}

export function SymbolPicker({
  open,
  onClose,
  onPick,
  fontStack,
  anchor,
}: SymbolPickerProps) {
  const [catalogue, setCatalogue] = useState<GlyphCatalogue | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>("Powerline");

  useEffect(() => {
    if (!open || catalogue || error) return;
    let cancelled = false;
    loadGlyphs().then(
      (loaded) => !cancelled && setCatalogue(loaded),
      () => !cancelled && setError(true),
    );
    return () => {
      cancelled = true;
    };
  }, [open, catalogue, error]);

  const { results, total } = useMemo(() => {
    if (!catalogue) return { results: [] as Glyph[], total: 0 };
    // A search spans every set: looking for "python" should not require
    // knowing which icon set it lives in.
    return searchGlyphs(catalogue, query, query.trim() ? null : category);
  }, [catalogue, query, category]);

  return (
    <Popover open={open} onClose={onClose} anchor={anchor} label="Nerd Font symbols">
      <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center gap-2">
        <label htmlFor="symbol-search" className="sr-only">
          Search symbols
        </label>
        <input
          id="symbol-search"
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search symbols — try python, branch, arrow…"
          className="w-full rounded border border-white/10 bg-neutral-950 px-2 py-1 text-base text-neutral-100 focus:border-accent-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close symbol picker"
          className="shrink-0 rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-white/10 hover:text-neutral-100"
        >
          ✕
        </button>
      </div>

      {catalogue && !query.trim() ? (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Symbol categories">
          {catalogue.categories.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
              className={`rounded-full border px-2 py-0.5 text-xs transition ${
                category === name
                  ? "border-accent-400 bg-accent-400/15 text-accent-200"
                  : "border-white/10 text-neutral-400 hover:border-white/25 hover:text-neutral-200"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="px-1 py-3 text-xs text-red-400">
          The symbol catalogue could not be loaded.
        </p>
      ) : !catalogue ? (
        <p className="px-1 py-3 text-xs text-neutral-500">Loading symbols…</p>
      ) : (
        <>
          <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1 overflow-y-auto">
            {results.map((glyph) => (
              <button
                key={`${glyph.category}-${glyph.code}-${glyph.name}`}
                type="button"
                title={`${glyph.name} · U+${glyph.code.toUpperCase()}`}
                onClick={() => onPick(glyph.char)}
                style={{ fontFamily: fontStack }}
                className="grid aspect-square place-items-center rounded border border-white/10 text-lg text-neutral-100 transition hover:border-accent-400 hover:bg-accent-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400"
              >
                {glyph.char}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500" aria-live="polite">
            {total === 0
              ? "No symbols match."
              : total > results.length
                ? `Showing ${results.length} of ${total} — keep typing to narrow it down.`
                : `${total} symbol${total === 1 ? "" : "s"}`}
          </p>
        </>
      )}
      </div>
    </Popover>
  );
}
