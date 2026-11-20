import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { watchSchema } from "@/lib/portfolio/schema";
import { watchChanges } from "@/lib/etfs/portfolio-data";

const body = z.object({ items: watchSchema });

/** What changed for watched ETFs since each was added: fee, size, name, or no longer in the database. */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send up to 300 items, each with a key and what it looked like when added." }, { status: 400 });
  return NextResponse.json({ changes: await watchChanges(parsed.data.items) });
}
