import type { PortfolioInsight } from "@/lib/etfs/portfolio";

/**
 * The portfolio review. It states findings about a portfolio the reader entered, each with its number and
 * the rule that produced it, and lists options to look at. It never says what to buy or sell: the options are
 * described against the reader's own holdings and costs, and the choice stays with the reader.
 */
export type Severity = "high" | "medium" | "low";
export type Finding = { id: string; area: "diversification" | "risk" | "costs" | "overlap" | "allocation" | "efficiency" | "data"; severity: Severity; title: string; detail: string; vars: Record<string, string> };
export type Alternative = { key: string; name: string; fee_pct: number; size_eur: number | null; same_fund: boolean };
export type SimplifyOption = { title: string; detail: string; vars: Record<string, string>; keep: string; drop: string; moved_eur: number; switching_cost_eur: number; yearly_fee_change_eur: number | null };
export type Review = { findings: Finding[]; weaknesses: Finding[]; options: SimplifyOption[]; switching: { spread_pct: number; order_fee_eur: number }; summary: { funds: number; value_eur: number; fee_pct: number | null; covered_pct: number } };

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const n = (v: number, digits = 1) => v.toFixed(digits);
const eur = (v: number) => Math.round(v).toLocaleString("en-GB");

export type ReviewInput = { insight: PortfolioInsight; alternatives: Record<string, Alternative[]>; lens?: string | null; spreadPct?: number; orderFeeEur?: number };

