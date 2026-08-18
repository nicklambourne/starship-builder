"use client";

/**
 * Module browser: search, enable/disable, select, and reorder.
 *
 * Reordering writes an explicit root `format` string, since that is how
 * starship expresses order. Order is changed with move buttons rather than
 * drag-and-drop: it needs no dependency, works from the keyboard, and is
 * announced sensibly by screen readers.
 */

import { useMemo, useState } from "react";

import { MODULE_GROUPS } from "@/lib/config/meta";

export interface ModuleListEntry {
  name: string;
  group: string;
  enabled: boolean;
  /** Whether the module currently contributes any output in this scenario. */
  active: boolean;
}

interface ModuleListProps {
  entries: ModuleListEntry[];
  selected: string | null;
  onSelect(name: string | null): void;
  onToggle(name: string, enabled: boolean): void;
  onMove(name: string, direction: -1 | 1): void;
  canReorder: boolean;
}

export function ModuleList({
  entries,
  selected,
  onSelect,
  onToggle,
  onMove,
  canReorder,
}: ModuleListProps) {
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (needle && !entry.name.toLowerCase().includes(needle)) return false;
      if (!showInactive && !entry.active) return false;
      return true;
    });

    const byGroup = new Map<string, ModuleListEntry[]>();
    for (const entry of filtered) {
      const list = byGroup.get(entry.group) ?? [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }

    // Present groups in the curated order (Core first), not insertion order —
    // the modules people reach for most should not be below 60 languages.
    const rank = (name: string) => {
      const index = MODULE_GROUPS.indexOf(name as (typeof MODULE_GROUPS)[number]);
      return index === -1 ? MODULE_GROUPS.length : index;
    };
    return [...byGroup.entries()].sort(([a], [b]) => rank(a) - rank(b));
  }, [entries, query, showInactive]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label htmlFor="module-search" className="sr-only">
          Search modules
        </label>
        <input
          id="module-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules…"
          className="w-full rounded border border-white/10 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-sky-500"
          />
          Show modules with no output in this scenario
        </label>
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-current={selected === null}
        className={`rounded border px-2.5 py-2 text-left text-sm transition ${
          selected === null
            ? "border-sky-400 bg-sky-400/10 text-sky-100"
            : "border-white/10 text-neutral-300 hover:border-white/25"
        }`}
      >
        Prompt-wide settings
        <span className="block text-xs text-neutral-500">
          format, right prompt, palette, newline
        </span>
      </button>

      <div className="flex-1 overflow-y-auto pr-1">
        {groups.map(([group, groupEntries]) => (
          <section key={group} className="mb-4">
            <h3 className="sticky top-0 z-10 bg-neutral-950/95 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 backdrop-blur">
              {group}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {groupEntries.map((entry) => {
                const isSelected = selected === entry.name;
                return (
                  <li key={entry.name} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      aria-label={`Enable ${entry.name}`}
                      onChange={(e) => onToggle(entry.name, e.target.checked)}
                      className="shrink-0 accent-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => onSelect(entry.name)}
                      aria-current={isSelected}
                      className={`min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left font-mono text-sm transition ${
                        isSelected
                          ? "bg-sky-400/15 text-sky-100"
                          : entry.enabled
                            ? "text-neutral-300 hover:bg-white/5"
                            : "text-neutral-600 hover:bg-white/5"
                      }`}
                    >
                      {entry.name}
                      {entry.enabled && !entry.active ? (
                        <span
                          title="Enabled, but produces no output in the current scenario"
                          className="ml-1.5 text-xs text-neutral-600"
                        >
                          ○
                        </span>
                      ) : null}
                    </button>
                    {canReorder ? (
                      <span className="flex shrink-0">
                        <button
                          type="button"
                          aria-label={`Move ${entry.name} earlier`}
                          onClick={() => onMove(entry.name, -1)}
                          className="px-1 text-xs text-neutral-600 hover:text-neutral-200"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${entry.name} later`}
                          onClick={() => onMove(entry.name, 1)}
                          className="px-1 text-xs text-neutral-600 hover:text-neutral-200"
                        >
                          ↓
                        </button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            No modules match “{query}”.
          </p>
        ) : null}
      </div>
    </div>
  );
}
