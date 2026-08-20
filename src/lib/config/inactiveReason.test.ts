import { describe, expect, it } from "vitest";
import { WAITING_FOR, inactiveReason } from "./inactiveReason";
import { MODULES_BY_NAME, getModule } from "@/lib/engine/modules";
import { getScenario } from "@/lib/scenarios";

const scenario = getScenario("simple");

/** A module's own defaults, which is what the builder passes in. */
function defaults(name: string): Record<string, unknown> {
  return getModule(name)!.defaults;
}

describe("inactiveReason", () => {
  it("names a module the table has advice for", () => {
    for (const name of Object.keys(WAITING_FOR)) {
      expect(`${name}: ${MODULES_BY_NAME.has(name)}`).toBe(`${name}: true`);
    }
  });

  it("tells a language module apart from a wrong directory", () => {
    // Neither the tool nor the files: install it first.
    expect(inactiveReason("zig", scenario, defaults("zig"))).toBe(
      'starship reads the version by running the tool, so “zig” needs one under Installed tools, alongside a .zig file in the directory.',
    );

    // Tool present, directory empty: the other half is what is missing.
    const withZig = { ...scenario, toolVersions: { zig: "0.13.0" } };
    expect(inactiveReason("zig", withZig, defaults("zig"))).toBe(
      "Nothing in the directory looks like a zig project — add a .zig file under Directory.",
    );
  });

  it("names the environment variable a module reads", () => {
    expect(inactiveReason("spack", scenario, defaults("spack"))).toContain("SPACK_ENV");
    expect(inactiveReason("openstack", scenario, defaults("openstack"))).toContain("OS_CLOUD");
  });

  it("points at the control that would reveal the module", () => {
    expect(inactiveReason("conda", scenario, defaults("conda"))).toContain(
      "Cloud & orchestration",
    );
    const inRepo = getScenario("dirty-repo");
    expect(inactiveReason("git_commit", inRepo, defaults("git_commit"))).toContain(
      "Detached HEAD",
    );
    // Outside a repository the repository is the thing to say, not the switch.
    expect(inactiveReason("git_commit", scenario, defaults("git_commit"))).toContain(
      "Not inside a git repository",
    );
  });
});
