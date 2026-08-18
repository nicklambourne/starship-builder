"use client";

/**
 * One draggable row in the format builder.
 *
 * The handle is a real button, not a bare drag affordance: pointer users drag
 * it, keyboard users focus it and press the arrow keys. Drag-and-drop alone
 * would make reordering unreachable without a mouse, which for the control
 * that decides prompt order is not an acceptable trade.
 */

import type { DragEvent, KeyboardEvent, ReactNode } from "react";

interface FormatRowProps {
  index: number;
  label: string;
  description?: string;
  tone: "module" | "text" | "group" | "raw";
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart(index: number): void;
  onDragEnd(): void;
  onDragOverIndex(index: number): void;
  onDrop(index: number): void;
  onMove(index: number, direction: -1 | 1): void;
  children?: ReactNode;
  actions?: ReactNode;
  body?: ReactNode;
}

const TONE: Record<FormatRowProps["tone"], string> = {
  module: "text-sky-200",
  text: "text-neutral-400",
  group: "text-emerald-200",
  raw: "text-amber-200",
};

export function FormatRow({
  index,
  label,
  description,
  tone,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOverIndex,
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

  const handleDragOver = (event: DragEvent) => {
    // Required for the element to be a valid drop target at all.
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onDragOverIndex(index);
  };

  return (
    <li
      onDragOver={handleDragOver}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(index);
      }}
      className={`rounded border bg-neutral-900/60 transition ${
        isDragging
          ? "border-sky-400 opacity-40"
          : isDropTarget
            ? "border-sky-400/70 ring-1 ring-sky-400/40"
            : "border-white/10"
      }`}
    >
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
          aria-label={`Reorder ${label}. Press the arrow keys to move it.`}
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
