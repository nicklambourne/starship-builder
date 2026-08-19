"use client";

/**
 * Editable simulation of the shell environment.
 *
 * Most starship modules only appear when something in the environment says so
 * — a git repo, a `package.json`, `$AWS_PROFILE`, a non-zero exit code. In a
 * browser none of that exists, so it is supplied here instead. Without these
 * controls two thirds of the modules could never be seen at all.
 *
 * Grouped by what a person is actually trying to reproduce rather than by the
 * shape of the Scenario type, and collapsed by default so it does not bury the
 * preview it belongs to.
 */

import { useId } from "react";

import { Toggle } from "@/components/ui/Toggle";
import type { GitState, OsType, Scenario } from "@/lib/scenarios/types";

interface EnvironmentPanelProps {
  scenario: Scenario;
  onChange(patch: Partial<Scenario>): void;
}

const INPUT =
  "w-full rounded border border-white/10 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-accent-400 focus:outline-none";
const NUMBER = `${INPUT} font-mono`;

const OS_TYPES: OsType[] = [
  "Macos",
  "Linux",
  "Ubuntu",
  "Debian",
  "Fedora",
  "Arch",
  "Alpine",
  "NixOS",
  "Raspbian",
  "Redhat",
  "Windows",
  "Unknown",
];

const SHELLS: Scenario["shell"][] = [
  "zsh",
  "bash",
  "fish",
  "powershell",
  "pwsh",
  "nu",
  "elvish",
  "ion",
  "tcsh",
  "xonsh",
  "cmd",
];

/** Tools offered as one-click version toggles, keyed by module name. */
const COMMON_TOOLS: { key: string; label: string; version: string }[] = [
  { key: "nodejs", label: "Node.js", version: "22.19.0" },
  { key: "python", label: "Python", version: "3.13.1" },
  { key: "rust", label: "Rust", version: "1.84.0" },
  { key: "golang", label: "Go", version: "1.24.0" },
  { key: "java", label: "Java", version: "21.0.5" },
  { key: "ruby", label: "Ruby", version: "3.4.1" },
  { key: "php", label: "PHP", version: "8.4.2" },
  { key: "dotnet", label: ".NET", version: "9.0.101" },
  { key: "deno", label: "Deno", version: "2.1.4" },
  { key: "bun", label: "Bun", version: "1.1.42" },
  { key: "terraform", label: "Terraform", version: "1.10.3" },
  { key: "docker", label: "Docker", version: "27.4.0" },
];

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded border border-white/10 bg-neutral-900/40">
      <summary className="cursor-pointer px-3 py-2 text-sm text-neutral-200">
        {title}
        {hint ? (
          <span className="ml-2 text-xs text-neutral-500">{hint}</span>
        ) : null}
      </summary>
      <div className="flex flex-col gap-2 border-t border-white/10 p-3">
        {children}
      </div>
    </details>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-400">
      {label}
      {children}
    </label>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(next: boolean): void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-neutral-300">{label}</span>
      <Toggle size="sm" label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

/** Key/value editor used for both environment variables and tool versions. */
function PairEditor({
  entries,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addLabel,
}: {
  entries: Record<string, string>;
  onChange(next: Record<string, string>): void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  addLabel: string;
}) {
  const id = useId();
  const rows = Object.entries(entries);

  const setKey = (oldKey: string, newKey: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of rows) next[k === oldKey ? newKey : k] = v;
    delete next[""];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([key, value], index) => (
        <div key={`${id}-${index}`} className="flex items-center gap-1.5">
          <input
            aria-label={`${keyPlaceholder} ${index + 1}`}
            value={key}
            placeholder={keyPlaceholder}
            onChange={(e) => setKey(key, e.target.value)}
            spellCheck={false}
            className={`${INPUT} font-mono`}
          />
          <input
            aria-label={`${valuePlaceholder} for ${key}`}
            value={value}
            placeholder={valuePlaceholder}
            onChange={(e) => onChange({ ...entries, [key]: e.target.value })}
            spellCheck={false}
            className={`${INPUT} font-mono`}
          />
          <button
            type="button"
            aria-label={`Remove ${key}`}
            onClick={() => {
              const next = { ...entries };
              delete next[key];
              onChange(next);
            }}
            className="shrink-0 rounded px-1.5 py-1 text-xs text-neutral-500 transition hover:bg-white/10 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...entries, "": "" })}
        className="self-start rounded border border-white/15 px-2 py-1 text-xs text-neutral-200 transition hover:border-accent-400 hover:text-accent-200"
      >
        {addLabel}
      </button>
    </div>
  );
}

