import type { MetadataRoute } from "next";
import { query } from "@/lib/db/client";
import { LESSONS } from "@/lib/academy/content";
import { TAX_COUNTRIES } from "@/lib/tax/content";
import { THEMES } from "@/lib/etfs/themes";

export const dynamic = "force-dynamic";
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Every public page: fixed pages, each index, each lesson, and every ETF. Funds with more data come first. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [etfs, indices] = await Promise.all([
    query<{ etf_key: string; rich: boolean }>("select etf_key, (headline_fee_pct is not null) as rich from public.etf_directory order by size_eur desc nulls last limit 45000"),
    query<{ slug: string }>("select slug from public.indices"),
  ]);
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly"): MetadataRoute.Sitemap[number] => ({
    url: `${site}${path}`, priority, changeFrequency,
    // The same page in French lives under /fr.
    alternates: { languages: { en: `${site}${path}`, fr: `${site}/fr${path === "/" ? "" : path}` } },
  });
  return [
    page("/", 1, "daily"), page("/screener", 0.9, "daily"), page("/indices", 0.8, "weekly"), page("/holdings", 0.7, "weekly"), page("/tax", 0.8, "monthly"),
    page("/academy", 0.7, "monthly"), page("/academy/glossary", 0.5, "monthly"), page("/academy/calculators", 0.5, "monthly"), page("/pricing", 0.4, "monthly"), page("/data", 0.5, "weekly"), page("/assistant", 0.6, "monthly"),
    ...TAX_COUNTRIES.map((c) => page(`/tax/${c.slug}`, 0.8, "monthly")),
    ...LESSONS.map((l) => page(`/academy/${l.slug}`, 0.6, "monthly")),
    ...indices.map((i) => page(`/indices/${i.slug}`, 0.8, "weekly")),
    page("/themes", 0.9, "weekly"), page("/legal/terms", 0.2, "monthly"), page("/legal/privacy", 0.2, "monthly"), page("/legal/notice", 0.2, "monthly"),
    ...THEMES.map((x) => page(`/themes/${x.slug}`, 0.8, "weekly")),
    ...etfs.map((e) => page(`/etfs/${encodeURIComponent(e.etf_key)}`, e.rich ? 0.6 : 0.3, "weekly")),
  ];
}
