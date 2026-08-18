"use client";

/**
 * Visual editor for a format string.
 *
 * A format string is the thing that decides what appears in a prompt and in
 * what order, so it deserves direct manipulation rather than a text box people
 * are afraid to touch. Each top-level piece becomes a row that can be moved,
 * removed, restyled, or inserted next to.
 *
 * Pieces the flat model cannot represent (conditionals, mixed groups) are kept
 * verbatim as read-only rows — they can still be reordered or deleted, but
 * their internals are edited in the raw field, so no config is ever silently
 * rewritten. The raw field stays available regardless.
 */

import { useMemo, useState } from "react";

import { StyleStringBuilder } from "./StyleStringBuilder";
import {
  type FormatItem,
  fromItems,
  itemLabel,
  moveItem,
  toItems,
} from "@/lib/config/formatItems";
import { tryParseFormatString } from "@/lib/engine/formatString";
import type { Palette } from "@/lib/engine/styleString";

interface FormatBuilderProps {
  value: string;
  onChange(next: string): void;
  /** Variables that may be inserted, e.g. module names or a module's own vars. */
  vocabulary: string[];
  palette?: Palette;
  paletteNames?: string[];
  /** Describes what a variable is here, for labels. */
  noun?: string;
}

const ICON_BUTTON =
  "rounded px-1.5 py-1 text-xs text-neutral-500 transition hover:bg-white/10 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30";

