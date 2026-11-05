import { query } from "@/lib/db/client";
import type { EtfRow } from "@/lib/etfs/queries";
import { EU_EEA, type Intent } from "./intent";

export type Ranked = { row: EtfRow; score: number; reasons: string[]; cautions: string[]; onSix: boolean };
export type SearchOutcome = {
  intent: Intent;
  total: number;
  results: Ranked[];
  applied: string[];
  notChecked: string[];
};

const LEVERED = /\b(2x|3x|ultra|ultrapro|short|inverse|leveraged|bear|bull|daily|covered call|buffer|autocallable)\b/i;
const isHedged = (name: string) => /\b(hdg|hedged|hd)\b/i.test(name);
const isSynthetic = (row: EtfRow) => row.replication === "synthetic_swap" || /\bswap\b/i.test(row.name);
const policyOf = (row: EtfRow) => row.distribution_policy ?? (/\b(acc|accumulating|1c|cap)\b/i.test(row.name) ? "accumulating" : /\b(dist|distributing|inc|1d)\b/i.test(row.name) ? "distributing" : null);

/** Transparent scoring out of 100. Weights are ours, shown to the user, and are not advice. */
export function scoreRow(row: EtfRow, intent: Intent, onSix: boolean, feeRange: { min: number; max: number }): Ranked {
  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = 0;

  if (row.headline_fee_pct !== null) {
    const span = Math.max(feeRange.max - feeRange.min, 0.01);
    const points = 40 * (1 - (row.headline_fee_pct - feeRange.min) / span);
    score += points;
    reasons.push(`Fee ${row.headline_fee_pct.toFixed(2)}%${row.headline_fee_pct === feeRange.min ? ", lowest in this group" : ""}`);
  } else {
    cautions.push("No fee on file");
  }
  const size = row.fund_aum_eur ?? row.size_eur ?? null;
  if (size !== null) {
    score += Math.min(30, Math.max(0, (Math.log10(size) - 7) * 10)); // €10m = 0, €10bn = 30.
    if (size < 100e6) cautions.push("Small: below about €100m, which can raise closure risk");
    else reasons.push("Large enough to reduce closure risk");
  } else {
    cautions.push("No size on file");
  }
  if (row.nav_return_1y !== null || row.return_1y !== null) score += 5;
  if (row.ucits) { score += 10; reasons.push("UCITS"); }

  const europeanInvestor = intent.investorCountry === "Switzerland" || intent.investorCountry === "United Kingdom" || (intent.investorCountry && EU_EEA.has(intent.investorCountry));
  if (intent.investorCountry === "Switzerland") {
    if (onSix) { score += 10; reasons.push("Listed on SIX Swiss Exchange"); }
    if (isHedged(row.name) && !/chf/i.test(row.name)) cautions.push("Hedged to a currency other than CHF");
    if (/chf/i.test(row.name) && isHedged(row.name)) reasons.push("Hedged to CHF");
  }
  if (europeanInvestor && row.ucits !== true) cautions.push("Not marked UCITS: check that your broker can offer it to you");

  const policy = policyOf(row);
  if (intent.distribution && policy === intent.distribution) { score += 5; reasons.push(policy === "accumulating" ? "Accumulating" : "Distributing"); }
  if (isSynthetic(row)) cautions.push("Synthetic: adds swap counterparty risk");
  if (row.verification !== "reviewed") cautions.push("Figures not yet checked by a person");
  return { row, score: Math.round(score), reasons, cautions, onSix };
}

const COUNTRY_TAX = (c: string) => `Tax for a ${c} resident: country rules are not verified here yet, so no tax advantage counted in this ranking. Compare domicile and income treatment, and check with your tax authority or an adviser.`;

export async function findBestEtfs(intent: Intent, limit = 10): Promise<SearchOutcome> {
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (fragment: (n: number) => string, value: unknown) => { values.push(value); where.push(fragment(values.length)); };
  const applied: string[] = [];

  if (intent.index) { add((n) => `index_slug = $${n}`, intent.index); applied.push("Follows the index you named"); }
  if (intent.assetClass) { add((n) => `asset_class = $${n}`, intent.assetClass); applied.push("Asset class you named"); }
  for (const c of intent.categories.slice(0, 4)) { add((n) => `$${n} = any(category_slugs)`, c); }
  if (intent.categories.length) applied.push(`Labels: ${intent.categories.join(", ").replaceAll("-", " ")}`);
  if (intent.issuer) { add((n) => `(name ilike $${n} or issuer_name ilike $${n})`, `%${intent.issuer}%`); applied.push(`Issuer: ${intent.issuer}`); }
  if (intent.ucitsOnly) { where.push("ucits is true"); applied.push("UCITS only"); }
  for (const k of intent.keywords) add((n) => `name ilike $${n}`, `%${k.replace(/[\\%_]/g, "\\$&")}%`);
  if (intent.keywords.length) applied.push(`Name contains: ${intent.keywords.join(", ")}`);

  const candidates = await query<EtfRow>(`select * from public.etf_directory ${where.length ? `where ${where.join(" and ")}` : ""} order by fund_aum_eur desc nulls last limit 1500`, values);

  // EU retail investors generally need a KID, which US-domiciled funds often lack.
  const inEu = intent.investorCountry ? EU_EEA.has(intent.investorCountry) : false;
  let rows = candidates.filter((r) => !LEVERED.test(r.name));
  if (rows.length < candidates.length) applied.push("Left out leveraged, inverse and option-income funds");
  if (inEu) {
    const before = rows.length;
    rows = rows.filter((r) => r.ucits === true);
    if (rows.length < before) applied.push("UCITS only, because EU retail investors generally need a KID, which many US funds lack");
  }
  if (intent.distribution) {
    const before = rows.length;
    rows = rows.filter((r) => { const p = policyOf(r); return p === null || p === intent.distribution; });
    if (rows.length < before) applied.push(`${intent.distribution === "accumulating" ? "Accumulating" : "Distributing"}, or income treatment unknown`);
  }
  if (intent.hedged !== null) {
    rows = rows.filter((r) => isHedged(r.name) === intent.hedged);
    applied.push(intent.hedged ? "Currency hedged" : "Not currency hedged");
  }
  if (intent.replication) {
    rows = rows.filter((r) => (intent.replication === "synthetic" ? isSynthetic(r) : !isSynthetic(r)));
    applied.push(intent.replication === "synthetic" ? "Synthetic" : "Not synthetic");
  }

  const fees = rows.map((r) => r.headline_fee_pct).filter((f): f is number => f !== null);
  const feeRange = { min: fees.length ? Math.min(...fees) : 0, max: fees.length ? Math.max(...fees) : 1 };
  const results = rows
    .map((r) => scoreRow(r, intent, r.listed_on_six === true, feeRange))
    .sort((a, b) => b.score - a.score || (b.row.fund_aum_eur ?? b.row.size_eur ?? 0) - (a.row.fund_aum_eur ?? a.row.size_eur ?? 0))
    .slice(0, limit);

  const notChecked = [
    "Tracking difference, which needs index data we do not hold. It can matter more than the fee.",
    "Bid-ask spread and your broker's costs and availability.",
  ];
  if (intent.investorCountry) notChecked.unshift(COUNTRY_TAX(intent.investorCountry));
  if (intent.investorCountry === "Switzerland") notChecked.push("SIX listing comes from issuer files we hold, so a fund can be listed there without us showing it. Check SIX directly before ruling a fund out.");
  if (intent.index) notChecked.push("The link to an index is inferred from the name for most funds.");
  return { intent, total: rows.length, results, applied, notChecked };
}
