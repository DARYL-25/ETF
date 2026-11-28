import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { positionsSchema, watchSchema } from "@/lib/portfolio/schema";
import { fullReview } from "@/lib/portfolio/review-server";
import { fundExposures, recentMoves, watchChanges } from "@/lib/etfs/portfolio-data";
import { answerLocally, type CopilotContext } from "@/lib/assistant/copilot";
import { advise, DISCLAIMER, objectivesSchema } from "@/lib/assistant/advisor";
import { getLens } from "@/lib/lens-server";
import { makeT, pickLang } from "@/lib/i18n";
import { aiConfig } from "@/lib/ai/provider";

const body = z.object({ question: z.string().min(2).max(500), positions: positionsSchema, watch: watchSchema.optional(), objectives: objectivesSchema.nullish() });


/**
 * Answers a question about the reader's own portfolio. Figures are computed here first. With an AI model
 * configured (by default the open-weight Kimi K3.1 Pro on Vercel AI Gateway, zero data retention), the model reads
 * those figures and the reader's objectives, may search our ETF database, and writes observations and options;
 * see lib/assistant/advisor.ts. Without a model, the computed answer is returned as it is. Every reply carries
 * the not-advice notice.
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
  const config = aiConfig();
  const disclaimer = t(DISCLAIMER);
  const plain = { topic: local.topic, lines, text: null, aiUsed: false, suggested: [], disclaimer };
  if (!config) return NextResponse.json(plain);
  try {
    const summary = {
      value_eur: Math.round(full.insight.total_eur), blended_fee_pct: full.insight.fee_pct, seen_through_pct: full.insight.look.covered_pct,
      funds: full.insight.funds.map((f) => ({ key: f.key, name: f.name, weight_pct: Number(f.weight_pct.toFixed(1)), fee_pct: f.headline_fee_pct, index: f.index_name })),
      allocation: full.insight.allocation, top_companies: full.insight.look.holdings.slice(0, 10).map((h) => ({ name: h.label, pct: Number(h.weight_pct.toFixed(2)) })),
      sectors: full.insight.look.sectors, countries: full.insight.look.countries,
      us_pct: full.insight.xray.us_pct, tech_pct: full.insight.xray.tech_pct, currencies: full.insight.xray.currencies.slice(0, 5),
      overlaps: full.insight.overlaps, weaknesses: full.review.weaknesses.map((w) => t(w.detail, w.vars)), exposures, moves, watch_changes: watch.map((c) => t(c.text, c.vars)),
      computed_answer: lines,
    };
    const advice = await advise({ question: parsed.data.question, objectives: parsed.data.objectives ?? null, context: summary, home: lens?.name ?? null, lang, config });
    if (!advice.aiUsed) return NextResponse.json(plain);
    const suggested = advice.suggested.map((r) => ({ key: r.etf_key ?? r.isin, isin: r.isin, name: r.name, fee_pct: r.headline_fee_pct, size: r.fund_aum ?? r.class_aum, size_currency: r.fund_aum_currency ?? r.class_aum_currency, income: r.distribution_policy }));
    return NextResponse.json({ ...plain, text: advice.text, aiUsed: true, suggested });
  } catch {
    return NextResponse.json(plain);
  }
}
