/**
 * Why an enabled module still renders nothing.
 *
 * Several modules are on by default yet stay invisible until the environment
 * says otherwise — `username` only appears as root or over SSH, `hostname`
 * only over SSH, most language modules only when their tool and a matching
 * file are both present. That is faithful to starship, but a switch reading
 * "on" beside an empty prompt looks like a bug, so the interface says which
 * condition has not been met.
 *
 * The generic fallback is deliberately vague rather than wrong: it points at
 * the environment panel instead of guessing at a reason.
 */

import type { Scenario } from "@/lib/scenarios/types";

const GENERIC =
  "Nothing to show in the simulated environment — adjust it below the preview.";

export function inactiveReason(
  moduleName: string,
  scenario: Scenario,
  options: Record<string, unknown>,
): string {
  switch (moduleName) {
    case "username":
      // starship: shown when root, over SSH, or with show_always.
      if (!scenario.isRoot && !scenario.ssh) {
        return "starship only shows your username when you are root or connected over SSH. Turn on “Connected over SSH” or “Running as root” in the simulated environment, or set show_always below.";
      }
      return GENERIC;

    case "hostname":
      if (!scenario.ssh && options.ssh_only !== false) {
        return "starship only shows the hostname over SSH. Turn on “Connected over SSH” in the simulated environment, or set ssh_only to false below.";
      }
      return GENERIC;

    case "battery":
      if (!scenario.battery) {
        return "No battery in the simulated environment — turn one on under System.";
      }
      return "The charge is above every display threshold, so starship hides it.";

    case "git_branch":
    case "git_commit":
    case "git_state":
    case "git_status":
    case "git_metrics":
      if (!scenario.git) {
        return "Not inside a git repository — turn one on under Git repository.";
      }
      return GENERIC;

    case "cmd_duration":
      return "The last command was faster than min_time, so starship hides it.";

    case "jobs":
      return "No background jobs in the simulated environment.";

    case "status":
      if (scenario.status === 0) {
        return "The last command succeeded; status only shows a failure.";
      }
      return GENERIC;

    default:
      return GENERIC;
  }
}