export function EnvironmentPanel({ scenario, onChange }: EnvironmentPanelProps) {
  const git = scenario.git;

  const setGit = (patch: Partial<GitState>) => {
    if (!git) return;
    onChange({ git: { ...git, ...patch } });
  };

  const toggleRepo = (inRepo: boolean) => {
    onChange({
      git: inRepo
        ? {
            branch: "main",
            commit: "a1b2c3d",
            detached: false,
            ahead: 0,
            behind: 0,
            staged: 0,
            modified: 0,
            deleted: 0,
            renamed: 0,
            untracked: 0,
            conflicted: 0,
            stashed: 0,
            root: scenario.path,
            hasRemote: true,
            remoteName: "origin",
            remoteBranch: "main",
          }
        : undefined,
    });
  };

  return (
    <details className="rounded-lg border border-white/10 bg-neutral-900/30">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-neutral-100">
        Simulated environment
        <span className="ml-2 text-xs font-normal text-neutral-500">
          what the shell would report — decides which modules appear
        </span>
      </summary>

      <div className="flex flex-col gap-2 border-t border-white/10 p-3">
        <Section title="Session" hint="user, host, shell">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Username">
              <input
                value={scenario.username}
                onChange={(e) => onChange({ username: e.target.value })}
                className={INPUT}
              />
            </Field>
            <Field label="Hostname">
              <input
                value={scenario.hostname}
                onChange={(e) => onChange({ hostname: e.target.value })}
                className={INPUT}
              />
            </Field>
            <Field label="Shell">
              <select
                value={scenario.shell}
                onChange={(e) =>
                  onChange({ shell: e.target.value as Scenario["shell"] })
                }
                className={INPUT}
              >
                {SHELLS.map((shell) => (
                  <option key={shell} value={shell}>
                    {shell}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Shell nesting (SHLVL)">
              <input
                type="number"
                min={1}
                value={scenario.shlvl ?? 1}
                onChange={(e) => onChange({ shlvl: Number(e.target.value) })}
                className={NUMBER}
              />
            </Field>
          </div>
          <SwitchRow
            label="Connected over SSH"
            checked={scenario.ssh}
            onChange={(ssh) => onChange({ ssh })}
          />
          <SwitchRow
            label="Running as root"
            checked={scenario.isRoot}
            onChange={(isRoot) => onChange({ isRoot })}
          />
          <SwitchRow
            label="Vim normal mode"
            checked={scenario.keymap !== "insert"}
            onChange={(normal) =>
              onChange({ keymap: normal ? "normal" : "insert" })
            }
          />
        </Section>

        <Section title="Directory" hint="path and the files in it">
          <Field label="Current directory">
            <input
              value={scenario.path}
              onChange={(e) => onChange({ path: e.target.value })}
              spellCheck={false}
              className={`${INPUT} font-mono`}
            />
          </Field>
          <Field label="Home directory">
            <input
              value={scenario.home}
              onChange={(e) => onChange({ home: e.target.value })}
              spellCheck={false}
              className={`${INPUT} font-mono`}
            />
          </Field>
          <Field label="Files here (comma separated — drives every detect_files rule)">
            <input
              value={scenario.files.join(", ")}
              onChange={(e) =>
                onChange({
                  files: e.target.value
                    .split(",")
                    .map((f) => f.trim())
                    .filter(Boolean),
                })
              }
              spellCheck={false}
              placeholder="package.json, Cargo.toml, .python-version"
              className={`${INPUT} font-mono`}
            />
          </Field>
          <SwitchRow
            label="Read-only directory"
            checked={scenario.readOnly}
            onChange={(readOnly) => onChange({ readOnly })}
          />
        </Section>

        <Section
          title="Git repository"
          hint={git ? (git.branch ?? "detached") : "not a repo"}
        >
          <p className="text-xs text-neutral-500">
            starship prints{" "}
            <code className="text-neutral-400">branch:upstream</code> when the
            two differ, so set both to see a single name.
          </p>
          <SwitchRow
            label="Inside a git repository"
            checked={Boolean(git)}
            onChange={toggleRepo}
          />
          {git ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Git branch">
                  <input
                    value={git.branch ?? ""}
                    onChange={(e) => setGit({ branch: e.target.value })}
                    className={`${INPUT} font-mono`}
                  />
                </Field>
                <Field label="Upstream branch">
                  <input
                    value={git.remoteBranch ?? ""}
                    placeholder="none"
                    onChange={(e) =>
                      setGit({ remoteBranch: e.target.value || undefined })
                    }
                    className={`${INPUT} font-mono`}
                  />
                </Field>
                <Field label="Git operation in progress">
                  <select
                    value={git.state ?? ""}
                    onChange={(e) =>
                      setGit({
                        state: (e.target.value || undefined) as GitState["state"],
                      })
                    }
                    className={INPUT}
                  >
                    <option value="">none</option>
                    <option value="REBASING">rebasing</option>
                    <option value="MERGING">merging</option>
                    <option value="CHERRY_PICKING">cherry-picking</option>
                    <option value="BISECTING">bisecting</option>
                    <option value="REVERTING">reverting</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["staged", "Staged"],
                    ["modified", "Modified"],
                    ["untracked", "Untracked"],
                    ["deleted", "Deleted"],
                    ["conflicted", "Conflicted"],
                    ["stashed", "Stashed"],
                    ["ahead", "Ahead"],
                    ["behind", "Behind"],
                    ["renamed", "Renamed"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number"
                      min={0}
                      value={git[key]}
                      onChange={(e) => setGit({ [key]: Number(e.target.value) })}
                      className={NUMBER}
                    />
                  </Field>
                ))}
              </div>
            </>
          ) : null}
        </Section>

        <Section title="Last command" hint={`exit ${scenario.status}`}>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Exit code">
              <input
                type="number"
                value={scenario.status}
                onChange={(e) => onChange({ status: Number(e.target.value) })}
                className={NUMBER}
              />
            </Field>
            <Field label="Duration (ms)">
              <input
                type="number"
                min={0}
                value={scenario.cmdDurationMs}
                onChange={(e) =>
                  onChange({ cmdDurationMs: Number(e.target.value) })
                }
                className={NUMBER}
              />
            </Field>
            <Field label="Background jobs">
              <input
                type="number"
                min={0}
                value={scenario.jobs}
                onChange={(e) => onChange({ jobs: Number(e.target.value) })}
                className={NUMBER}
              />
            </Field>
          </div>
        </Section>

        <Section title="System" hint={scenario.os?.name ?? "unset"}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Operating system">
              <select
                value={scenario.os?.type ?? "Unknown"}
                onChange={(e) =>
                  onChange({
                    os: { name: e.target.value, type: e.target.value as OsType },
                  })
                }
                className={INPUT}
              >
                {OS_TYPES.map((os) => (
                  <option key={os} value={os}>
                    {os}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Terminal width (columns)">
              <input
                type="number"
                min={20}
                value={scenario.terminalWidth}
                onChange={(e) =>
                  onChange({ terminalWidth: Number(e.target.value) })
                }
                className={NUMBER}
              />
            </Field>
          </div>
          <SwitchRow
            label="Report a battery"
            checked={Boolean(scenario.battery)}
            onChange={(on) =>
              onChange({
                battery: on
                  ? { percentage: 15, status: "discharging" }
                  : undefined,
              })
            }
          />
          {scenario.battery ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Charge (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={scenario.battery.percentage}
                  onChange={(e) =>
                    onChange({
                      battery: {
                        ...scenario.battery!,
                        percentage: Number(e.target.value),
                      },
                    })
                  }
                  className={NUMBER}
                />
              </Field>
              <Field label="State">
                <select
                  value={scenario.battery.status}
                  onChange={(e) =>
                    onChange({
                      battery: {
                        ...scenario.battery!,
                        status: e.target
                          .value as NonNullable<Scenario["battery"]>["status"],
                      },
                    })
                  }
                  className={INPUT}
                >
                  <option value="discharging">discharging</option>
                  <option value="charging">charging</option>
                  <option value="full">full</option>
                  <option value="unknown">unknown</option>
                </select>
              </Field>
            </div>
          ) : null}
        </Section>

        <Section
          title="Installed tools"
          hint={`${Object.keys(scenario.toolVersions).length} present`}
        >
          <p className="text-xs text-neutral-500">
            A language module only appears when its tool is installed and the
            directory has a matching file.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_TOOLS.map((tool) => {
              const present = tool.key in scenario.toolVersions;
              return (
                <button
                  key={tool.key}
                  type="button"
                  aria-pressed={present}
                  onClick={() => {
                    const next = { ...scenario.toolVersions };
                    if (present) delete next[tool.key];
                    else next[tool.key] = tool.version;
                    onChange({ toolVersions: next });
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    present
                      ? "border-accent-400 bg-accent-400/15 text-accent-200"
                      : "border-white/10 text-neutral-400 hover:border-white/25 hover:text-neutral-200"
                  }`}
                >
                  {tool.label}
                </button>
              );
            })}
          </div>
          <PairEditor
            entries={scenario.toolVersions}
            onChange={(toolVersions) => onChange({ toolVersions })}
            keyPlaceholder="module"
            valuePlaceholder="version"
            addLabel="+ Add a tool"
          />
        </Section>

        <Section
          title="Cloud & orchestration"
          hint="AWS, GCP, Azure, Kubernetes"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="AWS profile">
              <input
                value={scenario.aws?.profile ?? ""}
                placeholder="none"
                onChange={(e) =>
                  onChange({
                    aws: e.target.value
                      ? { ...scenario.aws, profile: e.target.value }
                      : undefined,
                  })
                }
                className={INPUT}
              />
            </Field>
            <Field label="AWS region">
              <input
                value={scenario.aws?.region ?? ""}
                placeholder="none"
                onChange={(e) =>
                  onChange({
                    aws: { ...scenario.aws, region: e.target.value },
                  })
                }
                className={INPUT}
              />
            </Field>
            <Field label="GCP project">
              <input
                value={scenario.gcloud?.project ?? ""}
                placeholder="none"
                onChange={(e) =>
                  onChange({
                    gcloud: e.target.value
                      ? { ...scenario.gcloud, project: e.target.value }
                      : undefined,
                  })
                }
                className={INPUT}
              />
            </Field>
            <Field label="Kubernetes context">
              <input
                value={scenario.kubernetes?.context ?? ""}
                placeholder="none"
                onChange={(e) =>
                  onChange({
                    kubernetes: e.target.value
                      ? { ...scenario.kubernetes, context: e.target.value }
                      : undefined,
                  })
                }
                className={INPUT}
              />
            </Field>
            <Field label="Kubernetes namespace">
              <input
                value={scenario.kubernetes?.namespace ?? ""}
                placeholder="none"
                onChange={(e) =>
                  onChange({
                    kubernetes: scenario.kubernetes
                      ? { ...scenario.kubernetes, namespace: e.target.value }
                      : undefined,
                  })
                }
                className={INPUT}
              />
            </Field>
            <Field label="Terraform workspace">
              <input
                value={scenario.terraform?.workspace ?? ""}
                placeholder="none"
                onChange={(e) =>
                  onChange({
                    terraform: e.target.value
                      ? { workspace: e.target.value }
                      : undefined,
                  })
                }
                className={INPUT}
              />
            </Field>
          </div>
          <SwitchRow
            label="Inside a Nix shell"
            checked={Boolean(scenario.nix)}
            onChange={(on) =>
              onChange({ nix: on ? { name: "shell", impure: true } : undefined })
            }
          />
          <SwitchRow
            label="Inside a container"
            checked={Boolean(scenario.container)}
            onChange={(on) =>
              onChange({ container: on ? { name: "podman" } : undefined })
            }
          />
        </Section>

        <Section
          title="Environment variables"
          hint={`${Object.keys(scenario.env).length} set`}
        >
          <p className="text-xs text-neutral-500">
            Read by the <code className="text-neutral-400">env_var</code> module
            and by anything using <code className="text-neutral-400">
              detect_env_vars
            </code>.
          </p>
          <PairEditor
            entries={scenario.env}
            onChange={(env) => onChange({ env })}
            keyPlaceholder="NAME"
            valuePlaceholder="value"
            addLabel="+ Add a variable"
          />
        </Section>
      </div>
    </details>
  );
}
