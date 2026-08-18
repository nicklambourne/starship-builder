"use client";

/**
 * One node of the format tree, rendered recursively.
 *
 * Every piece — module, literal text, or group — is the same kind of row, so a
 * group's children get the same handle, toggle, style swatch and expansion as
 * anything at the top level. That is what makes editing inside a group work
 * without a second, weaker UI.
 *
 * A module row also holds that module's settings, which is why there is no
 * separate module list: the thing that puts `$git_branch` in your prompt and
 * the thing that configures it are one row.
 */

import type { DragEvent, KeyboardEvent, ReactNode } from "react";

import { StyleSwatch } from "@/components/ui/StyleSwatch";
import { Toggle } from "@/components/ui/Toggle";
import { GroupIcon } from "@/components/ui/icons";
import {
  type DropPosition,
  type FormatItem,
  itemLabel,
} from "@/lib/config/formatItems";
import { type Path, pathKey } from "@/lib/config/formatTree";
import { describeModule } from "@/lib/config/descriptions";
import type { Palette } from "@/lib/engine/styleString";
import type { TerminalTheme } from "@/lib/terminalThemes";

const ICON_BUTTON =
  "rounded px-1.5 py-1 text-xs text-neutral-500 transition hover:bg-white/10 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30";
/** Larger than the other row icons: grouping is a primary action. */
const GROUP_BUTTON =
  "grid size-7 shrink-0 place-items-center rounded border border-white/15 text-neutral-400 transition hover:border-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400";

export interface FormatNodeCallbacks {
  onDragStart(path: Path): void;
  onDragEnd(): void;
  onDragOverNode(path: Path, position: DropPosition): void;
  onDropNode(path: Path, position: DropPosition): void;
  onNudge(path: Path, direction: -1 | 1): void;
  onGroup(path: Path): void;
  onUngroup(path: Path): void;
  onRemove(path: Path): void;
  onStyleToggle(path: Path): void;
  onExpandToggle(path: Path): void;
  onTextChange(path: Path, value: string): void;
  /** Modules are switched on and off via their own `disabled` option. */
  isModuleEnabled(name: string): boolean;
  /** Enabled, but rendering nothing right now — and why. */
  inactiveNote(name: string): string | null;
  onToggleModule(name: string, enabled: boolean): void;
  isGroupEnabled(item: Extract<FormatItem, { kind: "group" }>): boolean;
  onToggleGroup(item: Extract<FormatItem, { kind: "group" }>, enabled: boolean): void;
  groupLabel(item: Extract<FormatItem, { kind: "group" }>): string;
  renderModuleSettings(name: string): ReactNode;
  renderStyleEditor(path: Path, item: FormatItem): ReactNode;
  isExpanded(path: Path): boolean;
  isStyling(path: Path): boolean;
  /** Null when this node is not the current drop target. */
  dropPositionFor(path: Path): DropPosition | null;
  isDragging(path: Path): boolean;
  /** Hidden by the search filter. */
  isFiltered(item: FormatItem, path: Path): boolean;
  theme: TerminalTheme;
  palette?: Palette;
}

const TONE: Record<FormatItem["kind"], string> = {
  module: "text-sky-200",
  text: "text-neutral-400",
  group: "text-emerald-200",
  raw: "text-amber-200",
};

/**
 * Splits a row into three bands: the outer quarters insert before or after,
 * the middle half drops into a group. Half the row goes to grouping because it
 * is the harder gesture to aim.
 */
function positionWithin(event: DragEvent<HTMLElement>): DropPosition {
  const box = event.currentTarget.getBoundingClientRect();
  const offset = (event.clientY - box.top) / box.height;
  if (offset < 0.25) return "before";
  if (offset > 0.75) return "after";
  return "into";
}

