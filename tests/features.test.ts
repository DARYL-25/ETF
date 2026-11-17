import { describe, expect, it } from "vitest";
import { isValidIsin, parseDate, parseNumber, parsePositions, parseLoose } from "@/lib/portfolio/import";
import { drift } from "@/lib/portfolio/rebalance";
import { decodeShared, encodeShared } from "@/lib/portfolio/share";
import { changes } from "@/lib/portfolio/watch";
import { trueCost, measuredTracking, overHorizons } from "@/lib/tools/true-cost";
import { mixStats, simulate } from "@/lib/tools/simulate";
import { qualityScore } from "@/lib/etfs/quality";
import { readXRay } from "@/lib/etfs/xray";
import { reviewPortfolio } from "@/lib/portfolio/doctor";
import { answerLocally, type CopilotContext } from "@/lib/assistant/copilot";
import { envelopeFit } from "@/lib/tax/envelopes";
import type { PortfolioInsight } from "@/lib/etfs/portfolio";

describe("import", () => {
  it("checks ISIN check digits", () => {
    expect(isValidIsin("IE00B4L5Y983")).toBe(true);
    expect(isValidIsin("IE00B4L5Y984")).toBe(false);
    expect(isValidIsin("FR0010315770")).toBe(true);
  });
  it("reads numbers and dates the way brokers write them", () => {
    expect(parseNumber("1 234,56 €")).toBe(1234.56);
    expect(parseNumber("1.234,56")).toBe(1234.56);
    expect(parseNumber("1,234.56")).toBe(1234.56);
    expect(parseNumber("12,5")).toBe(12.5);
    expect(parseNumber("1,234,567")).toBe(1234567);
    expect(parseNumber("CHF 2'500.10")).toBe(2500.1);
    expect(parseDate("17/11/2026")).toBe("2026-11-17");
    expect(parseDate("2026-01-05")).toBe("2026-01-05");
    expect(parseDate("31/13/2026")).toBeNull();
  });
  it("finds columns by their French or English names", () => {
    const r = parsePositions("Libellé;Code ISIN;Quantité;PRU;Date\niShares Core MSCI World;IE00B4L5Y983;12,5;80,10;03/02/2025\nTotal;;;;\n");
    expect(r.rows).toEqual([{ line: 2, identifier: "IE00B4L5Y983", quantity: 12.5, price: 80.1, date: "2025-02-03", note: null, side: "buy", fee: null }]);
    expect(r.skipped).toHaveLength(1);
  });
  it("reads tab-separated cells copied from a spreadsheet", () => {
    const r = parsePositions("Ticker\tShares\nCSPX\t4\nEUNL\t10");
    expect(r.rows.map((x) => [x.identifier, x.quantity])).toEqual([["CSPX", 4], ["EUNL", 10]]);
  });
  it("takes ISINs and quantities out of statement text", () => {
    const r = parseLoose(["Amundi MSCI World IE00B4L5Y983 Qté 25 Cours 98,40", "Something else 12"]);
    expect(r.rows[0]).toMatchObject({ identifier: "IE00B4L5Y983", quantity: 25, price: 98.4 });
    expect(r.rows).toHaveLength(1);
  });
});

describe("rebalancing", () => {
  it("measures drift and the trades back to target", () => {
    const d = drift([{ key: "A", name: "A", value: 7000 }, { key: "B", name: "B", value: 3000 }], { A: 60, B: 40 }, 5);
    const a = d.rows.find((r) => r.key === "A")!;
    expect(a.drift_pts).toBeCloseTo(10);
    expect(a.trade).toBeCloseTo(-1000);
    expect(d.breached).toBe(true);
  });
  it("splits a contribution toward the targets without selling", () => {
    const d = drift([{ key: "A", name: "A", value: 7000 }, { key: "B", name: "B", value: 3000 }], { A: 60, B: 40 }, 5, 1000);
    expect(d.rows.find((r) => r.key === "B")!.contribution).toBeCloseTo(1000);
    expect(d.rows.find((r) => r.key === "A")!.contribution).toBeCloseTo(0);
  });
});

