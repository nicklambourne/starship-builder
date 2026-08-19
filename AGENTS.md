# Agent guide — Starship Prompt Builder

Conventions for agents (and humans) working in this repository. Read
[PLAN.md](PLAN.md) for what the project is and where it is going.

## Repository shape

Fully static Next.js app, exported to GitHub Pages under the `/starship-prompt-builder`
base path. Everything runs client-side; there is no backend.

- `src/lib/engine/` — the rendering engine. **Pure TypeScript, no React
  imports.** This is the part that must stay faithful to real starship.
- `src/lib/engine/modules/` — one file per starship module.
- `src/lib/scenarios/` — mocked shell contexts used by the preview and reused
  as parity fixtures.
- `src/lib/config/` — TOML import/export, defaults, presets, share links.
- `src/components/` — UI. Never put rendering logic here.
- `data/` — vendored starship artefacts (config schema, presets). Synced from
  upstream, never hand-edited.

## Build and test

```sh
pnpm install
pnpm dev          # local dev server
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest unit tests
pnpm build        # static export to out/
```

Use the narrowest relevant check while iterating, then run every applicable
check before handing work back. `pnpm build` runs the TypeScript check too, so
a green `pnpm build` is the minimum bar before opening a PR.

### Verification standards

- Check **real exit codes**. `cmd | tail` reports the exit status of `tail`, not
  of `cmd`. Capture `$?` directly, or redirect to a file and inspect.
- A green unit suite is not proof the UI works. Anything user-visible must be
  looked at in a browser at both ~390 px and desktop widths before it is called
  done. Assert `window.innerWidth` — the preview pane can wedge to 0×0 and fake
  a mobile render.
- A test that passes without the fix applied is not a test. Confirm new tests
  fail against the unfixed code.

### Engine fidelity

The engine is a re-implementation of starship's Rust formatter, so it drifts
silently unless pinned. When changing anything under `src/lib/engine/`:

- Read the corresponding Rust source rather than inferring behaviour. Module
  defaults live in starship's `src/configs/<module>.rs`; the formatter lives in
  `src/formatter/`.
- Module defaults must match starship **byte for byte**, including Nerd Font
  glyphs and trailing spaces in format strings.
- Add a parity case (`tests/parity/`) for anything the harness does not already
  cover.

## Worktree isolation

The primary checkout is a **read-only coordination checkout**. Do not edit
files, build, test, commit, push, or run PR commands there. Use it only to
inspect repository and worktree state, fetch refs, and create or remove this
agent's own worktrees.

A **new task** is an independent change intended for its own PR. It is not each
step, subtask, or phase within one implementation plan. Every new task gets
exactly one dedicated branch and worktree; all steps for that task stay in that
pair.

Use this convention:

- Worktree root: `/private/tmp/starship-prompt-builder-worktrees/`
- Worktree path: `/private/tmp/starship-prompt-builder-worktrees/<task-slug>`
- Branch: `agent/<task-slug>`
- `<task-slug>`: short, lowercase, kebab-case, descriptive of the PR

Before making changes:

1. From the primary coordination checkout, inspect `git status` and
   `git worktree list`. Preserve every existing worktree and branch.
2. Fetch the current base: `git fetch --prune origin main`.
3. Create the task from the fetched base — always from `origin/main`, never
   from a possibly-stale local `main`:

   ```sh
   git worktree add -b agent/<task-slug> \
     /private/tmp/starship-prompt-builder-worktrees/<task-slug> origin/main
   ```

4. Report the worktree's absolute path and branch name before editing, and
   again in the final handoff.

All edits, builds, tests, commits, pushes, and `gh` PR commands run from the
task worktree. Do not base a new task on an unmerged branch unless a stacked
change was explicitly requested.

Treat every pre-existing worktree as owned by another session. Never reuse,
reset, clean, stash, delete, or prune it. Continue in an existing worktree only
when explicitly asked to continue that same PR, and first verify its branch is
still that PR's head. If a slug or branch name is already taken, pick a new one.

`node_modules` is not shared between worktrees — run `pnpm install` inside each
new worktree before building.

After GitHub confirms the PR is **merged**, remove only this agent's own
worktree, and only when `git status --short` in it is empty:

```sh
git worktree remove /private/tmp/starship-prompt-builder-worktrees/<task-slug>
git branch -D agent/<task-slug>
```

Squash-merged branches are not ancestors of `main`, so confirm the PR's `MERGED`
state via `gh pr view` rather than relying on `git branch --merged`. Deleting a
branch that an open PR points at (head **or** base) closes that PR — only delete
after the merge is confirmed. If a worktree is dirty, its ownership is
uncertain, or removal fails, preserve it and report its path and condition
instead of forcing cleanup. Never run broad automatic worktree or branch
cleanup.

## Pull requests

One PR per change, branched from fresh `origin/main`. Verify
`git log origin/main..HEAD` before pushing. Default to:

```bash
gh pr merge --auto --squash --delete-branch
```

Check the PR is still `OPEN` before pushing follow-up commits — pushing after
auto-merge has fired strands commits on a deleted branch.

Commits are authored as `Nicholas Lambourne <dev@ndl.au>`; agents are never
listed as author, committer, or co-author.

## CI

See [.github/workflows/](.github/workflows/). **Every job runs on
GitHub-hosted runners, and must keep doing so while this repository is
public.** A fork's pull request is attacker-authored code; the `ubox`
self-hosted cluster sits on a home LAN. Do not add `runs-on` expressions that
select a self-hosted runner, even guarded ones — the reasoning, including why
the fork-PR guard was rejected rather than kept, is in
[docs/ci-runners.md](docs/ci-runners.md).

Toolchains come from `actions/setup-node`; pnpm is resolved through corepack
from the `packageManager` field.
