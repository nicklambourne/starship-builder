"use client";

/**
 * Loads gtag.js once the page has stopped being busy.
 *
 * The library is ~160 KB and takes a chunk of main thread to parse — on a site
 * whose whole first load was just cut to about a megabyte, letting it compete
 * with the prompt rendering would give back a good part of that. So it waits
 * for `load` plus an idle moment, or for the first real interaction, whichever
 * comes first. The inline stub in the document head has already queued the
 * config, and gtag replays the queue when it arrives.
 */

import { useEffect } from "react";

import { GA_MEASUREMENT_ID, shouldReport } from "@/lib/analytics";

const SCRIPT_ID = "ga-gtag";

export function Analytics() {
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !shouldReport(window.location.hostname)) return;

    let cancelled = false;

    const load = () => {
      if (cancelled || document.getElementById(SCRIPT_ID)) return;
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.append(script);
      detach();
    };

    // A visitor who does something is a visitor worth measuring promptly; the
    // idle path covers everyone who lands and reads.
    const interactions = ["pointerdown", "keydown", "touchstart"] as const;
    const detach = () => {
      for (const event of interactions) window.removeEventListener(event, load);
    };
    for (const event of interactions) {
      window.addEventListener(event, load, { once: true, passive: true });
    }

    // `requestIdleCallback` is still missing on Safari; the timeout is the
    // same idea with worse timing.
    const hasIdleCallback = typeof window.requestIdleCallback === "function";
    const idle = hasIdleCallback
      ? window.requestIdleCallback(load, { timeout: 4000 })
      : window.setTimeout(load, 2500);

    return () => {
      cancelled = true;
      detach();
      if (hasIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  return null;
}
