import { NextResponse, type NextRequest } from "next/server";
import { searchEtfs } from "@/lib/etfs/queries";

export async function GET(request: NextRequest) {
  const results = await searchEtfs(request.nextUrl.searchParams.get("q") ?? "");
  return NextResponse.json({ results });
}