export function FormatNode({
  item,
  path,
  callbacks: cb,
}: {
  item: FormatItem;
  path: Path;
  callbacks: FormatNodeCallbacks;
}) {
  if (cb.isFiltered(item, path)) return null;

  const key = pathKey(path);
  const expanded = cb.isExpanded(path);
  const styling = cb.isStyling(path);
  const dropPosition = cb.dropPositionFor(path);
  const dragging = cb.isDragging(path);

  const isModule = item.kind === "module";
  const isGroup = item.kind === "group";
  const label = isGroup ? cb.groupLabel(item) : itemLabel(item);
  const enabled = isModule
    ? cb.isModuleEnabled(item.name)
    : isGroup
      ? cb.isGroupEnabled(item)
      : true;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      cb.onNudge(path, -1);
    } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      cb.onNudge(path, 1);
    }
  };

  const canExpand = isModule || isGroup;
  const moduleNote = isModule
    ? cb.inactiveNote((item as Extract<FormatItem, { kind: "module" }>).name)
    : null;

  return (
    <li
      data-format-row={key}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        cb.onDragOverNode(path, positionWithin(event));
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        cb.onDropNode(path, positionWithin(event));
      }}
      className={`relative rounded border bg-neutral-900/60 transition ${
        dragging ? "border-sky-400/40 opacity-40" : "border-white/10"
      } ${dropPosition === "into" ? "ring-2 ring-emerald-400/70" : ""} ${
        enabled ? "" : "opacity-55"
      }`}
    >
      {dropPosition === "before" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-0.5 left-0 right-0 h-0.5 rounded bg-sky-400"
        />
      ) : null}
      {dropPosition === "after" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-0.5 left-0 right-0 h-0.5 rounded bg-sky-400"
        />
      ) : null}

      <div className="flex items-center gap-1 px-1.5 py-1">
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            // Firefox refuses to start a drag without payload.
            event.dataTransfer.setData("text/plain", key);
            event.stopPropagation();
            cb.onDragStart(path);
          }}
          onDragEnd={cb.onDragEnd}
          onKeyDown={handleKeyDown}
          aria-label={`Reorder ${label}. Press the arrow keys to move it, or drag it onto another piece to group them.`}
          className="shrink-0 cursor-grab rounded px-1 py-0.5 text-neutral-600 transition hover:bg-white/10 hover:text-neutral-200 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true" fill="currentColor">
            <circle cx="2.5" cy="3" r="1.3" />
            <circle cx="7.5" cy="3" r="1.3" />
            <circle cx="2.5" cy="8" r="1.3" />
            <circle cx="7.5" cy="8" r="1.3" />
            <circle cx="2.5" cy="13" r="1.3" />
            <circle cx="7.5" cy="13" r="1.3" />
          </svg>
        </button>

        {isModule || isGroup ? (
          <Toggle
            size="sm"
            label={
              isModule
                ? `Enable ${(item as Extract<FormatItem, { kind: "module" }>).name}`
                : `Enable everything in ${label}`
            }
            checked={enabled}
            onChange={(next) =>
              isModule
                ? cb.onToggleModule(
                    (item as Extract<FormatItem, { kind: "module" }>).name,
                    next,
                  )
                : cb.onToggleGroup(
                    item as Extract<FormatItem, { kind: "group" }>,
                    next,
                  )
            }
          />
        ) : null}

        {canExpand ? (
          <button
            type="button"
            onClick={() => cb.onExpandToggle(path)}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 flex-col text-left"
          >
            <span className={`truncate font-mono text-sm ${TONE[item.kind]}`}>
              {label}
            </span>
            {isModule ? (
              <span className="truncate text-xs text-neutral-500">
                {describeModule((item as Extract<FormatItem, { kind: "module" }>).name)}
              </span>
            ) : null}
            {isModule && enabled && moduleNote ? (
              <span
                title={moduleNote}
                className="truncate text-xs text-amber-300/80"
              >
                Not showing — {moduleNote}
              </span>
            ) : null}
          </button>
        ) : (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate font-mono text-sm ${TONE[item.kind]}`}>
              {label}
            </span>
          </span>
        )}

        {item.kind === "text" ? (
          <input
            value={item.value}
            aria-label={`Text content of ${label}`}
            onChange={(event) => cb.onTextChange(path, event.target.value)}
            spellCheck={false}
            className="w-20 shrink-0 rounded border border-white/10 bg-neutral-950 px-1.5 py-0.5 font-mono text-xs text-neutral-100 focus:border-sky-400 focus:outline-none"
          />
        ) : null}

        {isGroup ? (
          <button
            type="button"
            className={ICON_BUTTON}
            aria-label={`Ungroup ${label}`}
            title="Dissolve this group, keeping its contents"
            onClick={() => cb.onUngroup(path)}
          >
            ⧉
          </button>
        ) : (
          <button
            type="button"
            className={GROUP_BUTTON}
            aria-label={`Put ${label} in a group`}
            title="Put this in a group of its own, then drag others onto it"
            onClick={() => cb.onGroup(path)}
          >
            <GroupIcon />
          </button>
        )}

        {item.kind !== "raw" ? (
          <button
            type="button"
            aria-label={`Change the style of ${label}`}
            aria-expanded={styling}
            onClick={() => cb.onStyleToggle(path)}
            className="shrink-0 rounded p-0.5 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400"
          >
            <StyleSwatch style={item.style} theme={cb.theme} palette={cb.palette} />
          </button>
        ) : null}

        {!isModule && !isGroup ? (
          <button
            type="button"
            aria-label={`Remove ${label}`}
            title="Literal text has no on/off in starship, so it is removed instead"
            onClick={() => cb.onRemove(path)}
            className={`${ICON_BUTTON} hover:text-red-300`}
          >
            ✕
          </button>
        ) : null}
      </div>

      {styling && item.kind !== "raw" ? (
        <div className="border-t border-white/10 p-2">{cb.renderStyleEditor(path, item)}</div>
      ) : null}

      {expanded && isModule ? (
        <div className="border-t border-white/10 px-2.5 pb-3 pt-1">
          {cb.renderModuleSettings((item as Extract<FormatItem, { kind: "module" }>).name)}
        </div>
      ) : null}

      {expanded && isGroup ? (
        <ul className="ml-4 flex flex-col gap-1 border-l border-white/10 py-1 pl-2 pr-1.5">
          {(item as Extract<FormatItem, { kind: "group" }>).items.map(
            (child, childIndex) => (
              <FormatNode
                key={`${key}.${childIndex}`}
                item={child}
                path={[...path, childIndex]}
                callbacks={cb}
              />
            ),
          )}
        </ul>
      ) : null}
    </li>
  );
}
