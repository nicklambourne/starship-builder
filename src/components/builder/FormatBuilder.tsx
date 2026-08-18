"use client";

/**
 * Visual editor for a format string.
 *
 * The format is the prompt, so this is the only place modules are managed:
 * each row switches its module on or off, holds that module's settings, and
 * can be dragged, grouped and recoloured. Groups nest, and their children get
 * exactly the same affordances as the top level.
 *
 * Pieces the flat model cannot represent (conditionals in particular) are kept
 * verbatim as read-only rows — movable and removable, but edited in the raw
 * field — so no config is silently rewritten.
 */

import { useMemo, useState } from "react";

import { FormatNode, type FormatNodeCallbacks } from "./FormatNode";
import { StyleStringBuilder } from "./StyleStringBuilder";
import {
  type FormatItem,
  type DropPosition,
  fromItems,
  gatherCategory,
  groupName,
  groupableCategories,
  toItems,
  ungroup,
} from "@/lib/config/formatItems";
import {
  type Path,
  collectModuleNames,
  getAt,
  moveTo,
  nudge,
  pathKey,
  removeAt,
  updateAt,
} from "@/lib/config/formatTree";
import { describeModule } from "@/lib/config/descriptions";
import { MODULE_META } from "@/lib/config/meta";
import { tryParseFormatString } from "@/lib/engine/formatString";
import type { Palette } from "@/lib/engine/styleString";
import type { TerminalTheme } from "@/lib/terminalThemes";

interface FormatBuilderProps {
  value: string;
  onChange(next: string): void;
  vocabulary: string[];
  palette?: Palette;
  paletteNames?: string[];
  noun?: string;
  allowCategoryGrouping?: boolean;
  scope?: string;
  theme: TerminalTheme;
  /** Present only for the root format, where rows manage real modules. */
  modules?: {
    isEnabled(name: string): boolean;
    setEnabled(name: string, enabled: boolean): void;
    renderSettings(name: string): React.ReactNode;
  };
  /** Shows a search box; worth it once the tree is long. */
  searchable?: boolean;
}

const SMALL_BUTTON =
  "rounded border border-white/15 px-2 py-1 text-xs text-neutral-200 transition hover:border-sky-400 hover:text-sky-200";