export function FormatBuilder({
  value,
  onChange,
  vocabulary,
  palette,
  paletteNames,
  noun = "module",
}: FormatBuilderProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [styling, setStyling] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const items = useMemo(() => toItems(value), [value]);
  const parse = useMemo(() => tryParseFormatString(value), [value]);

  const commit = (next: FormatItem[]) => {
    setStyling(null);
    onChange(fromItems(next));
  };

  const used = useMemo(
    () =>
      new Set(
        (items ?? [])
          .filter((i): i is Extract<FormatItem, { kind: "module" }> => i.kind === "module")
          .map((i) => i.name),
      ),
    [items],
  );

  const candidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return vocabulary
      .filter((name) => !needle || name.toLowerCase().includes(needle))
      .slice(0, 60);
  }, [vocabulary, search]);

  if (!items) {
    // Unparseable input: the visual view would be a lie, so show only the raw
    // field and the parser's complaint.
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={value}
          rows={3}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Format string"
          aria-invalid
          className="w-full resize-y rounded border border-red-500/60 bg-neutral-950 px-2.5 py-2 font-mono text-sm text-neutral-100 focus:outline-none"
        />
        {!parse.ok ? (
          <p role="alert" className="text-xs text-red-400">
            {parse.error} (at character {parse.index + 1})
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => {
          const isStyling = styling === index;
          return (
            <li
              key={index}
              className="rounded border border-white/10 bg-neutral-900/60"
            >
              <div className="flex items-center gap-1 px-1.5 py-1">
                <span className="flex shrink-0">
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    aria-label={`Move ${itemLabel(item)} earlier`}
                    disabled={index === 0}
                    onClick={() => commit(moveItem(items, index, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    aria-label={`Move ${itemLabel(item)} later`}
                    disabled={index === items.length - 1}
                    onClick={() => commit(moveItem(items, index, 1))}
                  >
                    ↓
                  </button>
                </span>

                <span
                  className={`min-w-0 flex-1 truncate font-mono text-sm ${
                    item.kind === "module"
                      ? "text-sky-200"
                      : item.kind === "text"
                        ? "text-neutral-400"
                        : "text-amber-200"
                  }`}
                  title={item.kind === "raw" ? "Edit this piece in the raw field" : undefined}
                >
                  {itemLabel(item)}
                </span>

                {item.kind === "text" ? (
                  <input
                    value={item.value}
                    aria-label={`Text content of piece ${index + 1}`}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...item, value: e.target.value };
                      onChange(fromItems(next));
                    }}
                    spellCheck={false}
                    className="w-28 shrink-0 rounded border border-white/10 bg-neutral-950 px-1.5 py-0.5 font-mono text-xs text-neutral-100 focus:border-sky-400 focus:outline-none"
                  />
                ) : null}

                {item.kind !== "raw" ? (
                  <button
                    type="button"
                    aria-label={`Recolour ${itemLabel(item)}`}
                    aria-expanded={isStyling}
                    onClick={() => setStyling(isStyling ? null : index)}
                    className={`${ICON_BUTTON} ${item.style ? "text-sky-300" : ""}`}
                  >
                    {item.style ? "◆" : "◇"}
                  </button>
                ) : null}

                <button
                  type="button"
                  aria-label={`Remove ${itemLabel(item)}`}
                  onClick={() => commit(items.filter((_, i) => i !== index))}
                  className={`${ICON_BUTTON} hover:text-red-300`}
                >
                  ✕
                </button>
              </div>

              {isStyling && item.kind !== "raw" ? (
                <div className="border-t border-white/10 p-2">
                  {item.kind === "module" ? (
                    // Starship only applies a group's style where a segment has
                    // none of its own, so recolouring a module here often
                    // changes less than people expect.
                    <p className="mb-2 text-xs text-neutral-500">
                      Applies only to parts of{" "}
                      <code className="text-neutral-400">${item.name}</code> that
                      do not set their own style. To change the rest, edit that
                      module&rsquo;s <code className="text-neutral-400">style</code>{" "}
                      option.
                    </p>
                  ) : null}
                  <StyleStringBuilder
                    value={item.style ?? ""}
                    onChange={(style) => {
                      const next = [...items];
                      next[index] = { ...item, style: style || undefined };
                      onChange(fromItems(next));
                    }}
                    palette={palette}
                    paletteNames={paletteNames}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
        {items.length === 0 ? (
          <li className="rounded border border-dashed border-white/15 px-2 py-3 text-center text-xs text-neutral-500">
            Empty — nothing will be rendered.
          </li>
        ) : null}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
          className="rounded border border-white/15 px-2 py-1 text-xs text-neutral-200 transition hover:border-sky-400 hover:text-sky-200"
        >
          + Add {noun}
        </button>
        <button
          type="button"
          onClick={() => commit([...items, { kind: "text", value: " " }])}
          className="rounded border border-white/15 px-2 py-1 text-xs text-neutral-200 transition hover:border-sky-400 hover:text-sky-200"
        >
          + Add text
        </button>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="ml-auto text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-300"
        >
          {showRaw ? "Hide" : "Edit"} raw format string
        </button>
      </div>

      {adding ? (
        <div className="flex flex-col gap-2 rounded border border-white/10 bg-neutral-900/60 p-2">
          <label className="sr-only" htmlFor="format-add-search">
            Search {noun}s to add
          </label>
          <input
            id="format-add-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${noun}s…`}
            className="w-full rounded border border-white/10 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
          />
          <div className="flex max-h-44 flex-wrap gap-1 overflow-y-auto">
            {candidates.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  commit([...items, { kind: "module", name }]);
                  setAdding(false);
                  setSearch("");
                }}
                className={`rounded border px-1.5 py-0.5 font-mono text-xs transition ${
                  used.has(name)
                    ? "border-white/5 text-neutral-600"
                    : "border-white/15 text-neutral-200 hover:border-sky-400 hover:text-sky-200"
                }`}
                title={used.has(name) ? "Already in this format" : undefined}
              >
                ${name}
              </button>
            ))}
            {candidates.length === 0 ? (
              <p className="px-1 py-2 text-xs text-neutral-500">No matches.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showRaw ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="format-raw" className="sr-only">
            Raw format string
          </label>
          <textarea
            id="format-raw"
            value={value}
            rows={3}
            spellCheck={false}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!parse.ok}
            className={`w-full resize-y rounded border bg-neutral-950 px-2.5 py-2 font-mono text-sm text-neutral-100 focus:outline-none ${
              parse.ok ? "border-white/10 focus:border-sky-400" : "border-red-500/60"
            }`}
          />
          {!parse.ok ? (
            <p role="alert" className="text-xs text-red-400">
              {parse.error} (at character {parse.index + 1})
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              <code>[text](style)</code> styles a group, <code>(text)</code> shows
              only when a variable inside it is non-empty, <code>\$</code> escapes.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
