"use client";

/**
 * Editor for a starship format string.
 *
 * Validates as you type using the real parser, so syntax errors surface with
 * the offending index rather than silently rendering nothing. Known variables
 * for the current module are offered as one-click inserts, since the variable
 * set is the part users cannot guess.
 */

import { useId, useMemo, useRef } from "react";

import { tryParseFormatString } from "@/lib/engine/formatString";

/** Above this many variables the chip list starts collapsed. */
const CHIP_LIMIT = 16;

interface FormatEditorProps {
  value: string;
  onChange(next: string): void;
  /** Variables valid in this format string, e.g. ["symbol", "branch"]. */
  variables?: string[];
  rows?: number;
}

export function FormatEditor({
  value,
  onChange,
  variables = [],
  rows = 3,
}: FormatEditorProps) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const result = useMemo(() => tryParseFormatString(value), [value]);

  const insert = (token: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    // Restore the caret after the inserted token on the next frame, so typing
    // can continue uninterrupted.
    requestAnimationFrame(() => {
      el?.focus();
      const caret = start + token.length;
      el?.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        Format string
      </label>
      <textarea
        id={id}
        ref={ref}
        value={value}
        rows={rows}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!result.ok}
        aria-describedby={result.ok ? undefined : `${id}-error`}
        className={`w-full resize-y rounded border bg-neutral-950 px-2.5 py-2 font-mono text-sm text-neutral-100 focus:outline-none ${
          result.ok
            ? "border-white/10 focus:border-sky-400"
            : "border-red-500/60 focus:border-red-400"
        }`}
      />

      {!result.ok ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-400">
          {result.error} (at character {result.index + 1})
        </p>
      ) : null}

      {variables.length > 0 ? (
        // The root format can reference every module, which is far too many
        // chips to sit above the editor uncollapsed.
        <details open={variables.length <= CHIP_LIMIT}>
          <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
            Insert a variable ({variables.length})
          </summary>
          <div className="mt-1.5 flex max-h-40 flex-wrap items-center gap-1.5 overflow-y-auto">
            {variables.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => insert(`$${name}`)}
                className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-xs text-neutral-300 transition hover:border-sky-400 hover:text-sky-200"
              >
                ${name}
              </button>
            ))}
          </div>
        </details>
      ) : null}

      <details className="text-xs text-neutral-500">
        <summary className="cursor-pointer hover:text-neutral-300">
          Format string syntax
        </summary>
        <ul className="mt-1.5 flex flex-col gap-1 pl-4">
          <li>
            <code>$variable</code> or <code>{"${variable}"}</code> — insert a value
          </li>
          <li>
            <code>[text](style)</code> — style a group; the style replaces any
            outer style
          </li>
          <li>
            <code>(text)</code> — shown only when a variable inside it is
            non-empty
          </li>
          <li>
            <code>{"\\$"}</code> — escape a literal <code>$ [ ] ( )</code> or
            backslash
          </li>
        </ul>
      </details>
    </div>
  );
}
