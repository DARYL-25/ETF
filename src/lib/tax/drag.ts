import type { EtfRow } from "@/lib/etfs/queries";
import { taxCountry } from "./content";

/**
 * What an ETF costs a year once tax is counted, for one country and one account. An estimate built from
 * stated rules and assumptions the reader can see and change, never a calculation of anyone's tax bill:
 *
 * - the fund's own fee;
 * - US dividend withholding lost inside the fund: 15% for an Irish fund holding US shares physically, 30%
 *   for one domiciled elsewhere in Europe, nothing for a swap-based fund (US rule 871(m)), 15% for a
 *   US-domiciled fund;
 * - yearly tax on the fund's income in the account: on payouts, and on retained income where the country
 *   taxes it anyway (Switzerland, Austria);
 * - for Belgium, the stock exchange tax on the purchase and the sale, spread over the holding period.
 *
 * Tax on the gain when you sell is not spread into this figure: it depends on the result, and is described
 * separately with the account's holding periods.
 */
export type Account = {
  id: string; country: string; label: string;
  /** The tax notes' account this follows, for its holding period. */
  wrapper?: string;
  /** Yearly tax on income paid out, in percent. Null when it depends on the reader's own rate. */
  incomeRate: number | null;
  /** Whether income kept by an accumulating fund is taxed each year too. */
  taxesRetained: boolean;
  sheltered: boolean;
  note: string;
};

export const ACCOUNTS: Account[] = [
  { id: "FR-PEA", country: "FR", label: "PEA", wrapper: "PEA", incomeRate: 0, taxesRetained: false, sheltered: true, note: "Income stays in the plan; after five years gains are free of income tax, social levies apply." },
  { id: "FR-CTO", country: "FR", label: "Compte-titres ordinaire", wrapper: "Compte-titres ordinaire", incomeRate: 31.4, taxesRetained: false, sheltered: false, note: "Payouts taxed at the 31.4% flat tax each year; gains at the sale." },
  { id: "FR-AV", country: "FR", label: "Assurance-vie", wrapper: "Assurance-vie", incomeRate: 0, taxesRetained: false, sheltered: true, note: "Income stays in the contract; gains taxed on withdrawal, lighter after eight years." },
  { id: "FR-PER", country: "FR", label: "PER", wrapper: "PER", incomeRate: 0, taxesRetained: false, sheltered: true, note: "Income stays in the plan, locked until retirement." },
  { id: "CH-SEC", country: "CH", label: "Securities account", incomeRate: null, taxesRetained: true, sheltered: false, note: "Fund income taxed every year at your income tax rate, paid out or not; gains tax-free for a private investor." },
  { id: "CH-3A", country: "CH", label: "Pillar 3a", incomeRate: 0, taxesRetained: false, sheltered: true, note: "Only a 3a provider's own funds." },
  { id: "GB-ISA", country: "GB", label: "Stocks and shares ISA", wrapper: "Stocks and shares ISA", incomeRate: 0, taxesRetained: false, sheltered: true, note: "Income and gains free of UK tax." },
  { id: "GB-GIA", country: "GB", label: "General investment account", wrapper: "General investment account", incomeRate: null, taxesRetained: true, sheltered: false, note: "Distributions and reported income taxed at your dividend rate; check reporting fund status." },
  { id: "DE-DEPOT", country: "DE", label: "Securities account (Depot)", wrapper: "Securities account (Depot)", incomeRate: 26.375, taxesRetained: false, sheltered: false, note: "Flat withholding tax with solidarity surcharge, after the partial exemption; accumulating funds also pay the small yearly Vorabpauschale, not counted here." },
  { id: "IE-BROKER", country: "IE", label: "Broker account", wrapper: "Broker account", incomeRate: 38, taxesRetained: false, sheltered: false, note: "Exit tax on payouts, on sales and every eight years on the gain so far." },
  { id: "BE-SEC", country: "BE", label: "Securities account", wrapper: "Securities account", incomeRate: 30, taxesRetained: false, sheltered: false, note: "Withholding tax on payouts and the stock exchange tax on each trade." },
  { id: "ES-SEC", country: "ES", label: "Securities account", wrapper: "Securities account", incomeRate: null, taxesRetained: false, sheltered: false, note: "Payouts and gains taxed in the savings base at progressive rates." },
  { id: "IT-SEC", country: "IT", label: "Securities account (regime amministrato)", wrapper: "Securities account (regime amministrato)", incomeRate: 26, taxesRetained: false, sheltered: false, note: "26% on payouts and gains of harmonised funds." },
  { id: "LU-SEC", country: "LU", label: "Securities account", wrapper: "Securities account", incomeRate: null, taxesRetained: false, sheltered: false, note: "Gains exempt after six months for holdings below 10% of a company; payouts declared as income." },
  { id: "NL-SEC", country: "NL", label: "Securities account", wrapper: "Securities account", incomeRate: 0, taxesRetained: false, sheltered: false, note: "Box 3: taxed each year on an assumed return on what you own, not on payouts or gains." },
  { id: "AT-SEC", country: "AT", label: "Securities account", wrapper: "Securities account", incomeRate: 27.5, taxesRetained: true, sheltered: false, note: "27.5% on payouts and on income an accumulating fund keeps, every year." },
];

