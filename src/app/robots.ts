import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Search engines may read every public page. Personal pages and the API are left out. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/profile", "/login", "/auth/", "/watchlists", "/portfolio", "/compare?", "/screener?"] }], sitemap: `${site}/sitemap.xml` };
}
