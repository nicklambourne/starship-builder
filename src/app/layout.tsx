import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starship Prompt Builder",
  description:
    "A live, in-browser configurator for the Starship cross-shell prompt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Runs before first paint so the interface never flashes dark at
          someone whose system is set to light. React only takes over the
          attribute when the toggle is used.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