describe("sharing", () => {
  it("round-trips weights and drops anything else", () => {
    const code = encodeShared({ name: "Mon portefeuille", note: "Long terme", weights: [["IE00B4L5Y983", 80], ["IE00BKM4GZ66", 20]] });
    expect(decodeShared(code)).toEqual({ name: "Mon portefeuille", note: "Long terme", weights: [["IE00B4L5Y983", 80], ["IE00BKM4GZ66", 20]] });
    expect(decodeShared("not-base64!")).toBeNull();
  });
});

describe("watchlist changes", () => {
  const seen = { fee: 0.2, size: 1e9, name: "Fund A", seen_on: "2026-10-01" };
  it("reports fee changes, shrinking and closure", () => {
    expect(changes("A", seen, { fee: 0.12, size: 1e9, name: "Fund A" })[0].kind).toBe("fee_down");
    expect(changes("A", seen, { fee: 0.2, size: 5e8, name: "Fund A" })[0].kind).toBe("shrank");
    expect(changes("A", seen, null)[0].kind).toBe("missing");
    expect(changes("A", seen, { fee: 0.2, size: 1e9, name: "Fund A" })).toEqual([]);
  });
});

describe("true cost", () => {
  const base = { initial: 10000, monthly: 0, years: 10, grossPct: 6, feePct: 0.2, trackingPct: 0, spreadPct: 0, orderFee: 0, orderPct: 0, fxPct: 0, sellAtEnd: false };
  it("costs nothing when every cost is zero", () => {
    const r = trueCost({ ...base, feePct: 0 });
    expect(r.total_cost).toBeCloseTo(0);
    expect(r.final).toBeCloseTo(10000 * 1.06 ** 10, 0);
  });
  it("lets a better-tracking fund beat a cheaper one", () => {
    const a = trueCost({ ...base, feePct: 0.12, trackingPct: 0.15 }), b = trueCost({ ...base, feePct: 0.2, trackingPct: -0.05 });
    expect(b.final).toBeGreaterThan(a.final);
  });
  it("adds trading costs on every purchase", () => {
    const r = trueCost({ ...base, initial: 0, monthly: 100, orderFee: 1, spreadPct: 0.2, fxPct: 0.25, sellAtEnd: true });
    expect(r.parts.broker).toBeGreaterThan(120);
    expect(r.parts.spread).toBeGreaterThan(0);
    expect(r.parts.fx).toBeGreaterThan(0);
    expect(overHorizons(base).map((h) => h.years)).toEqual([5, 10, 20, 30]);
  });
  it("separates tracking from the fee difference", () => {
    expect(measuredTracking(0.3, 0.2, 0.1)).toBeCloseTo(0.2);
  });
});

describe("simulator", () => {
  it("blends assumptions with diversification", () => {
    const s = mixStats({ equity: 80, fixed_income: 20 });
    expect(s.returnPct).toBeCloseTo(6.2);
    expect(s.volPct).toBeLessThan(0.8 * 16 + 0.2 * 6);
  });
  it("is repeatable and orders its bands", () => {
    const x = { mix: { equity: 100 }, feePct: 0.2, initial: 1000, monthly: 500, years: 20, inflationPct: 2, withdrawMonthly: 0, withdrawYears: 0, paths: 500 };
    const a = simulate(x), b = simulate(x);
    expect(a.end.p50).toBe(b.end.p50);
    expect(a.end.p10).toBeLessThan(a.end.p50);
    expect(a.end.p50).toBeLessThan(a.end.p90);
    expect(a.end.p50Real).toBeLessThan(a.end.p50);
    expect(a.lastsPct).toBeNull();
    expect(a.contributed).toBe(1000 + 500 * 240);
  });
  it("runs a withdrawal phase", () => {
    const r = simulate({ mix: { equity: 60, fixed_income: 40 }, feePct: 0.2, initial: 300000, monthly: 0, years: 1, inflationPct: 2, withdrawMonthly: 1000, withdrawYears: 30, paths: 400 });
    expect(r.lastsPct).toBeGreaterThan(50);
    const harsh = simulate({ mix: { equity: 60, fixed_income: 40 }, feePct: 0.2, initial: 100000, monthly: 0, years: 1, inflationPct: 2, withdrawMonthly: 1500, withdrawYears: 30, paths: 400 });
    expect(harsh.lastsPct!).toBeLessThan(r.lastsPct!);
  });
});

