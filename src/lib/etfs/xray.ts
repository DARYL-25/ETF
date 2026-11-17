import type { LookThrough, Slice } from "./holdings";

import { CURRENCY_OF } from "./currency-of";

export const currencyOfCountry = (country: string) => CURRENCY_OF[country] ?? null;

const TECH = /tech|software|semiconductor|computer/i;
const US = /^united states$/i;

export type XRay = {
  /** Share of the whole portfolio in the ten largest underlying companies. */
  top10_pct: number;
  /** The three largest underlying companies and their combined weight. */
  top3: { names: string[]; pct: number };
  /** The heaviest single company. */
  largest: { name: string; pct: number } | null;
  /** Share in companies from the United States, over the part seen through. */
  us_pct: number | null;
  /** Share in technology sectors, over the part seen through. */
  tech_pct: number | null;
  currencies: Slice[];
  /** Plain sentences a reader can act on, each with its number. */
  insights: { text: string; vars: Record<string, string> }[];
};

const pct = (v: number) => v.toFixed(0);

/**
 * Reads a look-through: concentration, the United States share, technology and currencies. Percentages of
 * countries and sectors are rescaled to the part of the portfolio whose holdings are on file, and that part is
 * said in every sentence, so nothing is extrapolated silently.
 */
export function readXRay(look: LookThrough, fundCount: number): XRay {
  const holdings = look.holdings.filter((h) => !/cash|futures?|swap|collateral|money market/i.test(h.label));
  const top10 = holdings.slice(0, 10).reduce((s, h) => s + h.weight_pct, 0);
  const top3 = holdings.slice(0, 3);
  const top3pct = top3.reduce((s, h) => s + h.weight_pct, 0);
  const countryTotal = look.countries.reduce((s, c) => s + c.weight_pct, 0);
  const sectorTotal = look.sectors.reduce((s, c) => s + c.weight_pct, 0);
  const us = countryTotal ? (look.countries.filter((c) => US.test(c.label)).reduce((s, c) => s + c.weight_pct, 0) / countryTotal) * 100 : null;
  const tech = sectorTotal ? (look.sectors.filter((c) => TECH.test(c.label)).reduce((s, c) => s + c.weight_pct, 0) / sectorTotal) * 100 : null;
  const byCurrency = new Map<string, number>();
  for (const c of look.countries) {
    const ccy = currencyOfCountry(c.label) ?? "Other";
    byCurrency.set(ccy, (byCurrency.get(ccy) ?? 0) + c.weight_pct);
  }
  const currencies = [...byCurrency.entries()].map(([label, w]) => ({ label, weight_pct: countryTotal ? (w / countryTotal) * 100 : 0 })).sort((a, b) => b.weight_pct - a.weight_pct);

  const insights: XRay["insights"] = [];
  const covered = pct(look.covered_pct);
  if (top3.length === 3 && fundCount > 1 && top3pct >= 8) insights.push({ text: "{pct}% of your portfolio sits in {names} combined, across {funds} funds.", vars: { pct: top3pct.toFixed(1), names: top3.map((h) => h.label).join(", "), funds: String(fundCount) } });
  if (top10 >= 25) insights.push({ text: "The ten largest companies make up {pct}% of the portfolio.", vars: { pct: pct(top10) } });
  if (us !== null && us >= 50) insights.push({ text: "{pct}% of the part we can see through ({covered}% of the portfolio) is in US companies.", vars: { pct: pct(us), covered } });
  if (tech !== null && tech >= 25) insights.push({ text: "{pct}% of the part we can see through is in technology sectors.", vars: { pct: pct(tech) } });
  const nonEur = currencies.filter((c) => c.label !== "EUR").reduce((s, c) => s + c.weight_pct, 0);
  if (currencies.length && nonEur >= 60) insights.push({ text: "{pct}% of the companies seen through are priced in currencies other than the euro, so exchange rates move your value.", vars: { pct: pct(nonEur) } });
  return { top10_pct: top10, top3: { names: top3.map((h) => h.label), pct: top3pct }, largest: holdings[0] ? { name: holdings[0].label, pct: holdings[0].weight_pct } : null, us_pct: us, tech_pct: tech, currencies, insights };
}
