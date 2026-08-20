"use client";

/**
 * The Starship Prompt Builder mark: a rocket punching out of a ring, trailing exhaust.
 *
 * Neon is built from stacked strokes of the same geometry rather than a CSS
 * glow: a wide blurred pass for the bloom, a saturated pass for the tube, then
 * two blurred inner passes for the hot centre. That is how a real neon tube
 * reads, and unlike a drop shadow it stays correct at any size and on either
 * theme background.
 *
 * The five stops come from CSS variables so the mark follows the app theme
 * without any component having to know which theme is active; the light ramp
 * is a darker set that clears 3:1 on white (see globals.css).
 *
 * The ring is deliberately broken at the upper right — the rocket crosses it
 * there — and the exhaust branches out of the ring at the lower left, so the
 * circle and the line art are one continuous piece of tubing rather than a
 * badge with a picture inside it.
 */

import { useId } from "react";

interface LogoProps {
  size?: number;
  /** Accessible name; omit for a purely decorative mark. */
  title?: string;
  className?: string;
}

/** The geometry, shared by all three neon passes. */
function Art() {
  return (
    <>
      {/*
        Ring, near-complete, gap at the upper right. The ends are set from the
        rocket rather than round numbers: its upper flank crosses the circle at
        296.1° and its lower flank at 322.5°, and the exhaust crosses at 150°.

        The arcs are not simply "crossing angle ± a constant": the ends are
        measured to the INK, not the path. A 4-unit tube is ±5.2° wide at
        r=22, so the exhaust — a bare centreline — needs that width added on
        both sides, where the rocket silhouette already carries its own. Using
        one constant for both would leave the exhaust's gaps visibly tighter.

        The exhaust's two gaps clear 11° of visible space rather than the
        rocket's 6.8°: the exhaust is a thin line where the rocket is a solid
        silhouette, and matching the numbers made the ring look welded to it.
      */}
      <path d="M 51.86 22.53 A 22 22 0 0 1 16.78 47.88 M 10.63 37.24 A 22 22 0 0 1 37.36 10.66" />
      {/*
        A single exhaust line. It starts outside the ring and pierces it, so
        the plume reads as trailing away from the mark rather than being
        contained by it. The tail extends along the curve's own tangent —
        pulling it the other way folds it into a hook.

        The tail used to start at x=0.6, which put the far end of a 6.8-unit
        bloom stroke outside the viewBox: the glow was sliced off square, and
        at any size above about 40px you could see the cut. The curve is
        trimmed (split at t=0.25, so the shape is unchanged, just shorter) and
        the viewBox carries bleed on every side for the glow to fall off into.
      */}
      <path d="M 2.42 38.77 C 4.26 39.93, 6.54 41.12, 12.95 43 C 21.5 45.5, 27 39.5, 31 34 C 33.5 30.5, 36 26.5, 38.6 22.6" />
      {/*
        Rocket, drawn upright then rotated onto its flight path. Body and fins
        are one closed silhouette rather than a body with two fins laid over
        it — separate shapes leave a seam where they meet, which at these
        stroke weights reads as a line drawn across the rocket.
      */}
      <g transform="translate(44 17) rotate(45)">
        <path d="M 0 -11 C 3.4 -6.8, 4.9 -2.4, 5 2 L 9.2 9.6 L 4.5 7 L -4.5 7 L -9.2 9.6 L -5 2 C -4.9 -2.4, -3.4 -6.8, 0 -11 Z" />
      </g>
    </>
  );
}

export function Logo({ size = 28, title, className }: LogoProps) {
  // Ids must be unique per instance or a second logo on the page would
  // reference the first one's filter.
  const uid = useId().replace(/:/g, "");
  const bloom = `logo-bloom-${uid}`;
  const inner = `logo-inner-${uid}`;
  const core = `logo-core-${uid}`;
  const tube = `logo-tube-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      /*
        The art occupies 0–64; the box runs -6..64 by -3..67 so a blurred
        6.8-unit stroke at the edge of the drawing has somewhere to fade out.
        Still square, so the mark keeps its proportions — it simply sits a
        little smaller inside the same box.
      */
      viewBox="-6 -3 70 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <defs>
        <linearGradient id={tube} x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--logo-tube-a)" />
          <stop offset="1" stopColor="var(--logo-tube-b)" />
        </linearGradient>
        <filter id={bloom} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id={inner} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
        <filter id={core} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>

      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/*
          A neon tube is brightest along its centre and falls off towards the
          glass, so the inner passes are blurred rather than drawn as hard
          strokes. Stacking sharp widths left a visible step where the pale
          core met the orange; blurring the two inner ones turns that step
          into a gradient without needing a dozen layers to fake it.
        */}
        <g
          stroke="var(--logo-bloom)"
          strokeWidth="6.8"
          opacity="var(--logo-bloom-opacity)"
          filter={`url(#${bloom})`}
        >
          <Art />
        </g>
        <g stroke={`url(#${tube})`} strokeWidth="4">
          <Art />
        </g>
        <g stroke="var(--logo-inner)" strokeWidth="2.4" opacity="0.85" filter={`url(#${inner})`}>
          <Art />
        </g>
        <g stroke="var(--logo-core)" strokeWidth="1.4" opacity="0.95" filter={`url(#${core})`}>
          <Art />
        </g>
      </g>
    </svg>
  );
}
