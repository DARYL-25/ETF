import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { positionsSchema, watchSchema } from "@/lib/portfolio/schema";
import { fullReview } from "@/lib/portfolio/review-server";
import { fundExposures, recentMoves, watchChanges } from "@/lib/etfs/portfolio-data";
import { answerLocally, COPILOT_SYSTEM, type CopilotContext } from "@/lib/assistant/copilot";
import { getLens } from "@/lib/lens-server";
import { makeT, pickLang } from "@/lib/i18n";

const body = z.object({ question: z.string().min(2).max(500), positions: positionsSchema, watch: watchSchema.optional() });

/**
 * Answers a question about the reader's own portfolio from figures computed here. With ANTHROPIC_API_KEY set,
 * the model rewrites the answer in plain language but receives only these figures; without it, the computed
 * answer is returned as it is.
 */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send a question and 1 to 60 positions." }, { status: 400 });
  const lens = await getLens();
  const lang = pickLang(request.cookies.get("lang")?.value, request.headers.get("accept-language"));
  const t = makeT(lang);
  const full = await fullReview(parsed.data.positions, lens?.code ?? null);
  const funds = full.insight.funds.map((f) => ({ key: f.key, name: f.name, weight_pct: f.weight_pct }));
  const [exposures, moves, watch] = await Promise.all([fundExposures(funds), recentMoves(funds), watchChanges(parsed.data.watch ?? [])]);
  const ctx: CopilotContext = { insight: full.insight, review: full.review, exposures, moves, watch, alternatives: full.alternatives };
  const local = answerLocally(parsed.data.question, ctx);
  const lines = local.lines.map((l) => t(l.text, l.vars));
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ topic: local.topic, lines, text: null, aiUsed: false });
  try {
    const summary = {
      value_eur: Math.round(full.insight.total_eur), blended_fee_pct: full.insight.fee_pct, seen_through_pct: full.insight.look.covered_pct,
      funds: full.insight.funds.map((f) => ({ name: f.name, weight_pct: Number(f.weight_pct.toFixed(1)), fee_pct: f.headline_fee_pct, index: f.index_name })),
      top_companies: full.insight.look.holdings.slice(0, 10).map((h) => ({ name: h.label, pct: Number(h.weight_pct.toFixed(2)) })),
      us_pct: full.insight.xray.us_pct, tech_pct: full.insight.xray.tech_pct, currencies: full.insight.xray.currencies.slice(0, 5),
      weaknesses: full.review.weaknesses.map((w) => t(w.detail, w.vars)), exposures, moves, watch_changes: watch.map((c) => t(c.text, c.vars)),
    };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ASSISTANT_MODEL ?? "claude-haiku-5-5", max_tokens: 500, system: COPILOT_SYSTEM, messages: [{ role: "user", content: `QUESTION: ${parsed.data.question}\n\nCONTEXT: ${JSON.stringify(summary)}\n\nDRAFT_ANSWER: ${lines.join(" ")}` }] }),
    });
    if (!res.ok) return NextResponse.json({ topic: local.topic, lines, text: null, aiUsed: false });
    const out = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = out.content.filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
    return NextResponse.json({ topic: local.topic, lines, text: text || null, aiUsed: Boolean(text) });
  } catch {
    return NextResponse.json({ topic: local.topic, lines, text: null, aiUsed: false });
  }
}
