"use client";

/**
 * Schema-driven settings form for one module.
 *
 * Controls are chosen from the option's type plus the curated metadata that
 * says which strings are format strings and which are style strings — the JSON
 * schema types both as plain `string`, so the distinction cannot come from the
 * schema alone. Anything the form cannot model falls back to a raw JSON editor
 * so the whole config surface stays reachable.
 */

import { useId } from "react";

import { FormatBuilder } from "./FormatBuilder";
import { StyleStringBuilder } from "./StyleStringBuilder";
import { SymbolInput } from "@/components/ui/SymbolInput";
import { Toggle } from "@/components/ui/Toggle";
import type { Palette } from "@/lib/engine/styleString";
import type { TerminalTheme } from "@/lib/terminalThemes";

export interface OptionDescriptor {
  key: string;
  kind: "format" | "style" | "boolean" | "number" | "string" | "enum" | "array" | "raw";
  description?: string;
  enumValues?: string[];
  defaultValue: unknown;
}

interface SettingsFormProps {
  options: OptionDescriptor[];
  /** Values explicitly set by the user; missing keys fall back to defaults. */
  values: Record<string, unknown>;
  onChange(key: string, value: unknown): void;
  onReset(key: string): void;
  /** Variables valid inside this module's format strings. */
  formatVariables?: string[];
  palette?: Palette;
  paletteNames?: string[];
  /** Nested format editors show style swatches, which are theme-coloured. */
  theme: TerminalTheme;
  /** Terminal font stack: module symbols are Nerd Font glyphs. */
  fontStack: string;
}

function Row({
  label,
  description,
  isOverridden,
  onReset,
  children,
}: {
  label: string;
  description?: string;
  isOverridden: boolean;
  onReset(): void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-white/5 py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm text-neutral-200">{label}</span>
        {isOverridden ? (
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-300"
          >
            reset
          </button>
        ) : null}
      </div>
      {description ? (
        <p className="text-xs leading-relaxed text-neutral-500">{description}</p>
      ) : null}
      {children}
    </div>
  );
}

export function SettingsForm({
  options,
  values,
  onChange,
  onReset,
  formatVariables,
  palette,
  paletteNames,
  theme,
  fontStack,
}: SettingsFormProps) {
  const formId = useId();

  return (
    <div className="flex flex-col">
      {options.map((option) => {
        const isOverridden = Object.hasOwn(values, option.key);
        const value = isOverridden ? values[option.key] : option.defaultValue;
        const controlId = `${formId}-${option.key}`;

        return (
          <Row
            key={option.key}
            label={option.key}
            description={option.description}
            isOverridden={isOverridden}
            onReset={() => onReset(option.key)}
          >
            {option.kind === "boolean" ? (
              <Toggle
                label={option.key}
                checked={Boolean(value)}
                onChange={(next) => onChange(option.key, next)}
              />
            ) : option.kind === "format" ? (
              <FormatBuilder
                value={typeof value === "string" ? value : ""}
                onChange={(next) => onChange(option.key, next)}
                vocabulary={formatVariables ?? []}
                palette={palette}
                paletteNames={paletteNames}
                noun="variable"
                theme={theme}
                fontStack={fontStack}
              />
            ) : option.kind === "style" ? (
              <StyleStringBuilder
                value={typeof value === "string" ? value : ""}
                onChange={(next) => onChange(option.key, next)}
                palette={palette}
                paletteNames={paletteNames}
              />
            ) : option.kind === "number" ? (
              <input
                id={controlId}
                type="number"
                value={typeof value === "number" ? value : 0}
                onChange={(e) => onChange(option.key, Number(e.target.value))}
                className="w-32 rounded border border-white/10 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
              />
            ) : option.kind === "enum" ? (
              <select
                id={controlId}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(option.key, e.target.value)}
                className="w-full rounded border border-white/10 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
              >
                {(option.enumValues ?? []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : option.kind === "array" ? (
              <input
                id={controlId}
                value={Array.isArray(value) ? value.join(", ") : ""}
                onChange={(e) =>
                  onChange(
                    option.key,
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                spellCheck={false}
                placeholder="comma, separated, values"
                className="w-full rounded border border-white/10 bg-neutral-950 px-2 py-1.5 font-mono text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
              />
            ) : option.kind === "string" ? (
              // Plain strings include every module's `symbol`, so they get the
              // terminal font and the glyph picker.
              <SymbolInput
                id={controlId}
                value={typeof value === "string" ? value : ""}
                onChange={(next) => onChange(option.key, next)}
                fontStack={fontStack}
                ariaLabel={option.key}
              />
            ) : (
              <textarea
                id={controlId}
                value={JSON.stringify(value ?? null, null, 2)}
                rows={4}
                spellCheck={false}
                onChange={(e) => {
                  try {
                    onChange(option.key, JSON.parse(e.target.value));
                  } catch {
                    // Keep the keystroke; invalid JSON simply is not committed.
                  }
                }}
                className="w-full resize-y rounded border border-white/10 bg-neutral-950 px-2 py-1.5 font-mono text-xs text-neutral-100 focus:border-sky-400 focus:outline-none"
              />
            )}
          </Row>
        );
      })}
    </div>
  );
}
