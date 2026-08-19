import type { MetadataRoute } from "next";

/**
 * Emitted as a static robots.txt by the export.
 *
 * Everything here is public and there is only one page, so the file exists
 * mainly to point at the sitemap — GitHub Pages serves no robots.txt of its
 * own for a project site.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://nicklambourne.github.io/starship-prompt-builder/sitemap.xml",
  };
}
