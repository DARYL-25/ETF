import type { Account } from "./drag";
import { holdingFor } from "./drag";
import type { FundPerf, Lot } from "@/lib/portfolio/performance";

/**
 * Tax points about the reader's own positions: when a holding period ends, what selling today would roughly
 * cost, and where a different account or share class would be lighter. Built only from the rules in the tax
 * notes and the reader's own figures. Estimates, never a tax calculation, and never an instruction to trade.
 */
export type TaxPoint = { id: string; level: "act" | "wait" | "info"; text: string; vars: Record<string, string>; key?: string };
export type FundTaxFacts = { key: string; name: string; distribution_policy: string | null; asset_class: string | null; pea_eligible: boolean | null };

/** Rate on a gain at sale, where the account's rule gives one figure. Null where it depends on the person. */
export function gainRate(account: Account, assetClass: string | null): number | null {
  switch (account.id) {
    case "FR-CTO": return 31.4;
    case "IT-SEC": return 26;
    case "AT-SEC": return 27.5;
    case "IE-BROKER": return 38;
    case "DE-DEPOT": return assetClass === "equity" ? 26.375 * 0.7 : 26.375;
    case "CH-SEC": return 0;
    case "GB-ISA": return 0;
    default: return null;
  }
}

const DAY = 864e5;
const addYears = (date: string, years: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() + years); return d.toISOString().slice(0, 10); };
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
const money = (v: number) => Math.round(v).toLocaleString("en-GB");

