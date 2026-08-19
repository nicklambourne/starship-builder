"use client";

/**
 * Dragging a prompt row, by pointer rather than by HTML5 drag-and-drop.
 *
 * The native API does not fire on touch: on a phone the drag handles were
 * decorative, and the only other way to reorder anything was the keyboard,
 * which a phone does not have either. Pointer events cover mouse, pen and
 * touch in one path, at the cost of tracking the drop target by hit-testing.
 *
 * The handle sets `touch-action: none` so a drag is not read as a scroll; the
 * rest of the list keeps scrolling normally.
 */

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { DropPosition } from "@/lib/config/formatItems";
import type { Path } from "@/lib/config/formatTree";

/** How far down a row the pointer is, as the drop it implies. */
function positionIn(row: Element, clientY: number): DropPosition {
  const box = row.getBoundingClientRect();
  const offset = (clientY - box.top) / box.height;
  if (offset < 0.25) return "before";
  if (offset > 0.75) return "after";
  return "into";
}

/** The path encoded in a row's `data-format-row`, or null if it has none. */
function pathOf(row: Element): Path | null {
  const key = row.getAttribute("data-format-row");
  if (!key) return null;
  const parts = key.split(".").map(Number);
  return parts.every((n) => Number.isInteger(n)) ? parts : null;
}

/** Pixels from a viewport edge that start auto-scrolling, and how fast. */
const EDGE = 72;
const SPEED = 12;

export interface PointerDragHandlers {
  onDragStart(path: Path): void;
  onDragOver(path: Path, position: DropPosition): void;
  /**
   * `from` comes back from the hook rather than being read out of component
   * state: these handlers are captured when the drag starts, and at that
   * instant the state saying what is being dragged has not been set yet.
   */
  onDrop(from: Path, to: Path, position: DropPosition): void;
  onCancel(): void;
}

export function usePointerDrag({
  onDragStart,
  onDragOver,
  onDrop,
  onCancel,
}: PointerDragHandlers) {
  // Held in refs so the window listeners never go stale mid-drag.
  const active = useRef(false);
  const source = useRef<Path | null>(null);
  const target = useRef<{ path: Path; position: DropPosition } | null>(null);
  const scroller = useRef<number | null>(null);

  const stopScrolling = () => {
    if (scroller.current !== null) {
      window.clearInterval(scroller.current);
      scroller.current = null;
    }
  };

  const finish = useCallback(() => {
    active.current = false;
    source.current = null;
    target.current = null;
    stopScrolling();
  }, []);

  useEffect(() => stopScrolling, []);

  return useCallback(
    (event: ReactPointerEvent<HTMLElement>, path: Path) => {
      // Left button or a touch, never a right-click or a modifier chord.
      if (event.button !== 0 || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();

      active.current = true;
      source.current = path;
      target.current = null;
      onDragStart(path);

      const scope = event.currentTarget.closest("[data-format-scope]");

      const move = (moveEvent: PointerEvent) => {
        if (!active.current) return;
        moveEvent.preventDefault();

        /*
         * A long list on a short screen cannot be dragged across without
         * this: the pointer reaches the edge and there is nowhere left to go.
         */
        const nearTop = moveEvent.clientY < EDGE;
        const nearBottom = moveEvent.clientY > window.innerHeight - EDGE;
        if (nearTop || nearBottom) {
          if (scroller.current === null) {
            const direction = nearTop ? -SPEED : SPEED;
            scroller.current = window.setInterval(
              () => window.scrollBy(0, direction),
              16,
            );
          }
        } else {
          stopScrolling();
        }

        const under = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const row = under?.closest("[data-format-row]");
        // Rows in another editor — the right prompt, a module's own format —
        // are not valid targets for this one.
        if (!row || (scope && !scope.contains(row))) {
          target.current = null;
          onCancel();
          return;
        }

        const dropPath = pathOf(row);
        if (!dropPath) return;
        const position = positionIn(row, moveEvent.clientY);
        target.current = { path: dropPath, position };
        onDragOver(dropPath, position);
      };

      const up = () => {
        const from = source.current;
        const landing = target.current;
        finish();
        if (from && landing) onDrop(from, landing.path, landing.position);
        else onCancel();
        detach();
      };

      const cancel = () => {
        finish();
        onCancel();
        detach();
      };

      const key = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key === "Escape") cancel();
      };

      function detach() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("keydown", key);
      }

      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("keydown", key);
    },
    [onDragStart, onDragOver, onDrop, onCancel, finish],
  );
}
