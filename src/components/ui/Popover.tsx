"use client";

/**
 * A panel anchored to a trigger, rendered in a portal.
 *
 * The portal is the point: the picker used to sit inline inside a format row,
 * which meant it stretched the row it belonged to and was clipped by the
 * scrolling panes around it. Rendering to `document.body` with fixed
 * positioning frees it from both, so it can be as wide as it needs to be.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PopoverProps {
  open: boolean;
  onClose(): void;
  /** The element the panel is positioned against. */
  anchor: HTMLElement | null;
  /** Preferred width; the panel shrinks to fit a narrow viewport. */
  width?: number;
  children: React.ReactNode;
  label: string;
}

const MARGIN = 8;

export function Popover({
  open,
  onClose,
  anchor,
  width = 420,
  children,
  label,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number }>();

  useLayoutEffect(() => {
    if (!open || !anchor) return;

    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const available = window.innerWidth - MARGIN * 2;
      const panelWidth = Math.min(width, available);
      // Prefer right-aligned to the trigger, then nudge back inside the
      // viewport — on a phone the trigger is often near the right edge.
      let left = Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - MARGIN);
      left = Math.max(MARGIN, left);

      const panelHeight = panelRef.current?.offsetHeight ?? 320;
      const below = rect.bottom + MARGIN;
      const fitsBelow = below + panelHeight <= window.innerHeight;
      const top = fitsBelow ? below : Math.max(MARGIN, rect.top - panelHeight - MARGIN);

      setPosition({ top, left, width: panelWidth });
    };

    place();
    // Any scroll can move the trigger, including inside the panes, so listen
    // in the capture phase rather than only on the window.
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, width]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, onClose, anchor]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      style={{
        position: "fixed",
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        width: position?.width ?? width,
        // Above the sticky preview column and the native dialog backdrop.
        zIndex: 60,
      }}
      className="rounded-lg border border-white/15 bg-neutral-900 shadow-2xl"
    >
      {children}
    </div>,
    document.body,
  );
}
