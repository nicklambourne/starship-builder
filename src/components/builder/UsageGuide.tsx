"use client";

/**
 * What to do with the file once it has been downloaded.
 *
 * The builder ends at a download, which is the halfway point: the config does
 * nothing until it is in the right place and the shell is initialising
 * starship. Both steps are short, easy to get subtly wrong, and documented
 * somewhere other than here.
 *
 * It lives inside the starship.toml card, next to the file it is talking
 * about. The shell whose line is highlighted follows the simulated
 * environment, so the instructions match the prompt being previewed rather
 * than making the reader pick twice.
 */

import { useState } from "react";

import { CheckIcon } from "@/components/ui/icons";
import type { Scenario } from "@/lib/scenarios/types";

interface UsageGuideProps {
  shell: Scenario["shell"];
  className?: string;
}

const INIT_LINES: {
  shell: Scenario["shell"];
  label: string;
  file: string;
  line: string;
}[] = [
  { shell: "bash", label: "Bash", file: "~/.bashrc", line: 'eval "$(starship init bash)"' },
  { shell: "zsh", label: "Zsh", file: "~/.zshrc", line: 'eval "$(starship init zsh)"' },
  {
    shell: "fish",
    label: "Fish",
    file: "~/.config/fish/config.fish",
    line: "starship init fish | source",
  },
  {
    shell: "pwsh",
    label: "PowerShell",
    file: "$PROFILE",
    line: "Invoke-Expression (&starship init powershell)",
  },
  {
    shell: "nu",
    label: "Nushell",
    file: "your env file",
    line: "mkdir ~/.cache/starship; starship init nu | save -f ~/.cache/starship/init.nu",
  },
];

function Command({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <span className="flex items-stretch gap-1.5">
      {/*
        A long command scrolls sideways on a phone, and a region that scrolls
        has to be focusable or the overflow is reachable by mouse only.
      */}
      <code
        tabIndex={0}
        role="region"
        aria-label="Command"
        className="min-w-0 flex-1 overflow-x-auto rounded border border-white/10 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400"
      >
        {children}
      </code>
      <button
        type="button"
        // Naming the whole command here made the button's accessible name a
        // paragraph, and collided with the toml editor's own label.
        aria-label="Copy command"
        onClick={async () => {
          await navigator.clipboard.writeText(children);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded border border-white/10 px-2 text-xs text-neutral-300 transition hover:border-accent-400 hover:text-accent-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400"
      >
        {copied ? <CheckIcon /> : "Copy"}
      </button>
    </span>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2">
      <span className="text-sm font-medium text-neutral-200">
        <span className="mr-2 text-accent-200">{n}.</span>
        {title}
      </span>
      <div className="flex flex-col gap-2 pl-6 text-sm text-neutral-400">{children}</div>
    </li>
  );
}

export function UsageGuide({ shell, className }: UsageGuideProps) {
  const current = INIT_LINES.find((entry) => entry.shell === shell);

  return (
    <section data-section="usage" className={className}>
      <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-neutral-100">
          Using your config
        </span>
        <span className="text-xs text-neutral-500">
          where the file goes and how to switch starship on
        </span>
      </h3>

      <ol className="mt-4 flex flex-col gap-5">
        <Step n={1} title="Install starship, if you have not already">
          <Command>curl -sS https://starship.rs/install.sh | sh</Command>
          <p>
            Package managers work too — <code>brew install starship</code>,{" "}
            <code>winget install starship</code>,{" "}
            <code>pacman -S starship</code>, and others are listed in the{" "}
            <a
              href="https://starship.rs/guide/#🚀-installation"
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent-300 underline underline-offset-2"
            >
              installation guide
            </a>
            .
          </p>
        </Step>

        <Step n={2} title="Put the file where starship looks for it">
          <Command>mkdir -p ~/.config && mv ~/Downloads/starship.toml ~/.config/starship.toml</Command>
          <p>
            To keep it somewhere else, point{" "}
            <code className="text-neutral-300">STARSHIP_CONFIG</code> at it
            instead — useful if your dotfiles are a repo.
          </p>
        </Step>

        <Step n={3} title="Have your shell start starship">
          {current ? (
            <>
              <p>
                Add this to{" "}
                <code className="text-neutral-300">{current.file}</code> — your
                shell is set to {current.label} in the simulated environment
                above.
              </p>
              <Command>{current.line}</Command>
            </>
          ) : (
            <p>
              Your shell is set to <code className="text-neutral-300">{shell}</code>{" "}
              in the simulated environment; see the list below.
            </p>
          )}

          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
              Other shells
            </summary>
            <ul className="mt-2 flex flex-col gap-2">
              {INIT_LINES.filter((entry) => entry.shell !== shell).map((entry) => (
                <li key={entry.shell} className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-500">
                    {entry.label} — <code>{entry.file}</code>
                  </span>
                  <Command>{entry.line}</Command>
                </li>
              ))}
            </ul>
          </details>
        </Step>

        <Step n={4} title="Open a new shell">
          <Command>exec $SHELL</Command>
          <p>
            If the prompt shows boxes where symbols should be, the terminal is
            not using a patched font. Pick one of the fonts offered in the
            preview above, install it from{" "}
            <a
              href="https://www.nerdfonts.com/font-downloads"
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent-300 underline underline-offset-2"
            >
              Nerd Fonts
            </a>
            , and set it as your terminal&rsquo;s font.
          </p>
        </Step>
      </ol>
    </section>
  );
}
