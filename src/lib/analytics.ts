/**
 * Google Analytics, on the deployed site only.
 *
 * Two things are deliberately narrow here. The measurement ID is read from the
 * environment at build time, so a fork or a preview build reports nowhere
 * unless it is given an ID of its own; and reporting is gated on the hostname,
 * so a local `serve:export`, a branch build and anyone running this from a
 * clone stay out of the property.
 *
 * The ID is not a secret — every page that reports to GA carries it in plain
 * sight — but the host gate is what keeps the numbers meaning something.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** The GA4 measurement ID this build reports to, or null for "do not report". */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? null;

/** The only host whose visits are real. */
export const ANALYTICS_HOST = "starship.ndl.au";

/**
 * Whether this page should report. Called in the browser; the host check is
 * why a developer's own reloads never reach the property.
 */
export function shouldReport(hostname: string): boolean {
  return Boolean(GA_MEASUREMENT_ID) && hostname === ANALYTICS_HOST;
}

/**
 * The inline stub: defines `gtag`, queues the config, and sends nothing until
 * the library arrives.
 *
 * `gtag.js` is ~160 KB, which is a sixth of what this whole site costs to open
 * and most of a second of main thread. It is loaded after the page is
 * interactive (see `Analytics`), and this stub means the config queued here is
 * replayed when it lands rather than lost.
 */
export function analyticsStub(measurementId: string, host: string): string {
  return `
if (location.hostname === ${JSON.stringify(host)}) {
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(measurementId)}, {
    cookie_flags: 'SameSite=None;Secure'
  });
}`.trim();
}
