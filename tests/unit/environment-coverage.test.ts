/**
 * Every module has to be reachable from the environment panel.
 *
 * A module the panel cannot make visible is a switch that does nothing: it can
 * be enabled, it renders nothing, and no amount of fiddling with the simulated
 * environment changes that. Adding a module without also adding whatever makes
 * it appear is an easy mistake, so this fails the build instead.
 *
 * `panelReachable` mirrors what `EnvironmentPanel` can produce — the free-text
 * editors (files, environment variables, tool versions) accept any value, so
 * they are filled in generously; every other field is here only because a
 * control exists for it. It follows the panel rather than reading it, so
 * deleting a control will not fail this test; the end-to-end suite covers that
 * the controls are actually on screen.
 */

import { describe, expect, it } from "vitest";
import { ALL_MODULES } from "@/lib/engine/modules";
import { renderPrompt } from "@/lib/engine/prompt";
import { PROMPT_ORDER } from "@/lib/engine/promptOrder";
import { segmentsText } from "@/lib/engine/types";
import { getScenario } from "@/lib/scenarios";
import type { Scenario } from "@/lib/scenarios/types";

/**
 * Modules no environment can reveal, because what they show is configuration
 * rather than environment. Anything else belongs in the panel.
 */
const CONFIGURATION_ONLY: Record<string, string> = {
  custom: "runs a command the config supplies; without one there is nothing to run",
  env_var: "shows the variable the config names, so the config is what reveals it",
  line_break: "renders a newline and nothing else, so there is no visible text",
};

/** Environment variables modules read directly, beyond their declared lists. */
const CODE_ENV_VARS = [
  "FOSSIL_ADDED",
  "FOSSIL_BRANCH",
  "FOSSIL_DELETED",
  "GUIX_ENVIRONMENT",
  "MESON_PROJECT_NAME",
  "OPAMSWITCH",
  "OS_CLOUD",
  "PIJUL_CHANNEL",
  "PULUMI_STACK",
  "SINGULARITY_NAME",
  "SPACK_ENV",
  "SSH_CONNECTION",
  "VCSH_REPO_NAME",
];

function environmentVariables(): Record<string, string> {
  const env: Record<string, string> = { MESON_DEVENV: "1" };
  for (const module of ALL_MODULES) {
    for (const option of ["detect_env_vars", "detect_variables"] as const) {
      for (const name of (module.defaults[option] as string[]) ?? []) {
        if (!name.startsWith("!")) env[name] = "1";
      }
    }
  }
  for (const name of CODE_ENV_VARS) env[name] = "1";
  return env;
}

/**
 * A directory listing that satisfies one module's detection rules. Built per
 * module because several modules exclude files another module needs — nodejs
 * hides itself next to a `deno.json`, and that is faithful, not a gap.
 */
function filesFor(name: string): string[] {
  const module = ALL_MODULES.find((m) => m.name === name)!;
  const files = [".git", ".hg", ".fslckout", ".pijul"];
  for (const option of ["detect_files", "detect_folders"] as const) {
    for (const file of (module.defaults[option] as string[]) ?? []) {
      if (!file.startsWith("!")) files.push(file);
    }
  }
  for (const extension of (module.defaults.detect_extensions as string[]) ?? []) {
    if (!extension.startsWith("!")) files.push(`file.${extension}`);
  }
  // Two modules match manifests they do not declare as options.
  if (name === "package") files.push("package.json");
  if (name === "pulumi") files.push("Pulumi.yaml");
  return files;
}

const base = getScenario("dirty-repo");

const panelReachable: Scenario = {
  ...base,
  // Directory
  path: "/Users/you/code/app",
  readOnly: true,
  // Version control
  git: {
    ...base.git!,
    state: "REBASING",
    stateProgress: { current: 2, total: 5 },
    detached: true,
    addedLines: 12,
    deletedLines: 3,
  },
  hgState: "merge",
  // Session
  ssh: true,
  isRoot: true,
  keymap: "normal",
  shlvl: 3,
  // Last command
  status: 130,
  cmdDurationMs: 9000,
  jobs: 3,
  // System
  battery: { percentage: 8, status: "discharging" },
  terminalWidth: 120,
  netns: { name: "vpn" },
  // Free-text editors
  toolVersions: Object.fromEntries(ALL_MODULES.map((m) => [m.name, "1.2.3"])),
  env: environmentVariables(),
  // Cloud & orchestration
  aws: { profile: "prod", region: "ap-southeast-2" },
  gcloud: { project: "my-project" },
  azure: { subscription: "Prod" },
  kubernetes: { context: "prod", namespace: "web" },
  terraform: { workspace: "default" },
  docker: { context: "desktop" },
  conda: { environment: "science" },
  nats: { name: "local" },
  nix: { name: "shell", impure: true },
  container: { name: "podman" },
};

function rendersSomething(name: string): boolean {
  const { lines, right } = renderPrompt({
    config: { format: `$${name}`, add_newline: false, [name]: { disabled: false } },
    scenario: { ...panelReachable, files: filesFor(name) },
    modules: ALL_MODULES,
    defaultOrder: PROMPT_ORDER,
  });
  const text = lines.map((line) => segmentsText(line)).join("") + segmentsText(right);
  return text.replace(/\s/g, "") !== "";
}

describe("environment coverage", () => {
  for (const module of ALL_MODULES) {
    const reason = CONFIGURATION_ONLY[module.name];
    if (reason) {
      it(`${module.name} is configuration-only: ${reason}`, () => {
        expect(rendersSomething(module.name)).toBe(false);
      });
      continue;
    }

    it(`${module.name} can be made visible from the environment panel`, () => {
      expect(rendersSomething(module.name)).toBe(true);
    });
  }
});
