import { fundDomicile } from "./drag";
import { isEea } from "@/lib/lens";
import { suitability } from "@/lib/etfs/suitability";
import type { EtfRow } from "@/lib/etfs/queries";

/**
 * Which account an ETF can sit in, for a reader in France or Switzerland. Only what we can show from data or
 * from the fund's own name is stated as a fact; everything that depends on an insurer's or provider's list is
 * marked as a check. It is a filter on facts, not a suggestion of which account to use.
 */
export type Status = "yes" | "likely" | "check" | "no";
export type EnvelopeFit = { envelope: string; status: Status; reason: string };

export function envelopeFit(row: Pick<EtfRow, "name" | "pea_eligible" | "ucits" | "isin" | "domicile">, country: string | null | undefined): EnvelopeFit[] {
  if (country === "FR") {
    const dom = fundDomicile(row);
    const unavailable = suitability(row, "FR").level === "unavailable";
    const pea: EnvelopeFit = dom && !isEea(dom) ? { envelope: "PEA", status: "no", reason: "Domiciled outside the EU and EEA, so a PEA cannot hold it." }
      : row.pea_eligible === true ? { envelope: "PEA", status: "yes", reason: "The issuer lists it as eligible." }
      : row.pea_eligible === false ? { envelope: "PEA", status: "no", reason: "The issuer lists it as not eligible." }
      : /\bPEA\b/.test(row.name) ? { envelope: "PEA", status: "likely", reason: "Its name says PEA. Confirm in the KID." }
      : { envelope: "PEA", status: "check", reason: "Eligibility is not on file. Check the issuer's page." };
    return [
      pea,
      { envelope: "Compte-titres ordinaire", status: unavailable || row.ucits === false ? "check" : "yes", reason: unavailable ? "Allowed in principle, but brokers in the EU generally do not sell it to private investors." : row.ucits === false ? "Not marked UCITS: many brokers cannot offer it to retail clients in the EU." : "Any ETF your broker offers." },
      { envelope: "Assurance-vie", status: "check", reason: "Only if your insurer lists it among the contract's units." },
      { envelope: "PER", status: "check", reason: "Only if the plan's provider offers it." },
    ];
  }
  if (country === "CH") {
    return [
      { envelope: "Securities account", status: row.ucits === false && row.isin?.startsWith("US") ? "check" : "yes", reason: row.isin?.startsWith("US") ? "US-domiciled: check your broker and the US estate tax question." : "Any ETF your bank or broker offers." },
      { envelope: "Pillar 3a", status: "check", reason: "Only through a 3a provider's own fund range." },
    ];
  }
  return [];
}

/** The French accounts side by side, on the points that matter for an ETF investor. Facts come from the tax notes and their sources. */
export const FR_ENVELOPES: { name: string; deposits: string; etfs: string; income: string; exit: string; access: string }[] = [
  { name: "PEA", deposits: "Capped at €150,000", etfs: "Only eligible funds, which keep at least 75% in eligible European shares", income: "No tax while it stays in the plan", exit: "After five years, gains are free of income tax; social levies apply", access: "A withdrawal before five years normally closes the plan" },
  { name: "Compte-titres ordinaire", deposits: "No limit", etfs: "Any ETF the broker offers", income: "Dividends taxed each year at the flat tax", exit: "Gains taxed at the flat tax when you sell, or on option at the income tax scale", access: "Money available at any time" },
  { name: "Assurance-vie", deposits: "No legal limit", etfs: "Only the units the insurer offers", income: "No tax while it stays in the contract", exit: "Gains taxed on withdrawal, with an allowance after eight years", access: "Money available, usually within days" },
  { name: "PER", deposits: "Payments deductible within a yearly ceiling", etfs: "Only what the provider offers", income: "No tax while it stays in the plan", exit: "Depends on whether payments were deducted, and on capital or annuity", access: "Locked until retirement, apart from early releases set by law" },
];

/** Questions to settle before moving abroad with French accounts. Not answered here: they depend on the new country and its treaty with France. */
export const RESIDENCE_CHANGE_CHECKS: string[] = [
  "Whether your PEA can stay open and take payments once you are no longer resident in France, and what happens on withdrawal.",
  "How the new country taxes gains and income inside an assurance-vie or a PER, which it may not recognise as special accounts.",
  "Whether your broker can keep serving you as a resident of the new country, and whether you must declare foreign accounts there.",
  "Which country taxes gains realised in the year you move, under the tax treaty between the two countries.",
  "Whether the new country taxes accumulating funds' income each year, as Switzerland does, even when nothing is paid out.",
];
