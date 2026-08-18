"use client";

/**
 * Visual editor for a format string.
 *
 * A format string decides what appears in a prompt and in what order, so it is
 * edited directly: rows are dragged to reorder, grouped so a run of related
 * modules can share one style, recoloured, removed, or inserted next to.
 *
 * Pieces the flat model cannot represent (conditionals in particular) are kept
 * verbatim as read-only rows — movable and removable, but edited in the raw
 * field — so no config is silently rewritten. The raw field is always there.
 */

import { useMemo, useState } from "react";

import { FormatRow } from "./FormatRow";
import { StyleStringBuilder } from "./StyleStringBuilder";
import {
  type FormatItem,
  fromItems,
  gatherCategory,
  groupRange,
  groupableCategories,
  itemLabel,
  moveItem,
  reorderItem,
  toItems,
  ungroup,
} from "@/lib/config/formatItems";
import { describeModule } from "@/lib/config/descriptions";
import { MODULE_META } from "@/lib/config/meta";
import { tryParseFormatString } from "@/lib/engine/formatString";
import type { Palette } from "@/lib/engine/styleString";

interface FormatBuilderProps {
  value: string;
  onChange(next: string): void;
  vocabulary: string[];
  palette?: Palette;
  paletteNames?: string[];
  noun?: string;
  /** Category grouping only makes sense for the root format's modules. */
  allowCategoryGrouping?: boolean;
}

const ICON_BUTTON =
  "rounded px-1.5 py-1 text-xs text-neutral-500 transition hover:bg-white/10 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30";
const SMALL_BUTTON =
  "rounded border border-white/15 px-2 py-1 text-xs text-neutral-200 transition hover:border-sky-400 hover:text-sky-200";

function toneOf(item: FormatItem): "module" | "text" | "group" | "raw" {
  return item.kind;
}

export function FormatBuilder({
  value,
  onChange,
  vocabulary,
  palette,
  paletteNames,
  noun = "module",
  allowCategoryGrouping = false,
}: FormatBuilderProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [styling, setStyling] = useState<number | null>(null);
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const items = useMemo(() => toItems(value), [value]);
  const parse = useMemo(() => tryParseFormatString(value), [value]);

  const commit = (next: FormatItem[]) => {
    setStyling(null);
    onChange(fromItems(next));
  };

  const candidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return vocabulary
      .filter((name) => !needle || name.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [vocabulary, search]);

  if (!items) {
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

  const finishDrag = (dropIndex: number) => {
    if (dragging !== null && dragging !== dropIndex) {
      commit(reorderItem(items, dragging, dropIndex));
    }
    setDragging(null);
    setDropTarget(null);
  };

  const categoryOf = (name: string) => MODULE_META[name]?.group;
  const categories = allowCategoryGrouping
    ? groupableCategories(items, categoryOf)
    : [];

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => {
          const isStyling = styling === index;
          const isGroupOpen = openGroup === index;
          const description =
            item.kind === "module" ? describeModule(item.name) : undefined;

          return (
            <FormatRow
              key={index}
              index={index}
              label={itemLabel(item)}
              description={description}
              tone={toneOf(item)}
              isDragging={dragging === index}
              isDropTarget={dropTarget === index && dragging !== index}
              onDragStart={setDragging}
              onDragEnd={() => {
                setDragging(null);
                setDropTarget(null);
              }}
              onDragOverIndex={setDropTarget}
              onDrop={finishDrag}
              onMove={(i, direction) => commit(moveItem(items, i, direction))}
              actions={
                <>
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
                      className="w-24 shrink-0 rounded border border-white/10 bg-neutral-950 px-1.5 py-0.5 font-mono text-xs text-neutral-100 focus:border-sky-400 focus:outline-none"
                    />
                  ) : null}

                  {item.kind === "group" ? (
                    <>
                      <button
                        type="button"
                        className={ICON_BUTTON}
                        aria-expanded={isGroupOpen}
                        aria-label={`${isGroupOpen ? "Collapse" : "Expand"} ${itemLabel(item)}`}
                        onClick={() => setOpenGroup(isGroupOpen ? null : index)}
                      >
                        {isGroupOpen ? "▾" : "▸"}
                      </button>
                      <button
                        type="button"
                        className={ICON_BUTTON}
                        aria-label={`Ungroup ${itemLabel(item)}`}
                        onClick={() => commit(ungroup(items, index))}
                      >
                        ⧉
                      </button>
                    </>
                  ) : null}

                  {index < items.length - 1 ? (
                    <button
                      type="button"
                      className={ICON_BUTTON}
                      aria-label={`Group ${itemLabel(item)} with the next piece`}
                      title="Group with the next piece so they share a style"
                      onClick={() => commit(groupRange(items, index, index + 1))}
                    >
                      ⌗
                    </button>
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
                </>
              }
              body={
                <>
                  {isGroupOpen && item.kind === "group" ? (
                    <ul className="ml-6 flex flex-col gap-1 border-l border-white/10 px-2 pb-2">
                      {item.items.map((child, childIndex) => (
                        <li
                          key={childIndex}
                          className="flex items-baseline gap-2 py-0.5"
                        >
                          <span className="font-mono text-xs text-sky-200">
                            {itemLabel(child)}
                          </span>
                          {child.kind === "module" ? (
                            <span className="truncate text-xs text-neutral-500">
                              {describeModule(child.name)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {isStyling && item.kind !== "raw" ? (
                    <div className="border-t border-white/10 p-2">
                      {item.kind === "module" ? (
                        <p className="mb-2 text-xs text-neutral-500">
                          Applies only to parts of{" "}
                          <code className="text-neutral-400">${item.name}</code>{" "}
                          that do not set their own style. To change the rest,
                          edit that module&rsquo;s{" "}
                          <code className="text-neutral-400">style</code> option.
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
                </>
              }
            />
          );
        })}
        {items.length === 0 ? (
          <li className="rounded border border-dashed border-white/15 px-2 py-3 text-center text-xs text-neutral-500">
            Empty — nothing will be rendered.
          </li>
        ) : null}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAdding((v) => !v)} aria-expanded={adding} className={SMALL_BUTTON}>
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
            title={`Collect every ${category} module into one group so they can share a style. This moves them together in the prompt.`}
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
          <label className="sr-only" htmlFor={`add-${noun}`}>
            Search {noun}s to add
          </label>
          <input
            id={`add-${noun}`}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                    setSearch("");
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
