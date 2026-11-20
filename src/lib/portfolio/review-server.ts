import { portfolioInsight, type PortfolioInsight } from "@/lib/etfs/portfolio";
import { cheaperOnSameIndex } from "@/lib/etfs/alternatives";
import { getEtfs } from "@/lib/etfs/queries";
import { reviewPortfolio, type Alternative, type Review } from "./doctor";
import { suggestLessons } from "@/lib/academy/suggest";
import { LESSONS } from "@/lib/academy/content";
import { localLesson } from "@/lib/academy/content.fr";
import type { Lang } from "@/lib/i18n";

export type FullReview = { insight: PortfolioInsight; review: Review; alternatives: Record<string, Alternative[]>; lessons: { slug: string; title: string; reason: string }[] };

/** The look-through, the review and its alternatives, computed together for one set of positions. */
export async function fullReview(positions: { key: string; quantity: number }[], lens: string | null, costs: { spreadPct?: number; orderFeeEur?: number } = {}, lang: Lang = "en"): Promise<FullReview> {
  const insight = await portfolioInsight(positions);
  const rows = await getEtfs(insight.funds.map((f) => f.key));
  const alternatives = await cheaperOnSameIndex(rows);
  const review = reviewPortfolio({ insight, alternatives, lens, ...costs });
  const lessons = suggestLessons(insight, lens).map((s) => ({ ...s, title: (() => { const l = LESSONS.find((x) => x.slug === s.slug); return l ? localLesson(l, lang).title : s.slug; })() }));
  return { insight, review, alternatives, lessons };
}
