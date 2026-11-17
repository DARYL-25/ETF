import type { PortfolioInsight } from "@/lib/etfs/portfolio";
import type { Review } from "@/lib/portfolio/doctor";
import type { Change } from "@/lib/portfolio/watch";
import type { Alternative } from "@/lib/portfolio/doctor";
import { mixStats, type Mix } from "@/lib/tools/simulate";

/**
 * The portfolio copilot answers questions about the reader's own portfolio from figures computed in code:
 * the look-through, the review, recent price moves and watchlist changes. Each line of an answer is a
 * fixed sentence with numbers filled in, so it can be translated and checked; with an AI key the same
 * figures are handed to the model, which may only rephrase them.
 */
export type Line = { text: string; vars?: Record<string, string> };
export type FundExposure = { key: string; name: string; tech_pct: number | null; us_pct: number | null };
export type Move = { key: string; name: string; change_pct: number; weight_pct: number; from: string; to: string };
export type CopilotContext = { insight: PortfolioInsight; review: Review; exposures: FundExposure[]; moves: Move[]; watch: Change[]; alternatives: Record<string, Alternative[]> };
export type CopilotAnswer = { topic: string; lines: Line[] };

export const COPILOT_EXAMPLES = [
  "Which of my ETFs has the most technology?",
  "Am I overexposed to the United States?",
  "What are the three biggest weaknesses of my portfolio?",
  "Has a cheaper alternative appeared for one of my ETFs?",
  "What happens if I invest 200 more a month?",
  "Why is my portfolio down this month?",
  "What changed in the ETFs I follow?",
  "How could I simplify my portfolio?",
];

const p1 = (v: number) => v.toFixed(1);
const money = (v: number) => Math.round(v).toLocaleString("en-GB");

