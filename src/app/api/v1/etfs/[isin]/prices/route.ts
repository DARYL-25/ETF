import { NextResponse, type NextRequest } from "next/server";
import { getPriceSeries } from "@/lib/etfs/queries";

export async function GET(_: NextRequest, { params }: { params: Promise<{ isin: string }> }) {
  const series = await getPriceSeries((await params).isin);
  if (!series) return NextResponse.json({ error: "No price history for this ISIN." }, { status: 404 });
  return NextResponse.json(series);
}
