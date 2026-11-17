import type { EtfRow } from "./queries";

/**
 * ETF quality score: how well a fund does the job of an index fund, from facts we hold. Five parts, each
 * scored 0 to 100 by a published rule, then averaged with fixed weights over the parts we can score. A
 * part without data is left out and named, never filled in. No issuer pays for, or can influence, a score.
 * It says nothing about whether the index suits anyone: that depends on the reader.
 */
export type QualityPart = { id: "cost" | "size" | "tracking" | "age" | "listings"; label: string; weight: number; score: number | null; basis: string; vars: Record<string, string> };
export type Quality = { score: number | null; grade: "A" | "B" | "C" | "D" | "E" | null; parts: QualityPart[]; scored_weight: number };

export const QUALITY_METHOD: { id: QualityPart["id"]; label: string; weight: number; rule: string }[] = [
  { id: "cost", label: "Cost", weight: 30, rule: "Fee compared with every fund on the same index with a fee on file: the cheapest scores 100, the dearest 0. Without three such funds, 0.05% scores 100 and 1% or more scores 0." },
  { id: "tracking", label: "Tracking", weight: 20, rule: "One-year NAV return gap to the best fund on the same index, reported to the same date and in the same currency: no gap scores 100, a gap of one point or more scores 0." },
  { id: "size", label: "Size", weight: 25, rule: "Fund assets in euro on a log scale: 10 million or less scores 0, 10 billion or more scores 100. Larger funds are closed less often and trade with tighter spreads." },
  { id: "age", label: "Track record", weight: 15, rule: "Years since the fund launched: 5 years or more scores 100, a new fund 0." },
  { id: "listings", label: "Listings", weight: 10, rule: "Number of exchange listings on file: 5 or more scores 100, one listing 30. More venues usually means more market makers." },
];

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export type QualityContext = {
  /** Fees of every fund on the same index, this one included. */
  peerFees?: number[];
  /** One-year return gap to the best fund on the same index, in points, when measured. */
  behindBestPts?: number | null;
  today?: Date;
};

export function qualityScore(row: Pick<EtfRow, "headline_fee_pct" | "size_eur" | "fund_aum_eur" | "fund_launch_date" | "venues">, ctx: QualityContext = {}): Quality {
  const parts: QualityPart[] = [];
  const method = Object.fromEntries(QUALITY_METHOD.map((m) => [m.id, m]));
  const fee = row.headline_fee_pct;
  const peers = (ctx.peerFees ?? []).filter((v) => v !== null && v !== undefined);
  let cost: number | null = null, costBasis = "No fee on file", costVars: Record<string, string> = {};
  if (fee !== null && fee !== undefined) {
    if (peers.length >= 3) {
      const lo = Math.min(...peers), hi = Math.max(...peers);
      cost = hi > lo ? clamp(((hi - fee) / (hi - lo)) * 100) : 100;
      costBasis = "{fee}% against {n} funds on the same index, from {lo}% to {hi}%"; costVars = { fee: fee.toFixed(2), n: String(peers.length), lo: lo.toFixed(2), hi: hi.toFixed(2) };
    } else {
      cost = clamp(((1 - fee) / 0.95) * 100);
      costBasis = "{fee}% on the absolute scale"; costVars = { fee: fee.toFixed(2) };
    }
  }
  parts.push({ id: "cost", label: method.cost.label, weight: method.cost.weight, score: cost, basis: costBasis, vars: costVars });
  const gap = ctx.behindBestPts;
  parts.push({ id: "tracking", label: method.tracking.label, weight: method.tracking.weight, score: gap === null || gap === undefined ? null : clamp(100 - gap * 100), basis: gap === null || gap === undefined ? "No comparable one-year returns on the same index" : "{gap} points behind the best fund over one year", vars: gap === null || gap === undefined ? {} : { gap: gap.toFixed(2) } });
  const size = row.size_eur ?? row.fund_aum_eur ?? null;
  parts.push({ id: "size", label: method.size.label, weight: method.size.weight, score: size && size > 0 ? clamp(((Math.log10(size) - 7) / 3) * 100) : null, basis: size ? "{size} million euro" : "No fund size on file", vars: size ? { size: (size / 1e6).toFixed(0) } : {} });
  const today = ctx.today ?? new Date();
  const years = row.fund_launch_date ? (today.getTime() - new Date(row.fund_launch_date).getTime()) / (365.25 * 864e5) : null;
  parts.push({ id: "age", label: method.age.label, weight: method.age.weight, score: years === null || Number.isNaN(years) ? null : clamp((years / 5) * 100), basis: years === null || Number.isNaN(years) ? "No launch date on file" : "{years} years since launch", vars: years === null || Number.isNaN(years) ? {} : { years: Math.max(0, years).toFixed(1) } });
  const venues = row.venues ?? null;
  parts.push({ id: "listings", label: method.listings.label, weight: method.listings.weight, score: venues ? clamp(30 + ((Math.min(venues, 5) - 1) / 4) * 70) : null, basis: venues ? "{n} listings on file" : "No listing count on file", vars: venues ? { n: String(venues) } : {} });
  const scored = parts.filter((p) => p.score !== null);
  const weight = scored.reduce((s, p) => s + p.weight, 0);
  // A score needs cost and at least two other parts, covering half the weight, or it would mean too little.
  if (cost === null || scored.length < 3 || weight < 50) return { score: null, grade: null, parts, scored_weight: weight };
  const score = scored.reduce((s, p) => s + p.score! * p.weight, 0) / weight;
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "E";
  return { score, grade, parts, scored_weight: weight };
}
