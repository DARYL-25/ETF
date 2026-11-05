import { NextResponse, type NextRequest } from "next/server";
import { getEtf, getExposures, getListings } from "@/lib/etfs/queries";

export async function GET(_: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  const etf = await getEtf((await params).isin);
  if (!etf) return NextResponse.json({ error: "No ETF with this ISIN in the database." }, { status: 404 });
  const [listings, exposures] = await Promise.all([getListings(etf.isin ?? ""), getExposures(etf.fund_key ?? "")]);
  return NextResponse.json({ etf, listings, exposures });
}
