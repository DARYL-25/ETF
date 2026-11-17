import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { positionsSchema } from "@/lib/portfolio/schema";
import { fullReview } from "@/lib/portfolio/review-server";
import { getLens } from "@/lib/lens-server";
import { pickLang } from "@/lib/i18n";

const body = z.object({ positions: positionsSchema, spreadPct: z.number().min(0).max(5).optional(), orderFeeEur: z.number().min(0).max(100).optional() });

/** The portfolio review for positions the reader typed or imported. Nothing is stored. */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send 1 to 60 positions, each with a key and a quantity." }, { status: 400 });
  const lens = await getLens();
  const lang = pickLang(request.cookies.get("lang")?.value, request.headers.get("accept-language"));
  return NextResponse.json(await fullReview(parsed.data.positions, lens?.code ?? null, parsed.data, lang));
}
