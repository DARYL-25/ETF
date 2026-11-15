import { NextResponse, type NextRequest } from "next/server";
import { screenEtfs } from "@/lib/etfs/queries";
import { parseScreenerParams } from "@/lib/etfs/screener-params";

/** Public screener API. The web app and future mobile apps share these filters. */
export async function GET(request: NextRequest) {
  const raw: Record<string, string> = Object.fromEntries(request.nextUrl.searchParams);
  return NextResponse.json(await screenEtfs(parseScreenerParams(raw)));
}