describe("quality score", () => {
  const today = new Date("2026-11-17");
  it("needs cost and enough parts", () => {
    expect(qualityScore({ headline_fee_pct: null, size_eur: 1e9, fund_aum_eur: null, fund_launch_date: "2010-01-01", venues: 5 }, { today }).score).toBeNull();
  });
  it("rewards the cheapest, largest and oldest fund", () => {
    const good = qualityScore({ headline_fee_pct: 0.07, size_eur: 2e10, fund_aum_eur: null, fund_launch_date: "2010-01-01", venues: 6 }, { peerFees: [0.07, 0.12, 0.2, 0.3], behindBestPts: 0, today });
    const weak = qualityScore({ headline_fee_pct: 0.3, size_eur: 2e7, fund_aum_eur: null, fund_launch_date: "2026-06-01", venues: 1 }, { peerFees: [0.07, 0.12, 0.2, 0.3], behindBestPts: 0.6, today });
    expect(good.grade).toBe("A");
    expect(weak.score!).toBeLessThan(35);
  });
});

const look = {
  covered_pct: 100,
  holdings: [
    { holding_key: "a", label: "Apple", ticker: "AAPL", weight_pct: 9 }, { holding_key: "m", label: "Microsoft", ticker: "MSFT", weight_pct: 8.5 }, { holding_key: "n", label: "Nvidia", ticker: "NVDA", weight_pct: 8 },
    ...Array.from({ length: 7 }, (_, i) => ({ holding_key: `x${i}`, label: `Co ${i}`, ticker: null, weight_pct: 2 })),
  ],
  sectors: [{ label: "Information Technology", weight_pct: 45 }, { label: "Financials", weight_pct: 55 }],
  countries: [{ label: "United States", weight_pct: 80 }, { label: "Japan", weight_pct: 20 }],
};

function insight(): PortfolioInsight {
  const fund = (key: string, name: string, weight: number, fee: number, index: string) => ({ key, name, weight_pct: weight, value_eur: weight * 100, isin: key, headline_fee_pct: fee, size_eur: 5e9, distribution_policy: "accumulating", distribution_frequency: null, hedged: false, currency: "USD", nav_currency: "USD", index_slug: index, index_name: index, asset_class: "equity", pea_eligible: null, fund_launch_date: "2015-01-01", nav_return_1y: null, nav_return_3y: null, nav_return_5y: null, nav_return_as_of: null, replication: "physical", ucits: true, domicile: "IE", category_slugs: [], trailing_yield_pct: null });
  return {
    total_eur: 10000, weights: [], unvalued: [], fee_pct: 0.35, fee_known_pct: 100, yearly_cost_eur: 35,
    look, overlaps: [{ a: "W", b: "S", overlap_pct: 65 }], xray: readXRay(look, 3), allocation: [{ label: "equity", weight_pct: 100 }],
    funds: [fund("W", "World fund", 50, 0.2, "msci-world"), fund("S", "S&P fund", 30, 0.07, "sp-500"), fund("N", "Nasdaq fund", 20, 0.9, "nasdaq-100")],
  };
}

describe("x-ray and review", () => {
  it("states concentration across funds with its number", () => {
    const x = readXRay(look, 3);
    expect(x.top3.pct).toBeCloseTo(25.5);
    expect(x.us_pct).toBeCloseTo(80);
    expect(x.tech_pct).toBeCloseTo(45);
    expect(x.currencies[0]).toEqual({ label: "USD", weight_pct: 80 });
    expect(x.insights[0].vars.names).toBe("Apple, Microsoft, Nvidia");
  });
  it("finds weaknesses and an option to fold overlapping funds", () => {
    const r = reviewPortfolio({ insight: insight(), alternatives: { N: [{ key: "N2", name: "Cheaper Nasdaq", fee_pct: 0.3, size_eur: 1e9, same_fund: false }] } });
    expect(r.weaknesses).toHaveLength(3);
    expect(r.findings.map((f) => f.id)).toEqual(expect.arrayContaining(["overlap-W-S", "fee", "cheaper", "us", "tech", "top10"]));
    expect(r.options[0].keep).toBe("S");
    expect(r.options[0].switching_cost_eur).toBeCloseTo(5000 * 0.002 + 4);
    expect(JSON.stringify(r)).not.toMatch(/you should|buy |sell /i);
  });
  it("answers portfolio questions from the computed figures", () => {
    const i = insight();
    const ctx: CopilotContext = { insight: i, review: reviewPortfolio({ insight: i, alternatives: {} }), exposures: [{ key: "N", name: "Nasdaq fund", tech_pct: 60, us_pct: 97 }, { key: "W", name: "World fund", tech_pct: 25, us_pct: 70 }], moves: [], watch: [], alternatives: {} };
    expect(answerLocally("Which of my ETFs has the most technology?", ctx).lines[0].vars?.name).toBe("Nasdaq fund");
    expect(answerLocally("Suis-je trop exposé aux États-Unis ?", ctx).topic).toBe("us");
    expect(answerLocally("What happens if I invest 300 € more a month?", ctx).lines[0].vars?.extra).toBe("300");
    expect(answerLocally("Why is my portfolio down?", ctx).topic).toBe("moves");
  });
});

