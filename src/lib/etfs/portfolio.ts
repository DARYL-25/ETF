import { query } from "@/lib/db/client";
import { getEtfs } from "./queries";
import { getOverlaps, lookThrough, type LookThrough, type Slice } from "./holdings";
import { readXRay, type XRay } from "./xray";
import type { EtfRow } from "./queries";

export type PositionInput = { key: string; quantity: number };
export type PortfolioInsight = {
  total_eur: number;
  /** Each ETF's share of the valued portfolio, in percent, largest first. */
  weights: { key: string; name: string; weight_pct: number; fee_pct: number | null }[];
  /** Positions left out because no NAV or exchange rate is on file. */
  unvalued: string[];
  /** Fee of the whole portfolio, weighted by value, over the part whose fee is known. */
  fee_pct: number | null;
  fee_known_pct: number;
  yearly_cost_eur: number | null;
  look: LookThrough;
  overlaps: { a: string; b: string; overlap_pct: number }[];
  /** Concentration, United States and technology shares, currencies, and sentences built from them. */
  xray: XRay;
  /** Asset classes by value. */
  allocation: Slice[];
  /** The facts about each valued fund that the portfolio review reads. */
  funds: FundFacts[];
};

export type FundFacts = Pick<EtfRow, "name" | "isin" | "headline_fee_pct" | "size_eur" | "distribution_policy" | "distribution_frequency" | "hedged" | "currency" | "nav_currency" | "index_slug" | "index_name" | "asset_class" | "pea_eligible" | "fund_launch_date" | "nav_return_1y" | "nav_return_3y" | "nav_return_5y" | "nav_return_as_of" | "replication" | "ucits" | "domicile" | "category_slugs" | "trailing_yield_pct"> & { key: string; weight_pct: number; value_eur: number };

/** What a set of positions adds up to: value in euro, blended fee, what it holds underneath, and where funds overlap. */
export async function portfolioInsight(positions: PositionInput[]): Promise<PortfolioInsight> {
  const byKey = new Map<string, number>();
  for (const p of positions) if (p.quantity > 0) byKey.set(p.key, (byKey.get(p.key) ?? 0) + p.quantity);
  const rows = await getEtfs([...byKey.keys()]);
  const fx = new Map((await query<{ c: string; rate: number }>("select distinct on (quote_currency) quote_currency as c, rate from public.fx_rates where base_currency = 'EUR' order by quote_currency, rate_date desc")).map((r) => [r.c, r.rate]));
  fx.set("EUR", 1);
  const valued: { key: string; name: string; eur: number; fee: number | null; row: EtfRow }[] = [];
  const unvalued: string[] = [];
  // Requested keys may be old exchange-ticker keys, so match rows back in order.
  const requested = [...byKey.keys()];
  const resolved = await Promise.all(requested.map(async (k) => rows.find((r) => r.etf_key?.toUpperCase() === k.toUpperCase()) ?? (await getEtfs([k]))[0]));
  requested.forEach((k, i) => {
    const r = resolved[i];
    const rate = r?.nav_currency ? fx.get(r.nav_currency) : undefined;
    if (!r || r.nav === null || r.nav === undefined || !rate) { unvalued.push(r?.name ?? k); return; }
    valued.push({ key: r.etf_key!, name: r.name, eur: (r.nav * byKey.get(k)!) / rate, fee: r.headline_fee_pct, row: r });
  });
  const total = valued.reduce((s, v) => s + v.eur, 0);
  const weights = valued.map((v) => ({ key: v.key, name: v.name, weight_pct: total ? (v.eur / total) * 100 : 0, fee_pct: v.fee })).sort((a, b) => b.weight_pct - a.weight_pct);
  const known = weights.filter((w) => w.fee_pct !== null);
  const knownShare = known.reduce((s, w) => s + w.weight_pct, 0);
  const fee = knownShare ? known.reduce((s, w) => s + w.weight_pct * w.fee_pct!, 0) / knownShare : null;
  const [look, overlaps] = await Promise.all([
    lookThrough(Object.fromEntries(weights.map((w) => [w.key, w.weight_pct]))),
    getOverlaps(weights.slice(0, 8).map((w) => w.key)),
  ]);
  const classes = new Map<string, number>();
  for (const w of weights) { const row = valued.find((v) => v.key === w.key)!.row; const c = row.asset_class ?? "unknown"; classes.set(c, (classes.get(c) ?? 0) + w.weight_pct); }
  const funds: FundFacts[] = weights.map((w) => {
    const v = valued.find((x) => x.key === w.key)!;
    const r = v.row;
    return { key: w.key, weight_pct: w.weight_pct, value_eur: v.eur, name: r.name, isin: r.isin, headline_fee_pct: r.headline_fee_pct, size_eur: r.size_eur ?? null, distribution_policy: r.distribution_policy, distribution_frequency: r.distribution_frequency, hedged: r.hedged, currency: r.currency, nav_currency: r.nav_currency, index_slug: r.index_slug, index_name: r.index_name, asset_class: r.asset_class, pea_eligible: r.pea_eligible ?? (/\bPEA\b/.test(r.name) ? true : null), fund_launch_date: r.fund_launch_date, nav_return_1y: r.nav_return_1y, nav_return_3y: r.nav_return_3y, nav_return_5y: r.nav_return_5y, nav_return_as_of: r.nav_return_as_of, replication: r.replication, ucits: r.ucits, domicile: r.domicile, category_slugs: r.category_slugs, trailing_yield_pct: r.trailing_yield_pct };
  });
  return {
    xray: readXRay(look, weights.length),
    allocation: [...classes.entries()].map(([label, weight_pct]) => ({ label, weight_pct })).sort((a, b) => b.weight_pct - a.weight_pct),
    funds,
    total_eur: total, weights, unvalued, fee_pct: fee, fee_known_pct: knownShare,
    yearly_cost_eur: fee !== null ? (total * (knownShare / 100) * fee) / 100 : null,
    look, overlaps: overlaps.filter((o) => o.overlap_pct >= 20).sort((a, b) => b.overlap_pct - a.overlap_pct).slice(0, 6),
  };
}
