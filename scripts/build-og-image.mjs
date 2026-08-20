/**
 * The picture a link to this site unfurls into.
 *
 * Drawn from the built site rather than mocked up: it screenshots the real
 * preview pane on top of the real editor, so the card cannot end up showing a
 * prompt the app no longer produces. Run it against a local `serve:export`:
 *
 *   pnpm build && pnpm serve:export &
 *   pnpm build:og
 *
 * The output is committed, like the font subsets — a normal build does not
 * need a browser.
 */

import { mkdir, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const PORT = process.env.PORT ?? 4321;
const URL = `http://127.0.0.1:${PORT}/`;
const OUT = "public/og.png";

const browser = await chromium.launch();
const page = await browser.newPage({
  // The card is 1200×630; rendering at twice that keeps the glyphs crisp when
  // a client scales it down.
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("[aria-label='Simulated terminal prompt']");
// The icon subset arrives on its own; without this the prompt can be captured
// mid-swap, with boxes where the glyphs go.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);

/*
 * Composed in the page rather than cropped afterwards: a screenshot of the
 * app at this aspect ratio is mostly module list, and what makes the tool
 * legible at a glance is the prompt with the title beside it.
 */
await page.evaluate(() => {
  // The framed terminal, title bar and all — two levels above the prompt.
  const terminal = document
    .querySelector("[aria-label='Simulated terminal prompt']")
    ?.closest(".overflow-hidden");
  const logo = document.querySelector("header svg");
  const card = document.createElement("div");
  card.id = "og-card";
  card.style.cssText = [
    "position:fixed", "inset:0", "z-index:9999",
    "display:flex", "flex-direction:column", "justify-content:center", "gap:34px",
    "padding:64px 72px",
    "background:radial-gradient(120% 120% at 15% 0%, #1a1210 0%, #0a0a0a 55%)",
  ].join(";");

  const heading = document.createElement("div");
  heading.style.cssText = "display:flex;align-items:center;gap:18px";
  if (logo) {
    const mark = logo.cloneNode(true);
    mark.setAttribute("width", "76");
    mark.setAttribute("height", "76");
    mark.style.cssText = "width:76px;height:76px";
    heading.append(mark);
  }
  const words = document.createElement("div");
  words.innerHTML =
    '<div style="font:700 52px ui-sans-serif,system-ui,sans-serif;color:#fafafa;letter-spacing:-0.5px">Starship Prompt Builder</div>' +
    '<div style="margin-top:8px;font:400 26px ui-sans-serif,system-ui,sans-serif;color:#a3a3a3">Build your starship.toml against a live prompt</div>';
  heading.append(words);
  card.append(heading);

  if (terminal) {
    const shot = terminal.cloneNode(true);
    shot.style.cssText =
      "width:100%;box-shadow:0 30px 80px rgba(0,0,0,.55);border-radius:12px;font-size:19px";
    const frame = document.createElement("div");
    frame.style.cssText = "padding:4px 0";
    frame.append(shot);
    card.append(frame);
  }

  const footer = document.createElement("div");
  footer.style.cssText =
    "font:400 22px ui-monospace,monospace;color:#ff7a1a;letter-spacing:0.3px";
  footer.textContent = "starship.ndl.au";
  card.append(footer);

  document.body.append(card);
});

await page.waitForTimeout(400);
await mkdir("public", { recursive: true });
await writeFile(OUT, await page.screenshot({ type: "png" }));
await browser.close();

console.log(`wrote ${OUT}`);