export const accountsFor = (country: string | null | undefined) => ACCOUNTS.filter((a) => a.country === (country ?? "").toUpperCase());
export const accountById = (id: string | null | undefined) => ACCOUNTS.find((a) => a.id === id) ?? null;

/** The reader's own rate where the account's rate depends on it, as a starting point they can change. */
export const DEFAULT_OWN_RATE: Record<string, number> = { "CH-SEC": 25, "GB-GIA": 10.75, "ES-SEC": 21 };

/** Typical dividend yields by asset class, used only when the fund's own yield is not on file. Editable. */
export const DEFAULT_YIELD: Record<string, number> = { equity: 1.5, fixed_income: 3, money_market: 2, commodities: 0 };

/** Share of US companies in common indices, when the fund's holdings are not on file. Approximate. */
export const INDEX_US_SHARE: Record<string, number> = { "sp-500": 100, "nasdaq-100": 100, "msci-usa": 100, "msci-world": 70, "ftse-developed": 65, "msci-acwi": 63, "ftse-all-world": 62, "msci-world-information-technology": 85 };

export type DragPart = { id: "fee" | "withholding" | "income" | "stamp"; label: string; pct: number; basis: string; vars: Record<string, string> };
export type Drag = { totalPct: number; parts: DragPart[]; assumptions: { yieldPct: number; usSharePct: number | null; incomeRate: number | null }; unknown: string[] };

export type DragInput = {
  row: Pick<EtfRow, "headline_fee_pct" | "distribution_policy" | "replication" | "isin" | "domicile" | "asset_class" | "index_slug" | "trailing_yield_pct" | "name">;
  account: Account | null;
  /** Percent of the fund in US companies, from its holdings when known. */
  usSharePct?: number | null;
  yieldPct?: number | null;
  /** The reader's own income or dividend rate, for accounts whose rate depends on it. */
  ownRate?: number | null;
  holdingYears?: number;
};

const synthetic = (r: DragInput["row"]) => r.replication === "synthetic_swap" || /\bswap\b/i.test(r.name);
export const fundDomicile = (r: Pick<EtfRow, "isin" | "domicile">) => (r.isin ? r.isin.slice(0, 2) : r.domicile) ?? null;

/** Rate of US dividend withholding a fund loses, by how and where it holds US shares. */
export function usWithholdingRate(r: DragInput["row"]): number | null {
  if (r.asset_class && r.asset_class !== "equity") return 0;
  if (synthetic(r)) return 0;
  const dom = fundDomicile(r);
  if (dom === "IE") return 15;
  if (dom === "US") return 15;
  if (dom === "LU" || dom === "FR" || dom === "DE") return 30;
  return null;
}

