import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearSession, loadSession, saveSession } from "./session";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
});

const session = {
  config: { add_newline: false },
  scenario: { path: "/tmp", shell: "zsh" },
  themeId: "tokyo-night",
  fontId: "hack",
} as never;

describe("session storage", () => {
  it("round-trips what was saved", () => {
    saveSession(session);
    expect(loadSession()).toMatchObject({ themeId: "tokyo-night", fontId: "hack" });
  });

  it("ignores a payload from an older version", () => {
    saveSession(session);
    const raw = JSON.parse([...store.values()][0]);
    store.set([...store.keys()][0], JSON.stringify({ ...raw, version: 0 }));
    expect(loadSession()).toBeNull();
  });

  it("ignores anything that is not a session", () => {
    for (const junk of ["not json", "null", "[]", '{"version":1}', '{"version":1,"config":{},"scenario":{},"themeId":"a","fontId":"b"}']) {
      store.set("starship-prompt-builder.session", junk);
      expect(loadSession()).toBeNull();
    }
  });

  it("survives storage that throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem() { throw new Error("disabled"); },
        setItem() { throw new Error("quota"); },
        removeItem() { throw new Error("nope"); },
      },
    });
    // Private browsing must not take the app down with it.
    expect(() => saveSession(session)).not.toThrow();
    expect(loadSession()).toBeNull();
    expect(() => clearSession()).not.toThrow();
  });
});