export function taxPoints({ account, opened, lots, funds, facts, today = new Date().toISOString().slice(0, 10) }: { account: Account | null; opened: string | null; lots: Lot[]; funds: FundPerf[]; facts: FundTaxFacts[]; today?: string }): TaxPoint[] {
  const out: TaxPoint[] = [];
  if (!account) {
    out.push({ id: "no-account", level: "info", text: "Choose the account these funds sit in, under Account and tax clock, to see when tax relief starts and what selling would cost.", vars: {} });
    return out;
  }
  const holding = holdingFor(account);
  const held = funds.filter((f) => f.held > 0);
  const fact = (key: string) => facts.find((f) => f.key === key);

  // Holding periods: the plan's clock (PEA, assurance-vie) or each purchase's clock (Irish deemed disposal).
  if (holding?.years) {
    if (account.id === "IE-BROKER") {
      for (const l of lots.filter((x) => x.side !== "sell")) {
        const due = addYears(l.date, holding.years), left = days(today, due);
        if (left > 0 && left <= 400) out.push({ id: `ie-${l.key}-${l.date}`, key: l.key, level: "act", text: "{name}: the units bought on {date} reach eight years on {due}, when exit tax is due on their gain so far, sold or not. Plan the cash for it.", vars: { name: fact(l.key)?.name ?? l.key, date: l.date, due } });
      }
    } else if (opened) {
      const due = addYears(opened, holding.years), left = days(today, due);
      if (left > 0) out.push({ id: "clock", level: "wait", text: "Your {account} reaches {years} years on {due}, in {months} months. {effect} Withdrawing before then loses that advantage.", vars: { account: account.label, years: String(holding.years), due, months: String(Math.max(1, Math.round(left / 30.4))), effect: holding.effect } });
      else out.push({ id: "clock", level: "info", text: "Your {account} passed {years} years on {due}. {effect}", vars: { account: account.label, years: String(holding.years), due, effect: holding.effect } });
    } else {
      out.push({ id: "clock-missing", level: "info", text: "Enter the date the account was opened: its tax advantages start {years} years after that date.", vars: { years: String(holding.years) } });
    }
  }

  // What selling today would cost, where the account taxes the gain at one rate.
  for (const f of held) {
    const fx = fact(f.key);
    const rate = gainRate(account, fx?.asset_class ?? null);
    if (f.unrealised === null) continue;
    if (f.unrealised > 0 && rate && !account.sheltered) {
      out.push({ id: `gain-${f.key}`, key: f.key, level: "info", text: "{name}: selling all of it today would realise a gain of about {gain} {ccy}, taxed at about {rate}%: roughly {tax} {ccy}. Switching to another ETF has that cost too.", vars: { name: f.name, gain: money(f.unrealised), ccy: f.currency ?? "", rate: rate.toFixed(1), tax: money((f.unrealised * rate) / 100) } });
    }
    if (f.unrealised < 0 && !account.sheltered && account.id === "FR-CTO") {
      out.push({ id: `loss-${f.key}`, key: f.key, level: "act", text: "{name} shows a loss of about {loss} {ccy}. In a compte-titres, a realised loss can be set against gains of the same year and the ten following years.", vars: { name: f.name, loss: money(-f.unrealised), ccy: f.currency ?? "" } });
    }
    if (account.id === "CH-SEC" && f.unrealised > 0) out.push({ id: `ch-${f.key}`, key: f.key, level: "info", text: "{name}: for a private investor in Switzerland the gain of about {gain} {ccy} is not taxed when you sell, so tax is no reason to hold on.", vars: { name: f.name, gain: money(f.unrealised), ccy: f.currency ?? "" } });
  }

  // Account fit and share class.
  for (const f of held) {
    const fx = fact(f.key);
    if (!fx) continue;
    if (account.id === "FR-PEA" && fx.pea_eligible === false) out.push({ id: `pea-${f.key}`, key: f.key, level: "act", text: "{name} is not listed as PEA-eligible by its issuer. Check before buying more in the plan: an ineligible holding can put the plan at risk.", vars: { name: fx.name } });
    if (account.id === "FR-CTO" && (fx.pea_eligible === true || /\bPEA\b/.test(fx.name))) out.push({ id: `cto-pea-${f.key}`, key: f.key, level: "act", text: "{name} can be held in a PEA. Future purchases there would be free of income tax on gains after five years, instead of the 31.4% flat tax here.", vars: { name: fx.name } });
    if (!account.sheltered && fx.distribution_policy === "distributing" && ["FR-CTO", "IT-SEC", "ES-SEC", "BE-SEC", "DE-DEPOT"].includes(account.id)) {
      out.push({ id: `dist-${f.key}`, key: f.key, level: "info", text: "{name} pays out its income, which is taxed each year in this account. An accumulating share class of the same fund would reinvest it and defer the tax to the sale.", vars: { name: fx.name } });
    }
  }
  if (account.id === "LU-SEC") {
    for (const l of lots.filter((x) => x.side !== "sell")) {
      const due = new Date(`${l.date}T00:00:00Z`); due.setUTCMonth(due.getUTCMonth() + 6);
      const d = due.toISOString().slice(0, 10), left = days(today, d);
      if (left > 0) out.push({ id: `lu-${l.key}-${l.date}`, key: l.key, level: "wait", text: "{name}: the units bought on {date} pass six months on {due}. Sold before then, their gain is taxed at your income tax rate; after it, it is exempt for a holding below 10% of a company.", vars: { name: fact(l.key)?.name ?? l.key, date: l.date, due: d } });
    }
  }
  if (account.id === "NL-SEC") out.push({ id: "nl-box3", level: "info", text: "In box 3 you are taxed on an assumed return on what you own, so selling, waiting or switching funds does not change the tax. Keep your figures: in a weak year you can claim the lower actual return.", vars: {} });
  if (account.id === "BE-SEC") out.push({ id: "tob", level: "info", text: "Each purchase and sale pays the stock exchange tax: 1.32% for most accumulating funds, 0.12% for distributing ones. Fewer, larger trades keep it down.", vars: {} });
  if (account.id === "DE-DEPOT") out.push({ id: "de-allowance", level: "info", text: "Give your bank an exemption order so the yearly saver's allowance is used before tax is withheld.", vars: {} });
  if (account.id === "GB-GIA") out.push({ id: "gb-isa", level: "act", text: "Each tax year, moving up to your ISA allowance from this account into a stocks and shares ISA shelters future gains and income. Selling to move it uses your capital gains allowance first.", vars: {} });
  return out;
}
