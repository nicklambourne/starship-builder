"use client";

/**
 * The Starship Builder mark: a rocket punching out of a ring, trailing exhaust.
 *
 * Neon is built from stacked strokes of the same geometry rather than a CSS
 * glow: a wide blurred pass for the bloom, a saturated pass for the tube, and
 * a pale hot core. That is how a real neon tube reads, and unlike a drop
 * shadow it stays correct at any size and on either theme background.
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
        296.1° and its lower flank at 322.5°, so the ring stops 8° clear of the
        first and resumes 12° after the second. The upper gap is the wider of
        the two on purpose: the nose crosses the ring at a shallower angle
        there, so an equal arc would look tighter than it is.
      */}
      <path d="M 51.86 22.53 A 22 22 0 1 1 38.83 11.09" />
      {/*
        A single exhaust line, branching off the ring at the lower left. Extra
        trailing strokes crowd the inside of the ring and turn to noise once
        the mark is scaled to the header.
      */}
      <path d="M 12.95 43 C 21.5 45.5, 27 39.5, 31 34 C 33.5 30.5, 36 26.5, 38.6 22.6" />
      {/* Rocket, drawn upright then rotated onto its flight path. */}
      <g transform="translate(44 17) rotate(45)">
        <path d="M 0 -11 C 4.5 -5.5, 5.5 1.5, 4.5 7 L -4.5 7 C -5.5 1.5, -4.5 -5.5, 0 -11 Z" />
        <path d="M -4.6 2 L -9 9.5 L -4.6 7" />
        <path d="M 4.6 2 L 9 9.5 L 4.6 7" />
        <circle cx="0" cy="-3" r="2.3" />
      </g>
    </>
  );
}

export function Logo({ size = 28, title, className }: LogoProps) {
  // Ids must be unique per instance or a second logo on the page would
  // reference the first one's filter.
  const uid = useId().replace(/:/g, "");
  const glow = `logo-glow-${uid}`;
  const tube = `logo-tube-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <defs>
        <linearGradient id={tube} x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff5f1f" />
          <stop offset="1" stopColor="#ffa13c" />
        </linearGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <g stroke="#ff5f1f" strokeWidth="4.6" opacity="0.55" filter={`url(#${glow})`}>
          <Art />
        </g>
        <g stroke={`url(#${tube})`} strokeWidth="2.6">
          <Art />
        </g>
        <g stroke="#ffd9a8" strokeWidth="0.9">
          <Art />
        </g>
      </g>
    </svg>
  );
}