describe("envelopes", () => {
  it("only states PEA eligibility the data or the name supports", () => {
    expect(envelopeFit({ name: "Amundi PEA S&P 500", pea_eligible: null, ucits: true, isin: "FR0011871128", domicile: "FR" }, "FR")[0].status).toBe("likely");
    expect(envelopeFit({ name: "Some World ETF", pea_eligible: null, ucits: true, isin: "IE00B4L5Y983", domicile: "IE" }, "FR")[0].status).toBe("check");
    expect(envelopeFit({ name: "x", pea_eligible: true, ucits: true, isin: "x", domicile: "FR" }, "FR")[0].status).toBe("yes");
  });
});

describe("statement text", () => {
  it("does not take numbers in a fund's name for a quantity", () => {
    const r = parseLoose(["SPDR S&P 500 UCITS ETF Dist IE00B6YX5C33 Qté 6 Cours 758,56", "SPDR Trust US78462F1030 10 757,04"]);
    expect(r.rows.map((x) => [x.quantity, x.price])).toEqual([[6, 758.56], [10, 757.04]]);
  });
});

import { xirr, performance, netPositions, milestones } from "@/lib/portfolio/performance";
import { taxDrag, ACCOUNTS, fitsAccount, usWithholdingRate, accountById } from "@/lib/tax/drag";
import { replicationAdvice } from "@/lib/tax/replication";
import { aiChat } from "@/lib/ai/provider";

describe("performance", () => {
  it("solves XIRR for a simple doubling", () => {
    expect(xirr([{ date: "2020-01-01", amount: -100 }, { date: "2030-01-01", amount: 200 }])!).toBeCloseTo(Math.pow(2, 1 / 10) - 1, 3);
    expect(xirr([{ date: "2020-01-01", amount: -100 }])).toBeNull();
  });
  it("tracks average cost, realised gains and fees", () => {
    const p = performance([
      { key: "A", quantity: 10, price: 100, date: "2024-01-01", fee: 2 },
      { key: "A", quantity: 10, price: 120, date: "2025-01-01", fee: 2 },
      { key: "A", quantity: 5, price: 150, date: "2025-06-01", side: "sell", fee: 1 },
    ], { A: { nav: 160, currency: "EUR", name: "Fund A" } }, "2026-01-01");
    const a = p.funds[0];
    expect(a.held).toBe(15);
    expect(a.avgCost).toBeCloseTo((2204 - 5 * 110.2) / 15);
    expect(a.realised).toBeCloseTo(5 * 150 - 1 - 5 * 110.2);
    expect(a.fees).toBe(5);
    expect(a.xirr!).toBeGreaterThan(0.1);
    expect(p.currencies[0].gain).toBeCloseTo(15 * 160 + 749 - 2204);
  });
  it("nets sells and dates holding periods", () => {
    expect(netPositions([{ key: "A", quantity: 10, price: 1, date: "2024-01-01" }, { key: "A", quantity: 4, price: 1, date: "2025-01-01", side: "sell" }])).toEqual([{ key: "A", quantity: 6 }]);
    expect(milestones({ id: "FR-PEA" }, "2022-03-10", [], 5, false, "2026-11-17")).toEqual([{ key: null, from: "2022-03-10", date: "2027-03-10", passed: false }]);
    expect(milestones({ id: "IE-BROKER" }, null, [{ key: "A", quantity: 1, price: 1, date: "2018-05-01" }], 8, true, "2026-11-17")[0].passed).toBe(true);
  });
});

