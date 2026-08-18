import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, resolveDefaults } from "./defaults";
import { getModuleSchemas } from "./schema";
import type { ModuleDefinition } from "@/lib/engine/modules/types";

describe("DEFAULT_CONFIG", () => {
  it("carries the root defaults", () => {
    expect(DEFAULT_CONFIG.format).toBe("$all");
    expect(DEFAULT_CONFIG.add_newline).toBe(true);
    expect(DEFAULT_CONFIG.scan_timeout).toBe(30);
    // Nullable with no default in the schema.
    expect(DEFAULT_CONFIG.palette).toBeUndefined();
  });

  it("has a table for every module", () => {
    for (const module of getModuleSchemas()) {
      expect(DEFAULT_CONFIG[module.name], module.name).toBeTypeOf("object");
    }
  });

  it("leaves the instance-map modules empty", () => {
    // The schema describes one `[env_var.NAME]` instance; the default for the
    // root key is an empty map, so a user's instances always survive a diff.
    expect(DEFAULT_CONFIG.env_var).toEqual({});
    expect(DEFAULT_CONFIG.custom).toEqual({});
  });

  it("matches starship's module defaults", () => {
    expect(DEFAULT_CONFIG.aws).toMatchObject({ symbol: "☁️  ", style: "bold yellow" });
    expect(DEFAULT_CONFIG.character).toMatchObject({
      format: "$symbol ",
      success_symbol: "[❯](bold green)",
    });
  });
});

describe("resolveDefaults", () => {
  const modules: ModuleDefinition[] = [
    {
      name: "aws",
      defaults: { format: "$symbol", symbol: "AWS ", disabled: false },
      evaluate: () => null,
    },
  ];

  it("returns the schema defaults when given no registry", () => {
    expect(resolveDefaults()).toEqual(DEFAULT_CONFIG);
  });

  it("layers registry defaults over the schema's", () => {
    const resolved = resolveDefaults(modules);
    const aws = resolved.aws as Record<string, unknown>;
    expect(aws.symbol).toBe("AWS ");
    // Options the registry does not mention keep their schema default.
    expect(aws.style).toBe("bold yellow");
  });

  it("leaves modules outside the registry untouched", () => {
    expect(resolveDefaults(modules).zig).toEqual(DEFAULT_CONFIG.zig);
  });

  it("does not mutate DEFAULT_CONFIG", () => {
    resolveDefaults(modules);
    expect((DEFAULT_CONFIG.aws as Record<string, unknown>).symbol).toBe("☁️  ");
  });
});
