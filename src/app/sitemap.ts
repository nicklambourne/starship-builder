import type { MetadataRoute } from "next";

/**
 * Two pages: the builder and the licence notices.
 *
 * `lastModified` is deliberately absent rather than `new Date()`, which would
 * claim the site changed on every build and teach crawlers to ignore the
 * field.
 */
export const dynamic = "force-static";

const SITE = "https://starship.ndl.au";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/licences/`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
