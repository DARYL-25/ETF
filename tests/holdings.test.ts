import { describe, expect, it } from "vitest";
import { query } from "@/lib/db/client";
import { getBreakdown, getHolders, getHoldingsSummary, getOverlaps, getSharedHoldings, getTopHoldingsFull, lookThrough, searchSecurities } from "@/lib/etfs/holdings";
import { portfolioInsight } from "@/lib/etfs/portfolio";
import { returnGaps } from "@/lib/etfs/cost";
import type { EtfRow } from "@/lib/etfs/queries";

const keyOf = async (ticker: string) => (await query<{ etf_key: string }>("select d.etf_key from public.etf_directory d join public.holdings_summary s on s.etf_key = d.etf_key where d.ticker = $1", [ticker]))[0].etf_key;

describe("holdings", () => {
  it("loads a fund's holdings with weights that add up to about the whole fund", async () => {
    const spy = await keyOf("SPY");
    const summary = await getHoldingsSummary(spy);
    expect(summary!.n_holdings).toBeGreaterThan(450);
    expect(summary!.covered_pct).toBeGreaterThan(95);
    expect(summary!.covered_pct).toBeLessThan(101);
    const top = await getTopHoldingsFull(spy, 5);
    expect(top.map((h) => h.weight_pct)).toEqual([...top.map((h) => h.weight_pct)].sort((a, b) => b - a));
    const sectors = await getBreakdown(spy, "sector");
    expect(sectors.length).toBeGreaterThan(5);
  });

  it("finds near-total overlap between two funds on the same index and little between unrelated ones", async () => {
    const [spy, xlk, xle] = await Promise.all([keyOf("SPY"), keyOf("XLK"), keyOf("XLE")]);
    const pairs = await getOverlaps([spy, xlk, xle]);
    const get = (a: string, b: string) => pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))?.overlap_pct ?? 0;
    expect(get(xlk, xle)).toBeLessThan(1);
    expect(get(spy, xlk)).toBeGreaterThan(20);
    expect(get(spy, xlk)).toBeLessThan(60);
    const shared = await getSharedHoldings([spy, xlk], 5);
    expect(shared.length).toBe(5);
    expect(Object.keys(shared[0].weights).sort()).toEqual([spy, xlk].sort());
  });

  it("finds a company and the ETFs that hold it, heaviest first", async () => {
    const hits = await searchSecurities("nvidia");
    expect(hits[0].name).toMatch(/nvidia/i);
    const holders = await getHolders(hits[0].holding_key);
    expect(holders.length).toBeGreaterThan(5);
    expect(holders.map((h) => h.weight_pct)).toEqual([...holders.map((h) => h.weight_pct)].sort((a, b) => b - a));
    expect(await searchSecurities("%")).toEqual([]);
  });

  it("looks through a portfolio and reports what it could not see", async () => {
    const spy = await keyOf("SPY");
    const look = await lookThrough({ [spy]: 60, "NO-SUCH-FUND": 40 });
    expect(look.covered_pct).toBe(60);
    expect(look.holdings[0].weight_pct).toBeLessThan(8);
    expect(look.sectors.reduce((s, x) => s + x.weight_pct, 0)).toBeLessThanOrEqual(60.5);
  });

  it("values a portfolio in euro and blends its fee by value", async () => {
    const insight = await portfolioInsight([{ key: "ARCX-SPY", quantity: 10 }, { key: "IE00B5BMR087", quantity: 5 }, { key: "ZZ-NOPE", quantity: 1 }]);
    expect(insight.weights.length).toBe(2);
    expect(insight.unvalued).toEqual(["ZZ-NOPE"]);
    expect(insight.weights.reduce((s, w) => s + w.weight_pct, 0)).toBeCloseTo(100, 5);
    const fees = insight.weights.map((w) => w.fee_pct!);
    expect(insight.fee_pct!).toBeGreaterThanOrEqual(Math.min(...fees));
    expect(insight.fee_pct!).toBeLessThanOrEqual(Math.max(...fees));
    expect(insight.yearly_cost_eur!).toBeCloseTo((insight.total_eur * insight.fee_pct!) / 100, 4);
  });
});

describe("realised return gaps", () => {
  const fund = (name: string, r1: number | null, extra: Partial<EtfRow> = {}) => ({ name, etf_key: name, nav_return_1y: r1, nav_return_3y: null, nav_return_as_of: "2026-10-31", nav_currency: "USD", currency: "USD", hedged: false, ...extra }) as EtfRow;

  it("compares only funds with the same currency and date, and leaves hedged classes out", () => {
    const gaps = returnGaps([fund("A", 10), fund("B", 9.8), fund("C", 9.5), fund("D EUR Hedged", 7), fund("E", 20, { nav_currency: "EUR" }), fund("F", 30, { nav_return_as_of: "2026-09-30" }), fund("G", null)]);
    expect(gaps!.rows.map((r) => r.row.name)).toEqual(["A", "B", "C"]);
    expect(gaps!.rows[2].behind1).toBeCloseTo(0.5, 6);
    expect(gaps!.rows[0].behind3).toBeNull();
  });

  it("says nothing when fewer than three funds are comparable", () => {
    expect(returnGaps([fund("A", 10), fund("B", 9)])).toBeNull();
  });
});
