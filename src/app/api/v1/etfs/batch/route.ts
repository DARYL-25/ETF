import { NextResponse, type NextRequest } from "next/server";
import { getEtfs } from "@/lib/etfs/queries";

/** Rows for a saved list. Limited, because this is called from the browser. */
export async function GET(request: NextRequest) {
  const keys = (request.nextUrl.searchParams.get("keys") ?? "").split(",").map((k) => k.trim()).filter(Boolean).slice(0, 200);
  return NextResponse.json({ rows: await getEtfs(keys) });
}
