import { describe, expect, it } from "vitest";
import { parseScreenerParams, screenerHref } from "@/lib/etfs/screener-params";
import { getEtfs, getIndex, screenEtfs, searchEtfs } from "@/lib/etfs/queries";

const run = (raw: Record<string, string>) => screenEtfs(parseScreenerParams(raw));

describe("screener params", () => {
  it("ignores unknown sort columns", () => {
    expect(parseScreenerParams({ sort: "name; drop table funds" }).sort).toBe("aum");
  });

  it("clamps page and page size", () => {
    const p = parseScreenerParams({ page: "-4", pageSize: "100000" });
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(100);
  });

  it("round-trips through the URL", () => {
    const p = parseScreenerParams({ issuer: "ishares,vanguard", feeMax: "0.2", q: "world" });
    const href = screenerHref(p, {});
    const again = parseScreenerParams(Object.fromEntries(new URLSearchParams(href.split("?")[1])));
    expect(again).toEqual(p);
  });

  it("resets to the first page when a filter changes", () => {
    const p = parseScreenerParams({ page: "3" });
    expect(screenerHref(p, { issuer: ["ishares"] })).toBe("/screener?issuer=ishares");
  });
});

describe("screener queries", () => {
  it("sorts by fund size by default, biggest first", async () => {
    const { rows } = await run({});
    const sizes = rows.map((r) => r.size_eur ?? null).filter((n): n is number => n !== null);
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
    expect(rows[0].fund_aum_eur).toBeGreaterThan(100_000_000_000);
  });

  it("combines filters", async () => {
    const { rows } = await run({ index: "sp-500", distribution: "accumulating", feeMax: "0.07" });
    expect(rows.map((r) => r.isin)).toEqual(expect.arrayContaining(["IE00B5BMR087", "IE00BFMXXD54"]));
    for (const r of rows) expect(r.headline_fee_pct!).toBeLessThanOrEqual(0.07);
  });

  it("matches any tick within a group but all groups together", async () => {
    const usOrEurope = await run({ region: "us,europe" });
    const usAndTech = await run({ region: "us", theme: "technology" });
    const us = await run({ region: "us", pageSize: "100" });
    expect(usOrEurope.total).toBeGreaterThan(us.total);
    expect(us.total).toBeGreaterThan(1000);
    expect(usAndTech.total).toBeLessThan(us.total);
    for (const r of usAndTech.rows) expect(r.category_slugs).toEqual(expect.arrayContaining(["us", "technology"]));
  });

  it("finds a fund through any of its tickers, once", async () => {
    const { rows, total } = await run({ q: "SXR8" });
    expect(total).toBe(1);
    expect(rows[0].fund_aum_eur).toBeGreaterThan(100_000_000_000);
  });

  it("filters fund size in millions of euro", async () => {
    const { rows } = await run({ aumMin: "100000" });
    for (const r of rows) expect(r.size_eur!).toBeGreaterThanOrEqual(100_000_000_000);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("excludes funds with an unknown fee from fee filters", async () => {
    const all = await run({ pageSize: "100", sort: "fee", dir: "asc", q: "world" });
    const unknown = all.rows.filter((r) => r.headline_fee_pct === null).map((r) => r.etf_key);
    const filtered = await run({ pageSize: "100", feeMax: "5", q: "world" });
    for (const key of unknown) expect(filtered.rows.map((r) => r.etf_key)).not.toContain(key);
  });

  it("puts missing values last in both directions", async () => {
    const asc = await run({ index: "msci-world", sort: "fee", dir: "asc", pageSize: "100" });
    const desc = await run({ index: "msci-world", sort: "fee", dir: "desc", pageSize: "100" });
    expect(asc.rows.at(-1)!.headline_fee_pct).toBeNull();
    expect(desc.rows.at(-1)!.headline_fee_pct).toBeNull();
  });

  it("paginates", async () => {
    const first = await run({ pageSize: "10" });
    const second = await run({ pageSize: "10", page: "2" });
    expect(first.pages).toBeGreaterThan(1);
    expect(first.rows[0].isin).not.toBe(second.rows[0].isin);
  });

  it("treats search text as text, not as a pattern or SQL", async () => {
    expect((await run({ q: "zz%zz" })).total).toBe(0);
    // A literal percent sign is real text: only the index named "10% Capped" matches.
    expect((await run({ q: "%" })).rows.map((r) => r.isin)).toContain("IE00BMC38736");
    expect((await run({ q: "'; drop table public.funds; --" })).total).toBe(0);
    expect((await run({})).total).toBeGreaterThan(0);
  });
});

describe("lookups", () => {
  it("ranks an exact ticker first", async () => {
    const hits = await searchEtfs("VWCE");
    expect(hits[0].isin).toBe("IE00BK5BQT80");
  });

  it("finds every ETF on an index, cheapest first", async () => {
    const result = await getIndex("sp-500");
    expect(result!.etfs.length).toBeGreaterThanOrEqual(5);
    const fees = result!.etfs.map((e) => e.headline_fee_pct).filter((f): f is number => f !== null);
    expect([...fees].sort((a, b) => a - b)).toEqual(fees);
  });

  it("returns comparison rows in the requested order", async () => {
    const rows = await getEtfs(["IE00BK5BQT80", "IE00B5BMR087"]);
    expect(rows.map((r) => r.isin)).toEqual(["IE00BK5BQT80", "IE00B5BMR087"]);
  });
});
