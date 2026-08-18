import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starship Builder",
  description:
    "A live, in-browser configurator for the Starship cross-shell prompt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
