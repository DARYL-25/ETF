import { NextResponse } from "next/server";
import { getEtf } from "@/lib/etfs/queries";
import { peerFacts } from "@/lib/etfs/peers";

/** What the cost calculator and the simulator prefill for one ETF: fee, currency, measured tracking, quality. */
export async function GET(_request: Request, { params }: { params: Promise<{ isin: string }> }) {
  const row = await getEtf((await params).isin);
  if (!row) return NextResponse.json({ error: "ETF not found." }, { status: 404 });
  const facts = await peerFacts(row);
  return NextResponse.json({
    key: row.etf_key ?? row.isin, name: row.name, fee_pct: row.headline_fee_pct, fee_type: row.headline_fee_type, currency: row.nav_currency ?? row.currency, asset_class: row.asset_class,
    index_name: row.index_name, tracking_beyond_fee_pct: facts.trackingBeyondFeePct, behind_best_pts: facts.behindBestPts, gap_as_of: facts.gapAsOf, quality: facts.quality, cheapest: facts.cheapest,
  });
}