export function FormatBuilder({
  value,
  onChange,
  vocabulary,
  palette,
  paletteNames,
  noun = "module",
  allowCategoryGrouping = false,
  scope,
  theme,
  modules,
  searchable = false,
}: FormatBuilderProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [styling, setStyling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [dragging, setDragging] = useState<Path | null>(null);
  const [dropTarget, setDropTarget] = useState<
    { path: Path; position: DropPosition } | null
  >(null);

  const items = useMemo(() => toItems(value), [value]);
  const parse = useMemo(() => tryParseFormatString(value), [value]);

  const commit = (next: FormatItem[]) => {
    setStyling(null);
    onChange(fromItems(next));
  };

  const categoryOf = (name: string) => MODULE_META[name]?.group;

  const candidates = useMemo(() => {
    const needle = addSearch.trim().toLowerCase();
    return vocabulary
      .filter((name) => !needle || name.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [vocabulary, addSearch]);

  const categories = allowCategoryGrouping && items
    ? groupableCategories(items, categoryOf)
    : [];

  if (!items) {
    return (
      <div className="flex flex-col gap-2" data-format-scope={scope}>
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

  const needle = filter.trim().toLowerCase();

  /** Whether a subtree contains anything matching the search. */
  const matches = (item: FormatItem): boolean => {
    if (!needle) return true;
    if (item.kind === "module") {
      return (
        item.name.toLowerCase().includes(needle) ||
        (describeModule(item.name)?.toLowerCase().includes(needle) ?? false)
      );
    }
    if (item.kind === "group") return item.items.some(matches);
    return false;
  };

  const toggleSet = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const callbacks: FormatNodeCallbacks = {
    theme,
    palette,
    onDragStart: setDragging,
    onDragEnd: () => {
      setDragging(null);
      setDropTarget(null);
    },
    onDragOverNode: (path, position) => setDropTarget({ path, position }),
    onDropNode: (path, position) => {
      if (dragging) commit(moveTo(items, dragging, path, position));
      setDragging(null);
      setDropTarget(null);
    },
    onNudge: (path, direction) => commit(nudge(items, path, direction)),
    onGroup: (path) =>
      commit(
        updateAt(items, path, (item) =>
          item.kind === "group" ? item : { kind: "group", items: [item] },
        ),
      ),
    onUngroup: (path) => {
      // ungroup() works on a list, so operate on the parent's children.
      const parentPath = path.slice(0, -1);
      const index = path[path.length - 1];
      if (parentPath.length === 0) {
        commit(ungroup(items, index));
        return;
      }
      commit(
        updateAt(items, parentPath, (parent) =>
          parent.kind === "group"
            ? { ...parent, items: ungroup(parent.items, index) }
            : parent,
        ),
      );
    },
    onRemove: (path) => commit(removeAt(items, path)),
    onStyleToggle: (path) =>
      setStyling(styling === pathKey(path) ? null : pathKey(path)),
    onExpandToggle: (path) => setExpanded(toggleSet(expanded, pathKey(path))),
    onTextChange: (path, next) =>
      onChange(
        fromItems(
          updateAt(items, path, (item) =>
            item.kind === "text" ? { ...item, value: next } : item,
          ),
        ),
      ),
    isModuleEnabled: (name) => modules?.isEnabled(name) ?? true,
    onToggleModule: (name, enabled) => modules?.setEnabled(name, enabled),
    isGroupEnabled: (group) =>
      collectModuleNames(group.items).some((name) => modules?.isEnabled(name) ?? true),
    onToggleGroup: (group, enabled) => {
      for (const name of collectModuleNames(group.items)) {
        modules?.setEnabled(name, enabled);
      }
    },
    groupLabel: (group) =>
      `${groupName(group, categoryOf)} (${group.items.length})`,
    renderModuleSettings: (name) => modules?.renderSettings(name) ?? null,
    renderStyleEditor: (path, item) => (
      <>
        {item.kind === "module" ? (
          <p className="mb-2 text-xs text-neutral-500">
            Applies only to parts of{" "}
            <code className="text-neutral-400">${item.name}</code> that do not
            set their own style. To change the rest, edit that module&rsquo;s{" "}
            <code className="text-neutral-400">style</code> option below.
          </p>
        ) : null}
        <StyleStringBuilder
          value={item.kind === "raw" ? "" : (item.style ?? "")}
          onChange={(style) =>
            onChange(
              fromItems(
                updateAt(items, path, (target) =>
                  target.kind === "raw"
                    ? target
                    : { ...target, style: style || undefined },
                ),
              ),
            )
          }
          palette={palette}
          paletteNames={paletteNames}
        />
      </>
    ),
    isExpanded: (path) => {
      // A search auto-opens the groups holding its matches.
      if (needle) {
        const item = getAt(items, path);
        if (item?.kind === "group") return true;
      }
      return expanded.has(pathKey(path));
    },
    isStyling: (path) => styling === pathKey(path),
    dropPositionFor: (path) =>
      dropTarget && pathKey(dropTarget.path) === pathKey(path)
        ? dropTarget.position
        : null,
    isDragging: (path) => dragging !== null && pathKey(dragging) === pathKey(path),
    isFiltered: (item) => !matches(item),
  };

  const visibleCount = needle
    ? collectModuleNames(items).filter((name) =>
        matches({ kind: "module", name }),
      ).length
    : collectModuleNames(items).length;

  return (
    <div className="flex flex-col gap-2" data-format-scope={scope}>
      {searchable ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`filter-${scope}`} className="sr-only">
            Search prompt items
          </label>
          <input
            id={`filter-${scope}`}
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search modules…"
            className="w-full rounded border border-white/10 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
          />
          {needle ? (
            <p className="text-xs text-neutral-500" aria-live="polite">
              {visibleCount} matching {visibleCount === 1 ? "module" : "modules"}
            </p>
          ) : null}
        </div>
      ) : null}

      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <FormatNode
            key={index}
            item={item}
            path={[index]}
            callbacks={callbacks}
          />
        ))}
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
          className={SMALL_BUTTON}
        >
          + Add {noun}
        </button>
        <button
          type="button"
          onClick={() => commit([...items, { kind: "text", value: " " }])}
          className={SMALL_BUTTON}
        >
          + Add text
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => commit(gatherCategory(items, categoryOf, category))}
            title={`Collect every ${category} module into one group. This moves them together in the prompt.`}
            className={SMALL_BUTTON}
          >
            Group {category.toLowerCase()}
          </button>
        ))}
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
          <label className="sr-only" htmlFor={`add-${scope ?? noun}`}>
            Search {noun}s to add
          </label>
          <input
            id={`add-${scope ?? noun}`}
            type="search"
            value={addSearch}
            onChange={(e) => setAddSearch(e.target.value)}
            placeholder={`Search ${noun}s…`}
            className="w-full rounded border border-white/10 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
          />
          <ul className="flex max-h-52 flex-col gap-0.5 overflow-y-auto">
            {candidates.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => {
                    commit([...items, { kind: "module", name }]);
                    setAdding(false);
                    setAddSearch("");
                  }}
                  className="flex w-full flex-col rounded px-1.5 py-1 text-left transition hover:bg-white/5"
                >
                  <span className="font-mono text-xs text-sky-200">${name}</span>
                  {describeModule(name) ? (
                    <span className="truncate text-xs text-neutral-500">
                      {describeModule(name)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {candidates.length === 0 ? (
              <li className="px-1 py-2 text-xs text-neutral-500">No matches.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {showRaw ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`raw-${scope ?? noun}`} className="sr-only">
            Raw format string
          </label>
          <textarea
            id={`raw-${scope ?? noun}`}
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
