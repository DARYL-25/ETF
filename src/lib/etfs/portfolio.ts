import { query } from "@/lib/db/client";
import { getEtfs } from "./queries";
import { getOverlaps, lookThrough, type LookThrough } from "./holdings";

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
};

/** What a set of positions adds up to: value in euro, blended fee, what it holds underneath, and where funds overlap. */
export async function portfolioInsight(positions: PositionInput[]): Promise<PortfolioInsight> {
  const byKey = new Map<string, number>();
  for (const p of positions) if (p.quantity > 0) byKey.set(p.key, (byKey.get(p.key) ?? 0) + p.quantity);
  const rows = await getEtfs([...byKey.keys()]);
  const fx = new Map((await query<{ c: string; rate: number }>("select distinct on (quote_currency) quote_currency as c, rate from public.fx_rates where base_currency = 'EUR' order by quote_currency, rate_date desc")).map((r) => [r.c, r.rate]));
  fx.set("EUR", 1);
  const valued: { key: string; name: string; eur: number; fee: number | null }[] = [];
  const unvalued: string[] = [];
  // Requested keys may be old exchange-ticker keys, so match rows back in order.
  const requested = [...byKey.keys()];
  const resolved = await Promise.all(requested.map(async (k) => rows.find((r) => r.etf_key?.toUpperCase() === k.toUpperCase()) ?? (await getEtfs([k]))[0]));
  requested.forEach((k, i) => {
    const r = resolved[i];
    const rate = r?.nav_currency ? fx.get(r.nav_currency) : undefined;
    if (!r || r.nav === null || r.nav === undefined || !rate) { unvalued.push(r?.name ?? k); return; }
    valued.push({ key: r.etf_key!, name: r.name, eur: (r.nav * byKey.get(k)!) / rate, fee: r.headline_fee_pct });
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
  return {
    total_eur: total, weights, unvalued, fee_pct: fee, fee_known_pct: knownShare,
    yearly_cost_eur: fee !== null ? (total * (knownShare / 100) * fee) / 100 : null,
    look, overlaps: overlaps.filter((o) => o.overlap_pct >= 20).sort((a, b) => b.overlap_pct - a.overlap_pct).slice(0, 6),
  };
}
