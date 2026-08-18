"use client";

/**
 * A confirmation dialog for actions that throw work away.
 *
 * Built on the native `<dialog>` element rather than a hand-rolled overlay:
 * `showModal()` brings focus trapping, Escape to dismiss, inertness for the
 * rest of the page, and the top layer — all the things a bespoke modal
 * usually gets subtly wrong.
 */

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What will actually happen, stated plainly. */
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus starts on the safe choice, so a stray Enter cannot destroy work.
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      // Escape fires `cancel`; keep React's state in step with the element's.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // A click landing on the dialog itself is the backdrop, since the
        // panel below stops propagation.
        if (event.target === ref.current) onCancel();
      }}
      className="m-auto max-w-md rounded-xl border border-white/15 bg-neutral-900 p-0 text-neutral-100 backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" className="text-base font-semibold">
          {title}
        </h2>
        <div className="text-sm text-neutral-400">{body}</div>
        <div className="mt-1 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded border border-white/15 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-white/30"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
