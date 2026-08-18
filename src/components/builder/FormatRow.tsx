"use client";

/**
 * One draggable row in the format builder.
 *
 * Drop feedback is a line on the edge the item will land against, plus a ring
 * when the drop would put it *inside* the row's group — the three outcomes of
 * a drag look different from each other, so the result is never a surprise.
 *
 * The handle is a real button, not a bare drag affordance: pointer users drag
 * it, keyboard users focus it and press the arrow keys. Drag alone would make
 * reordering unreachable without a mouse, which for the control that decides
 * prompt order is not an acceptable trade.
 */

import type { DragEvent, KeyboardEvent, ReactNode } from "react";

import type { DropPosition } from "@/lib/config/formatItems";

interface FormatRowProps {
  index: number;
  label: string;
  description?: string;
  tone: "module" | "text" | "group" | "raw";
  isDragging: boolean;
  /** Where a drop on this row would land, or null when it is not the target. */
  dropPosition: DropPosition | null;
  onDragStart(index: number): void;
  onDragEnd(): void;
  onDragOverRow(index: number, position: DropPosition): void;
  onDrop(index: number, position: DropPosition): void;
  onMove(index: number, direction: -1 | 1): void;
  actions?: ReactNode;
  body?: ReactNode;
}

const TONE: Record<FormatRowProps["tone"], string> = {
  module: "text-sky-200",
  text: "text-neutral-400",
  group: "text-emerald-200",
  raw: "text-amber-200",
};

/**
 * Splits a row into three bands: the outer quarters insert before or after,
 * the middle half drops into a group. Half the row is given to grouping
 * because it is the harder gesture to aim.
 */
function positionWithin(event: DragEvent<HTMLElement>): DropPosition {
  const box = event.currentTarget.getBoundingClientRect();
  const offset = (event.clientY - box.top) / box.height;
  if (offset < 0.25) return "before";
  if (offset > 0.75) return "after";
  return "into";
}

export function FormatRow({
  index,
  label,
  description,
  tone,
  isDragging,
  dropPosition,
  onDragStart,
  onDragEnd,
  onDragOverRow,
  onDrop,
  onMove,
  actions,
  body,
}: FormatRowProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      onMove(index, -1);
    } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      onMove(index, 1);
    }
  };

  return (
    <li
      data-format-row={index}
      onDragOver={(event) => {
        // Required for the element to be a valid drop target at all.
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOverRow(index, positionWithin(event));
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(index, positionWithin(event));
      }}
      className={`relative rounded border bg-neutral-900/60 transition ${
        isDragging ? "border-sky-400/40 opacity-40" : "border-white/10"
      } ${dropPosition === "into" ? "ring-2 ring-emerald-400/70" : ""}`}
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
            event.dataTransfer.setData("text/plain", String(index));
            onDragStart(index);
          }}
          onDragEnd={onDragEnd}
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

        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate font-mono text-sm ${TONE[tone]}`}>{label}</span>
          {description ? (
            <span className="truncate text-xs text-neutral-500">{description}</span>
          ) : null}
        </span>

        {actions}
      </div>
      {body}
    </li>
  );
}