export function taxDrag({ row, account, usSharePct, yieldPct, ownRate, holdingYears = 10 }: DragInput): Drag {
  const parts: DragPart[] = [];
  const unknown: string[] = [];
  const fee = row.headline_fee_pct ?? null;
  if (fee === null) unknown.push("No fee on file");
  parts.push({ id: "fee", label: "Fund fee", pct: fee ?? 0, basis: "The fund's yearly charge", vars: {} });
  const y = yieldPct ?? row.trailing_yield_pct ?? DEFAULT_YIELD[row.asset_class ?? ""] ?? 0;
  const us = usSharePct ?? (row.index_slug ? INDEX_US_SHARE[row.index_slug] ?? null : null);
  const wht = usWithholdingRate(row);
  if (row.asset_class === "equity" || !row.asset_class) {
    if (us === null || wht === null) unknown.push("US dividend withholding inside the fund");
    else parts.push({ id: "withholding", label: "US dividend tax lost inside the fund", pct: (y * (us / 100) * wht) / 100, basis: wht === 0 ? "Swap-based: no US withholding on the index's dividends" : "{rate}% withheld on the dividends of the {us}% in US companies", vars: { rate: String(wht), us: us.toFixed(0) } });
  }
  if (account) {
    const rate = account.incomeRate ?? ownRate ?? DEFAULT_OWN_RATE[account.id] ?? null;
    const taxedEachYear = !account.sheltered && (row.distribution_policy === "distributing" || account.taxesRetained);
    let eff = rate;
    // German equity funds: 30% of income exempt.
    if (account.country === "DE" && rate !== null && row.asset_class === "equity") eff = rate * 0.7;
    if (rate === null) unknown.push("Your income tax rate");
    else if (taxedEachYear) parts.push({ id: "income", label: "Yearly tax on the fund's income", pct: (y * eff!) / 100, basis: row.distribution_policy === "distributing" ? "{rate}% on a {yield}% payout" : "{rate}% on {yield}% of income kept by the fund, taxed each year here", vars: { rate: eff!.toFixed(1), yield: y.toFixed(1) } });
    else if (!row.distribution_policy && !account.sheltered) unknown.push("Whether the fund pays out its income");
    if (account.country === "BE") {
      const tob = row.distribution_policy === "accumulating" ? 1.32 : 0.12;
      parts.push({ id: "stamp", label: "Stock exchange tax, spread over the years held", pct: (2 * tob) / Math.max(1, holdingYears), basis: "{rate}% on the purchase and on the sale, over {years} years", vars: { rate: tob.toFixed(2), years: String(holdingYears) } });
    }
  }
  return { totalPct: parts.reduce((s, p) => s + p.pct, 0), parts, assumptions: { yieldPct: y, usSharePct: us, incomeRate: account ? account.incomeRate ?? ownRate ?? DEFAULT_OWN_RATE[account.id] ?? null : null }, unknown };
}

/** Whether a fund can go in an account, from facts we hold. */
export function fitsAccount(row: Pick<EtfRow, "name" | "pea_eligible" | "ucits" | "isin">, account: Account | null): "yes" | "likely" | "check" | "no" {
  if (!account) return "yes";
  const usDomiciled = row.isin?.startsWith("US");
  if (account.id === "FR-PEA") return row.pea_eligible === true ? "yes" : row.pea_eligible === false ? "no" : /\bPEA\b/.test(row.name) ? "likely" : "check";
  if (account.id === "FR-AV" || account.id === "FR-PER" || account.id === "CH-3A") return "check";
  // EU and UK retail investors generally cannot buy US-domiciled ETFs, which publish no KID.
  if (usDomiciled && account.country !== "CH") return "no";
  // Funds listed only outside Europe (no ISIN, not UCITS) cannot be bought by EU or UK retail investors either.
  const offshore = row.ucits === false || (!row.isin && row.ucits !== true);
  if (offshore) return account.country === "CH" ? "check" : "no";
  return "yes";
}

/** The account's holding period, from the country's tax notes. */
export function holdingFor(account: Account | null) {
  if (!account?.wrapper) return null;
  return taxCountry(account.country)?.wrappers.find((w) => w.name === account.wrapper)?.holding ?? null;
}
