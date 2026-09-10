import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://inredia.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/pricing", "/legal/imprint", "/legal/privacy", "/legal/terms"].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
