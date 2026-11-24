import type { EtfRow } from "./queries";
import type { PeerPosition } from "./stats";
import { suitability } from "./suitability";
import { fundDomicile, usWithholdingRate, INDEX_US_SHARE, DEFAULT_YIELD, type Account } from "@/lib/tax/drag";

/**
 * Strengths and weaknesses of one ETF, measured against the funds on the same index (or theme) and, when the
 * reader has said where they live and which account they use, against that situation. Each point is a fixed
 * sentence with its numbers, built from data and stated rules, so it can be translated and checked.
 */
export type Point = { text: string; vars: Record<string, string> };
export type Assessment = { pros: Point[]; cons: Point[]; notes: Point[] };

const pct = (v: number, d = 2) => v.toFixed(d);

export function assessEtf(row: EtfRow, peers: PeerPosition | null, opts: { country?: string | null; account?: Account | null; usSharePct?: number | null } = {}): Assessment {
  const pros: Point[] = [], cons: Point[] = [], notes: Point[] = [];
  const g = peers?.group;
  const fee = row.headline_fee_pct;
  if (g && fee !== null && g.median !== null && peers?.feeRank) {
    const vs = { fee: pct(fee), median: pct(g.median), n: String(g.withFee), group: g.label };
    if (peers.feeRank === 1) pros.push({ text: "Cheapest of the {n} funds on {group} with a fee on file: {fee}% against a median of {median}%.", vars: vs });
    else if (fee <= g.median * 0.8) pros.push({ text: "Cheaper than most: {fee}% against a median of {median}% for the {n} funds on {group}.", vars: vs });
    else if (fee >= g.median * 1.25) cons.push({ text: "More expensive than most: {fee}% against a median of {median}% for the {n} funds on {group}.", vars: vs });
    else notes.push({ text: "Fee close to the median: {fee}% against {median}% for the {n} funds on {group}.", vars: vs });
  }
  const size = row.size_eur ?? null;
  if (peers?.sizeRank && size) {
    const v = { rank: String(peers.sizeRank), n: String(peers.withSize), group: g!.label, size: (size / 1e6).toFixed(0) };
    if (peers.sizeRank === 1) pros.push({ text: "Largest of the {n} funds on {group} with a size on file, {size} million euro: usually the tightest spreads and the lowest risk of closure.", vars: v });
    else if (peers.sizeRank <= Math.max(1, Math.ceil(peers.withSize / 4))) pros.push({ text: "Among the largest: number {rank} of {n} by size on {group}.", vars: v });
  }
  if (size !== null && size < 100e6) cons.push({ text: "Small fund, {size} million euro: issuers close or merge small funds more often.", vars: { size: (size / 1e6).toFixed(0) } });
  if (row.fund_launch_date) {
    const years = (Date.now() - new Date(row.fund_launch_date).getTime()) / (365.25 * 864e5);
    if (years < 1) cons.push({ text: "Launched less than a year ago: little history of tracking and costs.", vars: {} });
    else if (years >= 10) pros.push({ text: "Long record: launched {years} years ago.", vars: { years: years.toFixed(0) } });
  }
  if ((row.venues ?? 0) >= 5) pros.push({ text: "Listed on {n} exchanges, which usually means more market makers.", vars: { n: String(row.venues) } });

  // Replication and where the fund holds US shares.
  const us = opts.usSharePct ?? (row.index_slug ? INDEX_US_SHARE[row.index_slug] ?? null : null);
  const wht = usWithholdingRate(row);
  const y = row.trailing_yield_pct ?? DEFAULT_YIELD[row.asset_class ?? ""] ?? 0;
  if (row.asset_class === "equity" && us !== null && us >= 50) {
    if (wht === 0) pros.push({ text: "Swap-based: no US withholding tax on the index's dividends, worth about {gain} points a year against an Irish physical fund.", vars: { gain: pct((y * us * 0.15) / 100) } });
    else if (wht === 15 && fundDomicile(row) === "IE") {
      cons.push({ text: "Physical Irish fund: 15% of the US dividends is withheld, about {cost} points a year.", vars: { cost: pct((y * us * 0.15) / 100) } });
      if (peers?.syntheticPeers) notes.push({ text: "{n} swap-based funds on the same index avoid this withholding.", vars: { n: String(peers.syntheticPeers) } });
    }
    else if (wht === 30) cons.push({ text: "Holds US shares physically from outside Ireland: 30% of the US dividends is withheld, about {cost} points a year.", vars: { cost: pct((y * us * 0.3) / 100) } });
  }
  if (row.replication === "synthetic_swap") notes.push({ text: "Uses a swap: the fund depends on its counterparty, which UCITS rules limit and require to post collateral.", vars: {} });
  if (row.hedged === true) notes.push({ text: "Currency-hedged: removes most of the currency effect, usually for a slightly higher cost.", vars: {} });

  const account = opts.account ?? null;
  const country = (opts.country ?? account?.country ?? "").toUpperCase();
  // Whether a private investor where the reader lives can usually buy it, and what to watch.
  const fit = suitability(row, country);
  for (const p of fit.points) (fit.level === "ok" ? notes : cons).push(p);
  if (country === "FR") {
    if (account?.id === "FR-PEA") {
      if (row.pea_eligible === true) pros.push({ text: "Listed by its issuer as eligible for a PEA.", vars: {} });
      else if (row.pea_eligible === false) cons.push({ text: "Not eligible for a PEA, according to its issuer.", vars: {} });
      else if (/\bPEA\b/.test(row.name)) notes.push({ text: "Its name says PEA: confirm eligibility in the KID.", vars: {} });
      else cons.push({ text: "PEA eligibility not on file: most ETFs on non-European indices cannot go in a PEA.", vars: {} });
    } else if (!account || account.id === "FR-CTO") {
      if (row.distribution_policy === "distributing") cons.push({ text: "Distributing: in a compte-titres each payout is taxed in the year it arrives.", vars: {} });
      else if (row.distribution_policy === "accumulating") pros.push({ text: "Accumulating: in a compte-titres, tax waits until you sell.", vars: {} });
    }
  }
  if (country === "IE" && row.distribution_policy === "distributing") cons.push({ text: "Distributing: each payout triggers exit tax in Ireland.", vars: {} });
  if (country === "BE" && row.distribution_policy === "accumulating") cons.push({ text: "Accumulating: in Belgium the stock exchange tax can reach 1.32% on each purchase and sale.", vars: {} });
  if (country === "DE" && row.asset_class === "equity") pros.push({ text: "Equity fund: 30% of income and gains exempt in Germany.", vars: {} });
  if (country === "GB" && account?.id !== "GB-ISA") notes.push({ text: "Check HMRC's reporting fund list before buying outside an ISA.", vars: {} });
  if (country === "AT") notes.push({ text: "Check that it reports to Austria (Meldefonds) on my.oekb.at.", vars: {} });
  if (row.verification !== "reviewed") notes.push({ text: "Figures read automatically from the issuer; not yet checked by a person.", vars: {} });
  return { pros, cons, notes };
}
