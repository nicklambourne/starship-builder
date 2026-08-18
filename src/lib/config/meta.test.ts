import { describe, expect, it } from "vitest";
import {
  MODULE_GROUPS,
  MODULE_META,
  isFormatOption,
  isStyleOption,
  moduleMeta,
  modulesInGroup,
  optionKind,
} from "./meta";
import { getModuleSchemas, getOptionSchema } from "./schema";

const modules = getModuleSchemas();

describe("MODULE_META", () => {
  it("covers every module in the schema, and nothing else", () => {
    expect(Object.keys(MODULE_META).sort()).toEqual(modules.map((m) => m.name).sort());
  });

  it("puts every module in a known group", () => {
    for (const [name, meta] of Object.entries(MODULE_META)) {
      expect(MODULE_GROUPS, name).toContain(meta.group);
    }
  });

  it("links each module to starship's config reference", () => {
    for (const [name, meta] of Object.entries(MODULE_META)) {
      expect(meta.docs, name).toMatch(/^https:\/\/starship\.rs\/config\/(#[a-z0-9-]+)?$/);
    }
    expect(MODULE_META.golang.docs).toBe("https://starship.rs/config/#go");
    expect(MODULE_META.nodejs.docs).toBe("https://starship.rs/config/#node-js");
    expect(MODULE_META.hg_branch.docs).toBe("https://starship.rs/config/#mercurial-branch");
    expect(MODULE_META.gcloud.docs).toBe("https://starship.rs/config/#google-cloud-gcloud");
  });

  it("only names string options that actually exist", () => {
    for (const [name, meta] of Object.entries(MODULE_META)) {
      for (const key of [...meta.formatOptions, ...meta.styleOptions]) {
        expect(getOptionSchema(name, key)?.type, `${name}.${key}`).toBe("string");
      }
    }
  });

  it("never classifies an option as both format and style", () => {
    for (const [name, meta] of Object.entries(MODULE_META)) {
      const overlap = meta.formatOptions.filter((k) => meta.styleOptions.includes(k));
      expect(overlap, name).toEqual([]);
    }
  });

  it("lists `format` first when a module has one", () => {
    for (const [name, meta] of Object.entries(MODULE_META)) {
      if (meta.formatOptions.includes("format")) {
        expect(meta.formatOptions[0], name).toBe("format");
      }
    }
  });
});

describe("format and style classification", () => {
  it("treats every `style`-suffixed option as a style string", () => {
    expect(isStyleOption("directory", "read_only_style")).toBe(true);
    expect(isStyleOption("golang", "not_capable_style")).toBe(true);
    expect(isStyleOption("username", "style_root")).toBe(true);
    expect(isStyleOption("username", "style_user")).toBe(true);
    expect(isStyleOption("status", "success_style")).toBe(true);
  });

  it("excludes version_format and time_format, which are other mini-languages", () => {
    expect(isFormatOption("nodejs", "version_format")).toBe(false);
    expect(isFormatOption("time", "time_format")).toBe(false);
  });

  it("follows starship's map_meta wiring rather than the option's name", () => {
    // Parsed as format strings...
    expect(isFormatOption("jobs", "symbol")).toBe(true);
    expect(isFormatOption("kubernetes", "symbol")).toBe(true);
    expect(isFormatOption("shlvl", "symbol")).toBe(true);
    expect(isFormatOption("character", "vimcmd_symbol")).toBe(true);
    expect(isFormatOption("git_status", "ahead")).toBe(true);
    expect(isFormatOption("shell", "fish_indicator")).toBe(true);
    expect(isFormatOption("vcs", "git_modules")).toBe(true);
    expect(isFormatOption("directory", "repo_root_format")).toBe(true);
    expect(isFormatOption("nix_shell", "impure_msg")).toBe(true);

    // ...and inserted literally.
    expect(isFormatOption("mise", "symbol")).toBe(false);
    expect(isFormatOption("dotnet", "symbol")).toBe(false);
    expect(isFormatOption("fill", "symbol")).toBe(false);
    expect(isFormatOption("direnv", "symbol")).toBe(false);
    expect(isFormatOption("git_branch", "truncation_symbol")).toBe(false);
    expect(isFormatOption("aws", "expiration_symbol")).toBe(false);
    expect(isFormatOption("claude_context", "gauge_full_symbol")).toBe(false);
  });
});

describe("optionKind", () => {
  it("prefers the overlay over the schema's plain `string`", () => {
    expect(optionKind("aws", "format")).toBe("format");
    expect(optionKind("aws", "style")).toBe("style");
    expect(optionKind("aws", "symbol")).toBe("format");
    expect(optionKind("aws", "expiration_symbol")).toBe("string");
  });

  it("maps schema types onto editors", () => {
    expect(optionKind("aws", "force_display")).toBe("boolean");
    expect(optionKind("cmd_duration", "min_time")).toBe("number");
    expect(optionKind("nodejs", "detect_files")).toBe("array");
    expect(optionKind("aws", "region_aliases")).toBe("raw");
    expect(optionKind("custom", "when")).toBe("raw");
  });

  it("falls back to the default value for options the schema omits", () => {
    expect(optionKind("aws", "not_in_schema", true)).toBe("boolean");
    expect(optionKind("aws", "not_in_schema", 3)).toBe("number");
    expect(optionKind("aws", "not_in_schema", "x")).toBe("string");
    expect(optionKind("aws", "not_in_schema", ["x"])).toBe("array");
    expect(optionKind("aws", "not_in_schema", { a: 1 })).toBe("raw");
    expect(optionKind("aws", "not_in_schema")).toBe("raw");
  });

  it("accepts a pre-looked-up meta entry", () => {
    expect(optionKind("aws", "symbol", undefined, MODULE_META.aws)).toBe("format");
  });
});

describe("lookups", () => {
  it("falls back to a neutral entry for unknown modules", () => {
    const meta = moduleMeta("not_a_module");
    expect(meta.docs).toBe("https://starship.rs/config/");
    expect(meta.formatOptions).toEqual([]);
    expect(isFormatOption("not_a_module", "format")).toBe(false);
  });

  it("partitions modules across the groups without gaps", () => {
    const grouped = MODULE_GROUPS.flatMap((group) => modulesInGroup(group));
    expect(grouped.sort()).toEqual(Object.keys(MODULE_META).sort());
  });
});
