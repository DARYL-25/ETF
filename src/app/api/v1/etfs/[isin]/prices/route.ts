import { NextResponse, type NextRequest } from "next/server";
import { getDailyPoints, getEtf, getPriceSeries } from "@/lib/etfs/queries";

/** Price history for one ETF: monthly market prices where we hold them, then the daily NAV or close we collect. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  const etf = await getEtf((await params).isin);
  if (!etf) return NextResponse.json({ error: "No ETF with this identifier." }, { status: 404 });
  const [daily, monthly] = await Promise.all([getDailyPoints(etf.etf_key ?? etf.isin!), etf.fund_key ? getPriceSeries(etf.isin) : null]);
  const dailyCcy = daily.at(-1)?.currency ?? null;
  // Monthly market prices only join the daily series when both are in the same currency.
  const early = monthly && monthly.currency === dailyCcy ? monthly.points.filter((p) => !daily.length || p.date < daily[0].date) : [];
  const points = daily.length ? [...early, ...daily.map((d) => ({ date: d.date, close: d.value }))] : monthly?.points ?? [];
  return NextResponse.json({ name: etf.name, ticker: etf.ticker, currency: daily.length ? dailyCcy : monthly?.currency ?? null, fee_pct: etf.headline_fee_pct, points }, { headers: { "Cache-Control": "public, max-age=600" } });
}
