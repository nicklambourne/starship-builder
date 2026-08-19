"use client";

/**
 * The switch used everywhere a boolean is set.
 *
 * A switch rather than a checkbox because every boolean in this app takes
 * effect immediately — nothing is staged and submitted — and a switch is the
 * control that reads as "on now" rather than "will be applied later".
 */

interface ToggleProps {
  checked: boolean;
  onChange(next: boolean): void;
  /** Accessible name. Required — these rarely sit next to a visible <label>. */
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  size = "md",
  disabled = false,
}: ToggleProps) {
  const track = size === "sm" ? "h-4 w-7" : "h-5 w-9";
  const knob = size === "sm" ? "size-3" : "size-4";
  const travel = size === "sm" ? "left-3.5" : "left-4.5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors ${track} ${
        checked ? "bg-accent-500" : "bg-neutral-700"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400`}
    >
      <span
        className={`toggle-knob absolute top-0.5 rounded-full transition-all ${knob} ${
          checked ? travel : "left-0.5"
        }`}
      />
    </button>
  );
}
