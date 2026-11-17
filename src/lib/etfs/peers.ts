import { query } from "@/lib/db/client";
import type { EtfRow } from "./queries";
import { returnGaps } from "./cost";
import { qualityScore, type Quality } from "./quality";
import { measuredTracking } from "@/lib/tools/true-cost";

/** Every fund on the same index, for fee and return comparisons. */
export const indexPeers = (indexSlug: string | null) =>
  indexSlug ? query<EtfRow>("select * from public.etf_directory where index_slug = $1 and not ('leveraged-inverse' = any(category_slugs)) limit 400", [indexSlug]) : Promise.resolve([] as EtfRow[]);

export type PeerFacts = { quality: Quality; behindBestPts: number | null; trackingBeyondFeePct: number | null; gapAsOf: string | null; peers: number; cheapest: { key: string; name: string; fee_pct: number } | null };

/** Quality score and measured tracking for one fund, from the funds on its index. */
export async function peerFacts(row: EtfRow): Promise<PeerFacts> {
  const peers = await indexPeers(row.index_slug);
  const key = row.etf_key ?? row.isin;
  const fees = peers.map((p) => p.headline_fee_pct).filter((v): v is number => v !== null);
  const gaps = returnGaps(peers);
  // Funds on one index should be within a point or two of each other. A fund far from the middle of its group
  // is a data problem (a different share class, currency or index variant), so it is left out of the comparison.
  const r1s = (gaps?.rows ?? []).map((g) => g.r1).sort((a, b) => a - b);
  const median = r1s.length ? r1s[Math.floor(r1s.length / 2)] : 0;
  const clean = (gaps?.rows ?? []).filter((g) => Math.abs(g.r1 - median) <= 1);
  const top = clean.length >= 3 ? Math.max(...clean.map((g) => g.r1)) : null;
  const found = clean.find((g) => (g.row.etf_key ?? g.row.isin) === key);
  const mine = top !== null && found ? { behind1: top - found.r1 } : null;
  const best = top !== null ? clean.find((g) => g.r1 === top)! : null;
  const raw = mine && best && row.headline_fee_pct !== null && best.row.headline_fee_pct !== null ? measuredTracking(mine.behind1, row.headline_fee_pct, best.row.headline_fee_pct) : null;
  // Beyond half a point a year, the gap says more about the data than about the fund, so it is not offered as tracking.
  const tracking = raw !== null && Math.abs(raw) <= 0.5 ? raw : null;
  const cheapestRow = peers.filter((p) => p.headline_fee_pct !== null && (p.etf_key ?? p.isin) !== key && p.hedged !== true).sort((a, b) => a.headline_fee_pct! - b.headline_fee_pct!)[0];
  return {
    quality: qualityScore(row, { peerFees: fees, behindBestPts: mine ? mine.behind1 : null }),
    behindBestPts: mine ? mine.behind1 : null, trackingBeyondFeePct: tracking, gapAsOf: gaps?.asOf ?? null, peers: peers.length,
    cheapest: cheapestRow ? { key: cheapestRow.etf_key ?? cheapestRow.isin!, name: cheapestRow.name, fee_pct: cheapestRow.headline_fee_pct! } : null,
  };
}
