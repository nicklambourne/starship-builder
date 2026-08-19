"use client";

/**
 * The last resort: a throw in the root layout, where `error.tsx` never gets a
 * chance to mount. It has to supply its own document, and it cannot assume the
 * stylesheet loaded — that may be what failed — so the styling is inline.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0a0a0a",
          color: "#e5e5e5",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: "34rem", padding: "1.5rem" }}>
          <h1 style={{ fontSize: "1.125rem", margin: "0 0 0.75rem" }}>
            Starship Prompt Builder failed to start
          </h1>
          <p style={{ margin: "0 0 1rem", lineHeight: 1.6, color: "#a3a3a3" }}>
            The page could not be rendered at all. Reloading usually fixes it; if
            you arrived from a shared link, the config in that link may be the
            cause — try the address without everything after the <code>#</code>.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.25rem",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "#e5e5e5",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#737373" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
