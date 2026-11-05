import { NextResponse } from "next/server";
import { query, usingEmbeddedDatabase } from "@/lib/db/client";

export async function GET() {
  const [{ etfs }] = await query<{ etfs: number }>("select count(*)::int as etfs from public.share_classes");
  return NextResponse.json({ ok: true, etfs, database: usingEmbeddedDatabase() ? "embedded" : "postgres" });
}
