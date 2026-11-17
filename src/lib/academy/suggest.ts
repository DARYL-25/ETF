import type { PortfolioInsight } from "@/lib/etfs/portfolio";

/** Lessons that match what a portfolio actually holds, each with the reason it was picked. */
export function suggestLessons(p: Pick<PortfolioInsight, "funds" | "overlaps" | "xray" | "fee_pct" | "allocation">, lens: string | null = null): { slug: string; reason: string }[] {
  const out: { slug: string; reason: string }[] = [];
  const add = (slug: string, reason: string) => { if (!out.some((x) => x.slug === slug)) out.push({ slug, reason }); };
  if (p.overlaps.length || p.xray.top10_pct >= 25) add("diversification-and-risk", "Some of your funds overlap or concentrate on a few companies.");
  if (p.fee_pct !== null && p.fee_pct > 0.25) add("fees-ter-ocf", "Your blended fee is above typical index funds.");
  if (p.funds.some((f) => f.index_slug)) add("tracking-difference", "Funds on the same index can still earn different returns.");
  if (p.xray.currencies.some((c) => c.label !== "EUR" && c.weight_pct > 30)) add("currency-and-hedging", "Much of what you own is priced in other currencies.");
  if (p.funds.some((f) => f.replication === "synthetic_swap")) add("replication", "You hold a fund that uses a swap.");
  if (p.funds.some((f) => f.distribution_policy === "distributing")) add("accumulating-distributing", "You hold a fund that pays out its income.");
  if (p.allocation.some((a) => a.label === "fixed_income" || a.label === "bond")) add("bond-etfs", "You hold bond funds.");
  if (lens === "FR" || lens === "CH") add("etf-tax-layers", "Tax rules for your country of residence apply at several levels.");
  if (p.funds.length <= 2) add("what-is-an-index", "Knowing what your index holds tells you what your fund holds.");
  return out.slice(0, 4);
}
