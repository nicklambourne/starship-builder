"use client";

/**
 * The module browser.
 *
 * A module's settings live inside its own row, opened by expanding it, rather
 * than in a separate pane: the toggle that turns a module on and the options
 * that shape it are the same decision, and splitting them across panes made
 * people lose their place.
 *
 * Ordering is deliberately NOT here. Order is expressed by the prompt's format
 * string, so it is edited in the format builder, where reordering, adding and
 * removing are one consistent operation.
 */

import { useMemo, useState } from "react";

import { Toggle } from "@/components/ui/Toggle";
import { MODULE_GROUPS } from "@/lib/config/meta";

export interface ModuleListEntry {
  name: string;
  group: string;
  enabled: boolean;
  /** Whether the module currently contributes output in this scenario. */
  active: boolean;
  /** Whether the config overrides any of the module's defaults. */
  customised: boolean;
}

type StatusFilter = "all" | "enabled" | "active" | "customised";

const STATUS_FILTERS: { id: StatusFilter; label: string; hint: string }[] = [
  { id: "all", label: "All", hint: "Every module starship supports" },
  { id: "enabled", label: "Enabled", hint: "Modules that are switched on" },
  { id: "active", label: "Showing", hint: "Modules producing output in this scenario" },
  { id: "customised", label: "Edited", hint: "Modules with non-default options" },
];

interface ModulesPanelProps {
  entries: ModuleListEntry[];
  expanded: string | null;
  onExpand(name: string | null): void;
  onToggle(name: string, enabled: boolean): void;
  /** Settings body for an expanded module. */
  renderSettings(name: string): React.ReactNode;
  docsFor(name: string): string | undefined;
}

export function ModulesPanel({
  entries,
  expanded,
  onExpand,
  onToggle,
  renderSettings,
  docsFor,
}: ModulesPanelProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [groups, setGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (needle && !entry.name.toLowerCase().includes(needle)) return false;
      if (groups.size > 0 && !groups.has(entry.group)) return false;
      if (status === "enabled" && !entry.enabled) return false;
      if (status === "active" && !entry.active) return false;
      if (status === "customised" && !entry.customised) return false;
      return true;
    });
  }, [entries, query, groups, status]);

  const grouped = useMemo(() => {
    const byGroup = new Map<string, ModuleListEntry[]>();
    for (const entry of filtered) {
      const list = byGroup.get(entry.group) ?? [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }
    const rank = (name: string) => {
      const i = MODULE_GROUPS.indexOf(name as (typeof MODULE_GROUPS)[number]);
      return i === -1 ? MODULE_GROUPS.length : i;
    };
    return [...byGroup.entries()].sort(([a], [b]) => rank(a) - rank(b));
  }, [filtered]);

  const toggleGroup = (group: string) => {
    const next = new Set(groups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setGroups(next);
  };

  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs transition ${
      active
        ? "border-sky-400 bg-sky-400/15 text-sky-200"
        : "border-white/10 text-neutral-400 hover:border-white/25 hover:text-neutral-200"
    }`;

  return (
    <div className="flex flex-col gap-3">
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

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter modules by status"
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              title={filter.hint}
              aria-pressed={status === filter.id}
              onClick={() => setStatus(filter.id)}
              className={chip(status === filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter modules by group"
        >
          {MODULE_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              aria-pressed={groups.has(group)}
              onClick={() => toggleGroup(group)}
              className={chip(groups.has(group))}
            >
              {group}
            </button>
          ))}
        </div>

        <p className="text-xs text-neutral-500" aria-live="polite">
          {filtered.length} of {entries.length} modules
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {grouped.map(([group, groupEntries]) => (
          <section key={group}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {group}
            </h3>
            <ul className="flex flex-col gap-1">
              {groupEntries.map((entry) => {
                const isOpen = expanded === entry.name;
                const docs = docsFor(entry.name);
                return (
                  <li
                    key={entry.name}
                    className={`rounded border transition ${
                      isOpen
                        ? "border-sky-400/50 bg-neutral-900"
                        : "border-white/10 bg-neutral-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Toggle
                        size="sm"
                        label={`Enable ${entry.name}`}
                        checked={entry.enabled}
                        onChange={(next) => onToggle(entry.name, next)}
                      />
                      <button
                        type="button"
                        onClick={() => onExpand(isOpen ? null : entry.name)}
                        aria-expanded={isOpen}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span
                          className={`truncate font-mono text-sm ${
                            entry.enabled ? "text-neutral-200" : "text-neutral-500"
                          }`}
                        >
                          {entry.name}
                        </span>
                        {entry.customised ? (
                          <span
                            title="Has non-default options"
                            className="shrink-0 rounded-full bg-sky-400/20 px-1.5 text-[10px] text-sky-200"
                          >
                            edited
                          </span>
                        ) : null}
                        {entry.enabled && !entry.active ? (
                          <span
                            title="Enabled, but produces no output in this scenario"
                            className="shrink-0 text-xs text-neutral-600"
                          >
                            no output
                          </span>
                        ) : null}
                        <span className="ml-auto shrink-0 text-xs text-neutral-500">
                          {isOpen ? "▾" : "▸"}
                        </span>
                      </button>
                    </div>

                    {isOpen ? (
                      <div className="border-t border-white/10 px-2.5 pb-3 pt-2">
                        {docs ? (
                          <a
                            href={docs}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs text-sky-400 underline underline-offset-2"
                          >
                            starship documentation ↗
                          </a>
                        ) : null}
                        {renderSettings(entry.name)}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {grouped.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            No modules match these filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}
