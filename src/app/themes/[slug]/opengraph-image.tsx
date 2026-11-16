import { OG_SIZE, ogCard } from "@/lib/og/card";
import { getThemeCounts } from "@/lib/etfs/queries";
import { themeBySlug } from "@/lib/etfs/themes";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ETFs on a theme";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const theme = themeBySlug((await params).slug);
  if (!theme) return ogCard({ title: "ETF Intelligence" });
  const count = (await getThemeCounts()).get(theme.slug);
  const facts: [string, string][] = count ? [["ETFs to compare", count.n.toLocaleString("en-GB")], ...(count.min_fee !== null ? [["Yearly fee from", `${Number(count.min_fee).toFixed(2)}%`] as [string, string]] : [])] : [];
  return ogCard({ eyebrow: "Theme", title: `${theme.label} ETFs`, line: theme.blurb, facts });
}
