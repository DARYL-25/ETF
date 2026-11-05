import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { buildSeedSql, derivedReturn, fundsFile, parsePriceCsv } from "@/lib/db/seed-sql";
import { localSchemaSql } from "@/lib/db/client";

const root = process.cwd();
const fx = JSON.parse(readFileSync("data/seed/fx.json", "utf8"));
// Licensed price files stay out of the repository, so these checks run only where they exist.
const hasPrices = existsSync("data/seed/prices") && readdirSync("data/seed/prices").some((n) => n.endsWith(".csv"));
const funds = fundsFile.parse(JSON.parse(readFileSync("data/seed/funds.json", "utf8")));
const shareClasses = funds.funds.flatMap((f) => f.shareClasses);

function isinCheckDigitValid(isin: string): boolean {
  const digits = isin.split("").map((c) => (/[0-9]/.test(c) ? c : String(c.charCodeAt(0) - 55))).join("");
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

describe("seed data rules", () => {
  it("has valid, unique ISINs", () => {
    const isins = shareClasses.map((s) => s.isin);
    expect(new Set(isins).size).toBe(isins.length);
    for (const isin of isins) expect(isinCheckDigitValid(isin), isin).toBe(true);
  });

  it("gives each share class exactly one display ticker", () => {
    for (const sc of shareClasses) {
      expect(sc.listings.filter((l) => l[3] === "P").length, sc.isin).toBe(1);
    }
  });

  it("keeps fee figures in a plausible range", () => {
    for (const sc of shareClasses) {
      for (const v of Object.values(sc.fees)) {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(1.5);
      }
    }
  });

  it("never reports share class assets above the fund's", () => {
    for (const f of funds.funds) {
      for (const sc of f.shareClasses) {
        if (f.aum && sc.aum && f.aum.currency === sc.aum.currency) {
          expect(sc.aum.amount, sc.isin).toBeLessThanOrEqual(Math.ceil(f.aum.amount) + 1);
        }
      }
    }
  });

  it("does not take fund data from commercial data sites", () => {
    for (const f of funds.funds) {
      for (const url of [f.source.url, ...f.shareClasses.flatMap((s) => (s.source ? [s.source.url] : []))]) {
        expect(url, f.key).not.toMatch(/justetf|morningstar|extraetf|trackinsight|finanzen\.net/);
      }
    }
  });
});

describe("derived returns", () => {
  // Round made-up numbers that only exercise the arithmetic.
  const points = parsePriceCsv("date,close\n2023-10-31,100\n2024-10-31,110\n2025-10-31,125\n2026-10-30,150\n2026-11-03,151\n");

  it("sorts oldest first", () => {
    expect(parsePriceCsv("date,close\n2026-01-30,2\n2025-12-31,1\n")[0].date).toBe("2025-12-31");
  });

  it("computes one year from the same month a year earlier", () => {
    expect(derivedReturn(points, 1, "2026-10-30")).toBeCloseTo(20, 6);
  });

  it("annualises three years", () => {
    expect(derivedReturn(points, 3, "2026-10-30")).toBeCloseTo((1.5 ** (1 / 3) - 1) * 100, 6);
  });

  it("returns null when history is too short", () => {
    expect(derivedReturn(points, 30, "2026-10-30")).toBeNull();
  });
});

describe.runIf(hasPrices)("stored price files", () => {
  const files = hasPrices ? readdirSync("data/seed/prices").filter((n) => n.endsWith(".csv")) : [];

  it("has no month that moves implausibly, which would suggest a typing error", () => {
    for (const file of files) {
      const points = parsePriceCsv(readFileSync(`data/seed/prices/${file}`, "utf8"));
      for (let i = 1; i < points.length; i++) {
        const move = Math.abs(points[i].close / points[i - 1].close - 1);
        expect(move, `${file} ${points[i].date}`).toBeLessThan(0.3);
      }
    }
  });

  it("matches known values from the provider's response", () => {
    const cspx = parsePriceCsv(readFileSync("data/seed/prices/CSPX.LON.csv", "utf8"));
    expect(cspx.find((p) => p.date === "2026-10-30")?.close).toBe(820.17);
    expect(derivedReturn(cspx, 1, "2026-10-30")).toBeCloseTo((820.17 / 731.75 - 1) * 100, 6);
  });
});

describe("database", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    for (const sql of localSchemaSql(root)) await db.exec(sql);
    await db.exec(buildSeedSql(root));
  });

  const asUser = async (user: string | null) => {
    await db.exec("reset role");
    await db.exec(`set request.jwt.sub = '${user ?? ""}'`);
    await db.exec(`set role ${user ? "authenticated" : "anon"}`);
  };

  it("loads one row per share class, not one per listing", async () => {
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.etf_overview");
    const listings = await db.query<{ n: number }>("select count(*)::int as n from public.listings");
    expect(rows[0].n).toBe(shareClasses.length);
    expect(listings.rows[0].n).toBeGreaterThan(rows[0].n);
  });

  it("groups two share classes under one Vanguard fund", async () => {
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.etf_overview where fund_key = 'vanguard-ftse-all-world'");
    expect(rows[0].n).toBe(2);
  });

  it("stores OCF as OCF and never presents it as TER", async () => {
    const { rows } = await db.query<{ ter_pct: number | null; ocf_pct: number; headline_fee_type: string }>(
      "select ter_pct, ocf_pct, headline_fee_type from public.etf_overview where isin = 'IE00BK5BQT80'",
    );
    expect(rows[0]).toEqual({ ter_pct: null, ocf_pct: 0.14, headline_fee_type: "ocf" });
  });

  it("prefers official NAV returns and keeps top holdings", async () => {
    const { rows } = await db.query<{ return_1y: number; nav: number }>("select return_1y, nav from public.etf_overview where isin = 'IE00B5BMR087'");
    expect(rows[0]).toEqual({ return_1y: 15.47, nav: 816.9 });
    const top = await db.query("select * from public.fund_top_holdings");
    expect(top.rows.length).toBeGreaterThanOrEqual(35);
  });

  it("keeps missing facts missing", async () => {
    const { rows } = await db.query<{ headline_fee_pct: number | null; fund_aum: number | null }>(
      "select headline_fee_pct, fund_aum from public.etf_overview where isin = 'IE00B60SX394'",
    );
    expect(rows[0]).toEqual({ headline_fee_pct: null, fund_aum: null });
  });

  it("converts fund size to euro with the stored rate", async () => {
    const { rows } = await db.query<{ fund_aum_eur: number }>("select fund_aum_eur from public.etf_overview where isin = 'IE00B5BMR087'");
    expect(rows[0].fund_aum_eur).toBeCloseTo(156654097245 / fx.perEuro.USD, 0);
  });

  it.runIf(hasPrices)("derives returns only for share classes with prices", async () => {
    const { rows } = await db.query<{ isin: string }>("select isin from public.etf_overview where market_return_1y is not null order by isin");
    expect(rows.map((r) => r.isin)).toEqual(["IE00B5BMR087", "IE00BK5BQT80", "IE00BKM4GZ66"]);
  });

  describe("row level security", () => {
    const alice = "11111111-1111-1111-1111-111111111111";
    const bob = "22222222-2222-2222-2222-222222222222";

    beforeAll(async () => {
      await db.exec("reset role");
      await db.exec(`insert into auth.users (id, email) values ('${alice}', 'a@example.test'), ('${bob}', 'b@example.test')`);
    });

    it("lets anonymous visitors read ETF data but not write it", async () => {
      await asUser(null);
      const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.etf_overview");
      expect(rows[0].n).toBeGreaterThan(0);
      await expect(db.exec("update public.funds set name = 'x'")).rejects.toThrow();
      await db.exec("reset role");
    });

    it("hides private tables from anonymous visitors", async () => {
      await asUser(null);
      await expect(db.query("select * from public.watchlists")).rejects.toThrow();
      await db.exec("reset role");
    });

    it("isolates one user's watchlists from another's", async () => {
      await asUser(alice);
      await db.exec(`insert into public.watchlists (user_id, name) values ('${alice}', 'Mine')`);
      const own = await db.query("select * from public.watchlists");
      expect(own.rows).toHaveLength(1);

      await asUser(bob);
      const other = await db.query("select * from public.watchlists");
      expect(other.rows).toHaveLength(0);
      await db.exec("reset role");
    });

    it("rejects writing rows for another user", async () => {
      await asUser(bob);
      await expect(db.exec(`insert into public.watchlists (user_id, name) values ('${alice}', 'Not mine')`)).rejects.toThrow();
      await db.exec("reset role");
    });

    it("rejects adding items to another user's watchlist", async () => {
      await asUser(alice);
      const { rows } = await db.query<{ id: string }>("select id from public.watchlists limit 1");
      const sc = await db.query<{ id: number }>("select id from public.share_classes limit 1");
      await asUser(bob);
      await expect(db.exec(
        `insert into public.watchlist_items (watchlist_id, share_class_id, user_id) values ('${rows[0].id}', ${sc.rows[0].id}, '${bob}')`,
      )).rejects.toThrow();
      await db.exec("reset role");
    });

    it("removes private rows when the account is deleted", async () => {
      await db.exec("reset role");
      await db.exec(`delete from auth.users where id = '${alice}'`);
      const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.watchlists");
      expect(rows[0].n).toBe(0);
    });
  });
});