function amountIn(question: string): number | null {
  const m = /(\d[\d\s.,']*)\s*(?:€|eur|euros?|chf|francs?)?/i.exec(question.replace(/\b(19|20)\d{2}\b/g, ""));
  if (!m) return null;
  const v = Number(m[1].replace(/[\s']/g, "").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function answerLocally(question: string, ctx: CopilotContext): CopilotAnswer {
  const q = question.toLowerCase();
  const { insight, review } = ctx;
  const covered = p1(insight.look.covered_pct);
  if (/tech|technolog|informati/.test(q)) {
    const ranked = ctx.exposures.filter((e) => e.tech_pct !== null).sort((a, b) => b.tech_pct! - a.tech_pct!);
    if (!ranked.length) return { topic: "tech", lines: [{ text: "None of your funds has a holdings file on record, so we cannot measure technology exposure yet." }] };
    const lines: Line[] = [{ text: "{name} has the most technology: {pct}% of the fund.", vars: { name: ranked[0].name, pct: p1(ranked[0].tech_pct!) } }];
    if (insight.xray.tech_pct !== null) lines.push({ text: "Across the part of the portfolio we can see through ({covered}%), technology sectors are {pct}%.", vars: { covered, pct: p1(insight.xray.tech_pct) } });
    for (const e of ranked.slice(1, 4)) lines.push({ text: "{name}: {pct}% technology.", vars: { name: e.name, pct: p1(e.tech_pct!) } });
    return { topic: "tech", lines };
  }
  if (/united states|\busa?\b|u\.s\.|améri|ameri|états-unis|etats-unis/.test(q)) {
    if (insight.xray.us_pct === null) return { topic: "us", lines: [{ text: "None of your funds has a holdings file on record, so we cannot measure country exposure yet." }] };
    const lines: Line[] = [{ text: "{pct}% of the part we can see through ({covered}% of the portfolio) is in US companies.", vars: { pct: p1(insight.xray.us_pct), covered } }];
    lines.push({ text: insight.xray.us_pct >= 70 ? "That is above a world index, which holds about two thirds in the United States." : insight.xray.us_pct >= 55 ? "That is close to a world index, which holds about two thirds in the United States." : "That is below a world index, which holds about two thirds in the United States." });
    for (const e of ctx.exposures.filter((x) => x.us_pct !== null).sort((a, b) => b.us_pct! - a.us_pct!).slice(0, 3)) lines.push({ text: "{name}: {pct}% in US companies.", vars: { name: e.name, pct: p1(e.us_pct!) } });
    return { topic: "us", lines };
  }
  if (/simplif|fewer|moins de fonds|réduire|reduce|merge|regroup/.test(q)) {
    if (!review.options.length) return { topic: "simplify", lines: [{ text: "No two of your funds overlap by 60% or more or share an index, so we see no fund that folds neatly into another." }] };
    return { topic: "simplify", lines: review.options.slice(0, 3).map((o) => ({ text: "Moving {drop} into {keep} would keep most of the exposure with one fund fewer. Moving {amount} € would cost about {cost} € in spreads and orders, before any tax on gains.", vars: { drop: o.vars.drop, keep: o.vars.keep, amount: money(o.moved_eur), cost: money(o.switching_cost_eur) } })) };
  }
  if (/weak|faibless|problem|problème|improve|amélior|doctor|bilan|review/.test(q)) {
    if (!review.weaknesses.length) return { topic: "weaknesses", lines: [{ text: "The review found no weakness worth flagging in what we can see." }] };
    return { topic: "weaknesses", lines: review.weaknesses.map((w) => ({ text: w.detail, vars: w.vars })) };
  }
  if (/cheap|moins cher|alternativ|fee|frais/.test(q)) {
    const lines: Line[] = [];
    for (const f of insight.funds) {
      const alt = ctx.alternatives[f.key]?.[0];
      if (alt && f.headline_fee_pct !== null && alt.fee_pct < f.headline_fee_pct) lines.push({ text: "{name} charges {fee}%. {alt}, on the same index, charges {altFee}%.", vars: { name: f.name, fee: f.headline_fee_pct.toFixed(2), alt: alt.name, altFee: alt.fee_pct.toFixed(2) } });
    }
    if (!lines.length) lines.push({ text: "Among funds on the same index with a fee on file, none of yours has a cheaper equivalent." });
    if (insight.fee_pct !== null) lines.push({ text: "Your blended yearly fee is {fee}%, about {money} € a year.", vars: { fee: insight.fee_pct.toFixed(2), money: money(insight.yearly_cost_eur ?? 0) } });
    return { topic: "cheaper", lines };
  }
  if (/(month|mois|monthly|mensuel)/.test(q) && /(more|increase|add|plus|augment|ajout|invest)/.test(q)) {
    const extra = amountIn(q) ?? 200;
    const mix: Mix = Object.fromEntries(insight.allocation.filter((a) => a.label !== "unknown").map((a) => [a.label, a.weight_pct]));
    const stats = mixStats(Object.keys(mix).length ? mix : { equity: 100 });
    const r = (stats.returnPct - (insight.fee_pct ?? 0.2)) / 100;
    const fv = (years: number) => { const m = Math.pow(1 + r, 1 / 12) - 1; let v = 0; for (let i = 0; i < years * 12; i++) v = v * (1 + m) + extra; return v; };
    return { topic: "monthly", lines: [
      { text: "With {extra} € more each month, at an assumed {r}% a year after fees, the extra savings would grow to about {v10} € in 10 years and {v20} € in 20 years.", vars: { extra: money(extra), r: (r * 100).toFixed(1), v10: money(fv(10)), v20: money(fv(20)) } },
      { text: "You would have paid in {p10} € and {p20} € of that. Real returns vary from year to year: the simulator shows the range.", vars: { p10: money(extra * 120), p20: money(extra * 240) } },
    ] };
  }
  if (/down|fall|drop|lost|lose|baisse|chute|perd|recul|pourquoi|why/.test(q)) {
    if (!ctx.moves.length) return { topic: "moves", lines: [{ text: "We do not have daily prices for these funds over the last month, so we cannot say what moved." }] };
    const total = ctx.moves.reduce((s, m) => s + (m.change_pct * m.weight_pct) / 100, 0);
    const lines: Line[] = [{ text: "Over the last month of prices we hold ({from} to {to}), the funds we can price moved {pct}% together, weighted by value.", vars: { from: ctx.moves[0].from, to: ctx.moves[0].to, pct: (total >= 0 ? "+" : "") + total.toFixed(1) } }];
    for (const m of [...ctx.moves].sort((a, b) => (a.change_pct * a.weight_pct) - (b.change_pct * b.weight_pct)).slice(0, 3)) lines.push({ text: "{name}: {pct}%, {weight}% of the portfolio.", vars: { name: m.name, pct: (m.change_pct >= 0 ? "+" : "") + m.change_pct.toFixed(1), weight: p1(m.weight_pct) } });
    if (insight.xray.currencies[0] && insight.xray.currencies[0].label !== "EUR") lines.push({ text: "Exchange rates count too: most of what you own is priced in {ccy}, so a stronger euro lowers its value in euro.", vars: { ccy: insight.xray.currencies[0].label } });
    return { topic: "moves", lines };
  }
  if (/chang|week|semaine|nouveau|news|follow|suiv/.test(q)) {
    if (!ctx.watch.length) return { topic: "watch", lines: [{ text: "Nothing has changed in the fee, size or name of the ETFs on your watchlists since you added them." }] };
    return { topic: "watch", lines: ctx.watch.slice(0, 6).map((c) => ({ text: c.text, vars: c.vars })) };
  }
  if (/overlap|recoup|chevauch|same|doublon/.test(q)) {
    if (!insight.overlaps.length) return { topic: "overlap", lines: [{ text: "No two of your funds overlap by 20% or more, among those with holdings on file." }] };
    const name = (k: string) => insight.funds.find((f) => f.key === k)?.name ?? k;
    return { topic: "overlap", lines: insight.overlaps.map((o) => ({ text: "{a} and {b} overlap by {pct}%.", vars: { a: name(o.a), b: name(o.b), pct: o.overlap_pct.toFixed(0) } })) };
  }
  if (/currenc|devise|dollar|change/.test(q)) {
    return { topic: "currency", lines: insight.xray.currencies.slice(0, 5).map((c) => ({ text: "{ccy}: {pct}% of the companies seen through.", vars: { ccy: c.label, pct: p1(c.weight_pct) } })) };
  }
  return { topic: "unknown", lines: [{ text: "I can answer questions about technology and US exposure, overlaps, fees and cheaper funds, weaknesses, simplifying, monthly savings, recent moves and changes to your watchlists." }] };
}

export const COPILOT_SYSTEM = `You are the portfolio copilot of ETF Intelligence. You explain a reader's own hypothetical portfolio.
Rules you must follow:
- Use only the figures in the CONTEXT and in DRAFT_ANSWER. Never add a number, fund, fee, return or tax rule that is not there.
- You give research support, not personal investment advice. Never say "you should buy" or "sell". Describe options with their trade-offs.
- Say which part of the portfolio a figure covers when the context gives it.
- Reply in the language of the question, in plain text, at most 120 words.`;
