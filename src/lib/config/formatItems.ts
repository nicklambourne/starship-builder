/**
 * A flat, editable view of a format string.
 *
 * The format grammar is a tree, but the thing people actually want to
 * manipulate is a sequence: this module goes here, that literal sits between
 * them, this part is purple. `toItems` flattens the top level of a parsed
 * format into that sequence and `fromItems` puts it back.
 *
 * Constructs the flat view cannot represent faithfully (conditionals, groups
 * mixing variables and text, anything nested) become `raw` items. They are
 * preserved verbatim and can be moved or deleted, just not restructured —
 * which keeps the visual editor lossless for configs it does not fully
 * understand, rather than silently rewriting them.
 */

import {
  type FormatElement,
  parseFormatString,
  printFormat,
} from "@/lib/engine/formatString";

export type FormatItem =
  | { kind: "module"; name: string; style?: string }
  | { kind: "text"; value: string; style?: string }
  | { kind: "raw"; source: string };

/** Renders a text group's style elements back to a style string. */
function styleToString(
  style: { type: "text" | "variable"; value?: string; name?: string }[],
): string {
  return style
    .map((s) => (s.type === "text" ? (s.value ?? "") : `$${s.name}`))
    .join("");
}

function elementToItem(element: FormatElement): FormatItem {
  if (element.type === "variable") {
    return { kind: "module", name: element.name };
  }
  if (element.type === "text") {
    return { kind: "text", value: element.value };
  }
  if (element.type === "textGroup") {
    const style = styleToString(element.style);
    const inner = element.format;
    // A group wrapping exactly one variable is a styled module.
    if (inner.length === 1 && inner[0].type === "variable") {
      return { kind: "module", name: inner[0].name, style };
    }
    // A group of pure text is styled literal text.
    if (inner.length > 0 && inner.every((el) => el.type === "text")) {
      return {
        kind: "text",
        value: inner.map((el) => (el.type === "text" ? el.value : "")).join(""),
        style,
      };
    }
  }
  return { kind: "raw", source: printFormat([element]) };
}

export function toItems(format: string): FormatItem[] | null {
  try {
    return parseFormatString(format).map(elementToItem);
  } catch {
    return null;
  }
}

export function itemToSource(item: FormatItem): string {
  if (item.kind === "raw") return item.source;

  if (item.kind === "module") {
    const variable = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item.name)
      ? `$${item.name}`
      : `\${${item.name}}`;
    return item.style ? `[${variable}](${item.style})` : variable;
  }

  const escaped = item.value.replace(/[[\]()\\$]/g, (ch) => `\\${ch}`);
  return item.style ? `[${escaped}](${item.style})` : escaped;
}

export function fromItems(items: FormatItem[]): string {
  return items.map(itemToSource).join("");
}

/** Moves an item, returning a new array. Out-of-range moves are no-ops. */
export function moveItem(
  items: FormatItem[],
  index: number,
  direction: -1 | 1,
): FormatItem[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** A short human label for an item, used in the editor's rows. */
export function itemLabel(item: FormatItem): string {
  switch (item.kind) {
    case "module":
      return item.name === "all" ? "$all (every other module)" : `$${item.name}`;
    case "text":
      return item.value.trim().length === 0
        ? `space × ${item.value.length}`
        : `"${item.value}"`;
    case "raw":
      return item.source;
  }
}
