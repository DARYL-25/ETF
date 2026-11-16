import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { portfolioInsight } from "@/lib/etfs/portfolio";

const body = z.object({ positions: z.array(z.object({ key: z.string().min(3).max(40), quantity: z.number().positive().max(1e12) })).min(1).max(60) });

/** Blended fee, look-through holdings and overlaps for positions the reader typed. Nothing is stored. */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send 1 to 60 positions, each with a key and a quantity." }, { status: 400 });
  return NextResponse.json(await portfolioInsight(parsed.data.positions));
}
