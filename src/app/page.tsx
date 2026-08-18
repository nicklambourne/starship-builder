import { buttonVariants, Chip } from "@heroui/react";

const REPO_URL = "https://github.com/nicklambourne/starship-builder";

function MockPrompt() {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
        <span className="size-3 rounded-full bg-red-500/80" />
        <span className="size-3 rounded-full bg-yellow-500/80" />
        <span className="size-3 rounded-full bg-green-500/80" />
        <span className="ml-2 font-mono text-xs text-neutral-500">
          zsh — simulated
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-sm leading-7">
        <span className="font-bold text-cyan-400">
          ~/personal/starship-builder
        </span>{" "}
        <span className="text-neutral-400">on</span>{" "}
        <span className="font-bold text-purple-400">main</span>{" "}
        <span className="font-bold text-red-400">[!+?]</span>{" "}
        <span className="text-neutral-400">via</span>{" "}
        <span className="font-bold text-green-400">v22.19.0</span>{" "}
        <span className="font-bold text-yellow-400">took 2s</span>
        {"\n"}
        <span className="font-bold text-green-400">❯</span>{" "}
        <span className="animate-pulse text-neutral-100">▊</span>
      </pre>
    </div>
  );
}

const MILESTONES: Array<[string, string, boolean]> = [
  ["M0", "Scaffold & deploy", true],
  ["M1", "Rendering engine + parity tests", false],
  ["M2", "Full schema-driven editor", false],
  ["M3", "Presets, palettes, share links", false],
  ["M4", "Every starship module", false],
  ["M5", "Polish & launch", false],
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col items-start gap-5">
        <Chip size="sm" variant="soft" color="accent">
          Work in progress — M0
        </Chip>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          🚀 Starship Builder
        </h1>
        <p className="max-w-xl text-lg text-neutral-400">
          A live, in-browser configurator for the{" "}
          <a
            className="text-neutral-200 underline underline-offset-4 hover:text-white"
            href="https://starship.rs"
          >
            Starship
          </a>{" "}
          cross-shell prompt. Toggle modules, tweak formats and styles, preview
          the result in a simulated terminal, and export the{" "}
          <code className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-sm">
            starship.toml
          </code>{" "}
          that reproduces it — entirely client-side.
        </p>
        <div className="flex flex-wrap gap-3">
          <a className={buttonVariants({ variant: "primary" })} href={REPO_URL}>
            GitHub
          </a>
          <a
            className={buttonVariants({ variant: "secondary" })}
            href={`${REPO_URL}/blob/main/PLAN.md`}
          >
            Read the plan
          </a>
        </div>
      </header>

      <MockPrompt />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          Roadmap
        </h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {MILESTONES.map(([id, label, done]) => (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3"
            >
              <span
                className={`font-mono text-sm font-bold ${done ? "text-green-400" : "text-neutral-500"}`}
              >
                {done ? "✓" : "○"} {id}
              </span>
              <span className="text-sm text-neutral-300">{label}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-auto border-t border-neutral-800 pt-6 text-sm text-neutral-500">
        MIT licensed. An unaffiliated community tool for{" "}
        <a
          className="underline underline-offset-4 hover:text-neutral-300"
          href="https://starship.rs"
        >
          starship.rs
        </a>
        .
      </footer>
    </main>
  );
}
