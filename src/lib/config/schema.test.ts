import { describe, expect, it } from "vitest";
import {
  ROOT_OPTIONS,
  getModuleSchema,
  getModuleSchemas,
  getOptionSchema,
  getRootOption,
  isKnownModule,
} from "./schema";

describe("ROOT_OPTIONS", () => {
  it("covers exactly the documented prompt-wide options", () => {
    expect(ROOT_OPTIONS.map((o) => o.key)).toEqual([
      "format",
      "right_format",
      "add_newline",
      "palette",
      "palettes",
      "continuation_prompt",
      "scan_timeout",
      "command_timeout",
      "follow_symlinks",
    ]);
  });

  it("carries starship's own defaults", () => {
    expect(getRootOption("format")?.default).toBe("$all");
    expect(getRootOption("add_newline")?.default).toBe(true);
    expect(getRootOption("scan_timeout")?.default).toBe(30);
    // `palette` is nullable and has no default.
    expect(getRootOption("palette")?.default).toBeUndefined();
  });
});

describe("getModuleSchemas", () => {
  const modules = getModuleSchemas();

  it("loads every module table starship accepts", () => {
    expect(modules.length).toBeGreaterThan(100);
    for (const name of ["aws", "git_status", "character", "nodejs", "env_var", "custom"]) {
      expect(isKnownModule(name)).toBe(true);
    }
    expect(isKnownModule("not_a_module")).toBe(false);
  });

  it("is sorted by name and has no duplicates", () => {
    const names = modules.map((m) => m.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every module a format and disabled option", () => {
    // `fill`, `line_break` and `vcs` render without a format string.
    const formatless = new Set(["fill", "line_break", "vcs"]);
    for (const module of modules) {
      const keys = module.options.map((o) => o.key);
      expect(keys, module.name).toContain("disabled");
      if (!formatless.has(module.name)) expect(keys, module.name).toContain("format");
    }
  });

  it("normalises option types to the kinds the UI can edit", () => {
    const allowed = new Set(["string", "boolean", "number", "array", "object", "unknown"]);
    for (const module of modules) {
      for (const option of module.options) {
        expect(allowed, `${module.name}.${option.key}`).toContain(option.type);
      }
    }
  });

  it("resolves union-typed options rather than leaving raw $refs", () => {
    // `VecOr_string` accepts a scalar or a list; a list editor covers both.
    expect(getOptionSchema("pixi", "pixi_binary")?.type).toBe("array");
    expect(getOptionSchema("python", "python_binary")?.type).toBe("array");
    // Heterogeneous unions have no single editor.
    expect(getOptionSchema("custom", "when")?.type).toBe("unknown");
    expect(getOptionSchema("directory", "substitutions")?.type).toBe("unknown");
  });

  it("keeps defaults byte-for-byte, including glyphs and trailing spaces", () => {
    expect(getOptionSchema("aws", "symbol")?.default).toBe("☁️  ");
    expect(getOptionSchema("character", "success_symbol")?.default).toBe("[❯](bold green)");
    expect(getOptionSchema("git_status", "format")?.default).toBe(
      "([\\[$all_status$ahead_behind\\]]($style) )",
    );
  });

  it("trims module descriptions to a single paragraph", () => {
    const aws = getModuleSchema("aws");
    expect(aws?.description).toMatch(/^The `aws` module shows/);
    expect(aws?.description).not.toContain("\n");
  });

  it("returns undefined for unknown lookups", () => {
    expect(getModuleSchema("nope")).toBeUndefined();
    expect(getOptionSchema("aws", "nope")).toBeUndefined();
    expect(getOptionSchema("nope", "format")).toBeUndefined();
  });
});