describe("tax drag", () => {
  const row = { headline_fee_pct: 0.07, distribution_policy: "distributing", replication: "physical_full", isin: "IE00B5BMR087", domicile: "IE", asset_class: "equity", index_slug: "sp-500", trailing_yield_pct: null, name: "Example S&P 500 UCITS ETF" };
  const cto = ACCOUNTS.find((a) => a.id === "FR-CTO")!, pea = ACCOUNTS.find((a) => a.id === "FR-PEA")!;
  it("adds US withholding and yearly tax on payouts in a taxable account", () => {
    const d = taxDrag({ row, account: cto });
    expect(d.parts.find((p) => p.id === "withholding")!.pct).toBeCloseTo(1.5 * 0.15);
    expect(d.parts.find((p) => p.id === "income")!.pct).toBeCloseTo(1.5 * 0.314);
    expect(taxDrag({ row, account: pea }).parts.find((p) => p.id === "income")).toBeUndefined();
  });
  it("knows synthetic funds avoid US withholding and US funds cannot go in EU accounts", () => {
    expect(usWithholdingRate({ ...row, replication: "synthetic_swap" })).toBe(0);
    expect(usWithholdingRate({ ...row, isin: "LU0000000000" })).toBe(30);
    expect(fitsAccount({ name: "SPY", pea_eligible: null, ucits: null, isin: "US78462F1030" }, cto)).toBe("no");
  });
  it("advises synthetic for US shares and in a PEA for non-European indices", () => {
    expect(replicationAdvice({ usSharePct: 100, european: false, account: cto, yieldPct: 1.5 }).verdict).toBe("synthetic");
    expect(replicationAdvice({ usSharePct: 0, european: true, account: cto, yieldPct: 3 }).verdict).toBe("physical");
    expect(replicationAdvice({ usSharePct: 70, european: false, account: pea, yieldPct: 1.5 }).points[0].text).toMatch(/PEA/);
  });
});

describe("AI provider", () => {
  it("speaks the OpenAI-compatible format for open-source models, tools included", async () => {
    const seen: { url: string; body: Record<string, unknown> }[] = [];
    const fake = (async (url: string, init: { body: string }) => {
      seen.push({ url, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ choices: [{ message: { content: null, tool_calls: [{ id: "c1", function: { name: "search_etfs", arguments: "{\"request\":\"S&P 500\"}" } }] } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await aiChat({ system: "S", turns: [{ role: "user", text: "hi" }], tools: [{ name: "search_etfs", description: "d", input_schema: { type: "object" } }], config: { provider: "openai", model: "qwen3:14b", baseUrl: "http://localhost:11434/v1", key: null }, fetchFn: fake });
    expect(seen[0].url).toBe("http://localhost:11434/v1/chat/completions");
    expect((seen[0].body.messages as { role: string }[])[0].role).toBe("system");
    expect(r).toEqual({ ok: true, text: "", toolCalls: [{ id: "c1", name: "search_etfs", input: { request: "S&P 500" } }] });
  });
});

describe("import of sales and fees", () => {
  it("reads the operation and fee columns, and negative quantities as sales", () => {
    const r = parsePositions("ISIN;Sens;Quantité;Cours;Frais;Date\nIE00B4L5Y983;Achat;10;80;1,50;03/02/2025\nIE00B4L5Y983;Vente;4;95;1;05/06/2026");
    expect(r.rows.map((x) => [x.side, x.quantity, x.fee])).toEqual([["buy", 10, 1.5], ["sell", 4, 1]]);
    expect(parsePositions("ISIN\tQty\nIE00B4L5Y983\t-3").rows[0]).toMatchObject({ side: "sell", quantity: 3 });
  });
});

describe("account fit for funds listed outside Europe", () => {
  it("excludes a fund with no ISIN that is not UCITS outside Switzerland", () => {
    const row = { name: "iShares S&P 500 ETF", isin: null, ucits: null, pea_eligible: null };
    expect(fitsAccount(row as never, accountById("FR-CTO"))).toBe("no");
    expect(fitsAccount(row as never, accountById("CH-SEC"))).toBe("check");
  });
});