export function reviewPortfolio({ insight, alternatives, lens = null, spreadPct = 0.1, orderFeeEur = 2 }: ReviewInput): Review {
  const f: Finding[] = [];
  const { xray, funds, total_eur: total } = insight;
  const add = (x: Finding) => f.push(x);

  if (xray.largest && xray.largest.pct >= 5) add({ id: "single-company", area: "risk", severity: xray.largest.pct >= 10 ? "high" : "medium", title: "One company weighs a lot", detail: "{name} is {pct}% of the whole portfolio once every fund is seen through.", vars: { name: xray.largest.name, pct: n(xray.largest.pct) } });
  if (xray.top10_pct >= 25) add({ id: "top10", area: "diversification", severity: xray.top10_pct >= 35 ? "high" : "medium", title: "Concentrated in a few companies", detail: "The ten largest underlying companies make up {pct}% of the portfolio.", vars: { pct: n(xray.top10_pct, 0) } });
  for (const o of insight.overlaps) {
    const a = funds.find((x) => x.key === o.a)?.name ?? o.a, b = funds.find((x) => x.key === o.b)?.name ?? o.b;
    add({ id: `overlap-${o.a}-${o.b}`, area: "overlap", severity: o.overlap_pct >= 50 ? "high" : "medium", title: "Two funds hold largely the same things", detail: "{a} and {b} overlap by {pct}%: owning both adds little diversification.", vars: { a, b, pct: n(o.overlap_pct, 0) } });
  }
  const sameIndex = new Map<string, string[]>();
  for (const x of funds) if (x.index_slug) sameIndex.set(x.index_slug, [...(sameIndex.get(x.index_slug) ?? []), x.name]);
  for (const [, names] of sameIndex) if (names.length > 1) add({ id: `same-index-${names[0]}`, area: "efficiency", severity: "medium", title: "Several funds on the same index", detail: "{names} follow the same index, so together they behave like one fund.", vars: { names: names.join(", ") } });

  if (insight.fee_pct !== null && insight.fee_pct > 0.3) add({ id: "fee", area: "costs", severity: insight.fee_pct > 0.5 ? "high" : "medium", title: "Fees above typical index funds", detail: "The blended yearly fee is {fee}%, about {money} € a year on this portfolio. Broad index ETFs often charge 0.05% to 0.25%.", vars: { fee: n(insight.fee_pct, 2), money: eur(insight.yearly_cost_eur ?? 0) } });
  let saving = 0;
  const cheaper: string[] = [];
  for (const x of funds) {
    const alt = alternatives[x.key]?.[0];
    if (!alt || x.headline_fee_pct === null || alt.fee_pct >= x.headline_fee_pct - 0.05) continue;
    saving += (x.value_eur * (x.headline_fee_pct - alt.fee_pct)) / 100;
    cheaper.push(x.name);
  }
  if (cheaper.length) add({ id: "cheaper", area: "costs", severity: saving >= 50 ? "medium" : "low", title: "Cheaper funds exist on the same index", detail: "For {names}, a fund on the same index charges at least 0.05 points less, about {money} € a year in fees on these amounts. Check tracking, size and where it trades before comparing further.", vars: { names: cheaper.join(", "), money: eur(saving) } });

  const small = funds.filter((x) => x.weight_pct < 5);
  if (funds.length >= 6 && small.length >= 3) add({ id: "many-small", area: "efficiency", severity: "medium", title: "Many small positions", detail: "{count} of your {funds} funds are each under 5% of the portfolio. Small positions add orders, fees and paperwork while moving the result little.", vars: { count: String(small.length), funds: String(funds.length) } });
  if (funds.length === 1) add({ id: "one-fund", area: "diversification", severity: "low", title: "A single fund", detail: "Everything rests on one fund. That can be enough when the fund is broad, so check what its index covers.", vars: {} });
  if (xray.us_pct !== null && xray.us_pct >= 70) add({ id: "us", area: "allocation", severity: "medium", title: "Mostly one country", detail: "{pct}% of what we can see through is in US companies. A world index holds about two thirds in the United States, so this is above it.", vars: { pct: n(xray.us_pct, 0) } });
  if (xray.tech_pct !== null && xray.tech_pct >= 35) add({ id: "tech", area: "allocation", severity: "medium", title: "Heavy in technology", detail: "{pct}% of what we can see through is in technology sectors, so the portfolio depends on one part of the economy.", vars: { pct: n(xray.tech_pct, 0) } });
  const equity = insight.allocation.find((a) => a.label === "equity")?.weight_pct ?? 0;
  if (equity >= 99.5) add({ id: "all-equity", area: "risk", severity: "low", title: "Only shares", detail: "There are no bond or money-market funds, so a fall in share markets applies to the whole portfolio. Broad share markets have fallen by more than 50% at times.", vars: {} });
  const leveraged = funds.filter((x) => x.category_slugs?.includes("leveraged-inverse"));
  if (leveraged.length) add({ id: "leveraged", area: "risk", severity: "high", title: "Leveraged or inverse funds", detail: "{names} reset their exposure every day. Over longer periods they can lose value even when the index ends higher.", vars: { names: leveraged.map((x) => x.name).join(", ") } });
  const tiny = funds.filter((x) => x.size_eur !== null && x.size_eur !== undefined && x.size_eur < 100e6);
  if (tiny.length) add({ id: "small-funds", area: "risk", severity: "medium", title: "Small funds", detail: "{names} manage under 100 million euro. Issuers close or merge small funds more often, which forces a sale at a time you did not choose.", vars: { names: tiny.map((x) => x.name).join(", ") } });
  const cutoff = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const young = funds.filter((x) => x.fund_launch_date && x.fund_launch_date > cutoff);
  if (young.length) add({ id: "young", area: "risk", severity: "low", title: "Funds younger than a year", detail: "{names} launched less than a year ago, so their tracking and costs have little history.", vars: { names: young.map((x) => x.name).join(", ") } });
  const nonEur = xray.currencies.filter((c) => c.label !== "EUR").reduce((s, c) => s + c.weight_pct, 0);
  if (xray.currencies.length && nonEur >= 80) add({ id: "currency", area: "risk", severity: "low", title: "Mostly outside the euro", detail: "{pct}% of the companies seen through are priced in other currencies. A stronger euro lowers your value, a weaker euro raises it.", vars: { pct: n(nonEur, 0) } });
  if (lens === "FR") {
    const dist = funds.filter((x) => x.distribution_policy === "distributing");
    if (dist.length) add({ id: "fr-distributing", area: "costs", severity: "low", title: "Distributing funds and French tax", detail: "{names} pay out income. In a compte-titres each payment is taxed in the year it arrives, while accumulating funds defer tax to the sale. In a PEA this matters little.", vars: { names: dist.map((x) => x.name).join(", ") } });
  }
  if (insight.look.covered_pct < 60) add({ id: "coverage", area: "data", severity: "low", title: "Partly seen through", detail: "We hold holdings files for funds making up {pct}% of the portfolio. Findings about companies, countries and sectors cover that part only.", vars: { pct: n(insight.look.covered_pct, 0) } });
  if (insight.unvalued.length) add({ id: "unvalued", area: "data", severity: "low", title: "Positions left out", detail: "{names} have no NAV on file, so they are not in these figures.", vars: { names: insight.unvalued.join(", ") } });

  f.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  const weaknesses = f.filter((x) => x.area !== "data").slice(0, 3);

  // Options to simplify: where two funds overlap heavily or share an index, keeping one of them changes little.
  const options: SimplifyOption[] = [];
  const pairs: [string, string][] = [
    ...insight.overlaps.filter((o) => o.overlap_pct >= 60).map((o) => [o.a, o.b] as [string, string]),
    ...[...sameIndex.keys()].flatMap((slug) => { const xs = funds.filter((x) => x.index_slug === slug); return xs.slice(1).map((x) => [xs[0].key, x.key] as [string, string]); }),
  ];
  const seen = new Set<string>();
  for (const [ka, kb] of pairs) {
    const a = funds.find((x) => x.key === ka), b = funds.find((x) => x.key === kb);
    const pairKey = [ka, kb].sort().join("|");
    if (!a || !b || seen.has(pairKey)) continue;
    seen.add(pairKey);
    // Keep the cheaper fund; on a tie, the larger one.
    const keepA = (a.headline_fee_pct ?? 9) < (b.headline_fee_pct ?? 9) || ((a.headline_fee_pct ?? 9) === (b.headline_fee_pct ?? 9) && (a.size_eur ?? 0) >= (b.size_eur ?? 0));
    const keep = keepA ? a : b, drop = keepA ? b : a;
    const moved = drop.value_eur;
    const switching = (moved * spreadPct * 2) / 100 + orderFeeEur * 2;
    const feeChange = keep.headline_fee_pct !== null && drop.headline_fee_pct !== null ? (moved * (keep.headline_fee_pct - drop.headline_fee_pct)) / 100 : null;
    options.push({ title: "Fold one fund into the other", detail: "Moving {drop} into {keep} would keep most of the exposure with one fund fewer.", vars: { keep: keep.name, drop: drop.name }, keep: keep.key, drop: drop.key, moved_eur: moved, switching_cost_eur: switching, yearly_fee_change_eur: feeChange });
  }
  return { findings: f, weaknesses, options, switching: { spread_pct: spreadPct, order_fee_eur: orderFeeEur }, summary: { funds: funds.length, value_eur: total, fee_pct: insight.fee_pct, covered_pct: insight.look.covered_pct } };
}
