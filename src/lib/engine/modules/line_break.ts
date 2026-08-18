import type { ModuleDefinition } from "./types";

export const line_break: ModuleDefinition = {
  name: "line_break",
  defaults: {
    // Starship's `line_break` has no `format` option — it emits a single
    // `LineTerm` segment. `ModuleDefinition` requires a format, so this
    // synthetic one just carries that segment through the renderer.
    format: "$line_break",
    disabled: false,
  },
  evaluate() {
    return { variables: { line_break: { segments: [{ kind: "lineTerm" }] } } };
  },
};
