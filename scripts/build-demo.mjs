/**
 * The looping demo in the README.
 *
 * Records the real app doing the thing it is for — switching preset, toggling
 * a module, recolouring one — then hands the frames to ffmpeg. Recorded rather
 * than storyboarded so it stays honest, and regenerated with:
 *
 *   pnpm build && pnpm serve:export &
 *   pnpm build:demo
 *
 * Needs ffmpeg on PATH (`nix-shell -p ffmpeg`). The output is committed.
 */

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const PORT = process.env.PORT ?? 4321;
const URL = `http://127.0.0.1:${PORT}/`;
const OUT = "docs/images/demo.gif";

const work = await mkdtemp(join(tmpdir(), "spb-demo-"));
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1200, height: 720 },
  colorScheme: "dark",
  recordVideo: { dir: work, size: { width: 1200, height: 720 } },
});
const page = await context.newPage();

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("[aria-label='Simulated terminal prompt']");
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

/** Slow enough to read: a demo nobody can follow is a flicker. */
const beat = () => page.waitForTimeout(1100);

// Presets first — the fastest way to see that the preview is real.
for (const preset of ["gruvbox-rainbow", "tokyo-night", "pastel-powerline"]) {
  await page.getByLabel("Start from").selectOption(preset).catch(() => {});
  await beat();
}

// Then an edit, so it is clear this is an editor and not a gallery. Whichever
// module the chosen preset happens to start with — the presets do not agree on
// one, and the demo should not depend on which loaded last.
// "Enable <module>", not "Enable everything in <group>".
const firstModule = page
  .getByRole("switch", { name: /^Enable (?!everything)/ })
  .first();
await firstModule.click();
await beat();
await firstModule.click();
await beat();

// And the environment driving what appears.
const session = page
  .locator("[data-section='environment'] summary")
  .filter({ hasText: /^Session/ });
await session.click();
await page.locator("[data-section='environment']").getByLabel("Username").fill("ada");
await beat();

await context.close();
await browser.close();

const [video] = (await readdir(work)).filter((name) => name.endsWith(".webm"));
if (!video) throw new Error("playwright recorded no video");

await mkdir("docs/images", { recursive: true });
/*
 * Two passes: one to build a palette from the whole clip, one to apply it.
 * A GIF is 256 colours, and a terminal full of powerline gradients turns to
 * mud without this. 8fps at 880px keeps the file inside a megabyte or so —
 * a README image nobody waits for.
 */
const palette = join(work, "palette.png");
execFileSync("ffmpeg", [
  "-y", "-i", join(work, video),
  "-vf", "fps=8,scale=880:-1:flags=lanczos,palettegen=stats_mode=diff:max_colors=128",
  palette,
]);
execFileSync("ffmpeg", [
  "-y", "-i", join(work, video), "-i", palette,
  "-lavfi", "fps=8,scale=880:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4",
  "-loop", "0",
  join(work, "demo.gif"),
]);

await rename(join(work, "demo.gif"), OUT);
await rm(work, { recursive: true, force: true });
console.log(`wrote ${OUT}`);
