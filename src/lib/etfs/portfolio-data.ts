import { query } from "@/lib/db/client";
import { getEtfs } from "./queries";
import { changes, type Change, type Snapshot } from "@/lib/portfolio/watch";
import type { FundExposure, Move } from "@/lib/assistant/copilot";

/** ISINs, tickers or our keys as a broker export writes them, matched to ETFs in the directory. Larger funds win a tie on a ticker. */
export async function resolveIdentifiers(ids: string[]): Promise<Record<string, { key: string; name: string; nav_currency: string | null } | null>> {
  const upper = [...new Set(ids.map((i) => i.trim().toUpperCase()).filter(Boolean))].slice(0, 200);
  if (!upper.length) return {};
  const rows = await query<{ etf_key: string; isin: string | null; ticker: string | null; name: string; nav_currency: string | null }>(
    `select etf_key, isin, ticker, name, nav_currency from public.etf_directory
     where upper(etf_key) = any($1::text[]) or upper(isin) = any($1::text[]) or upper(ticker) = any($1::text[])
     order by (nav is not null) desc, size_eur desc nulls last`, [upper]);
  const out: Record<string, { key: string; name: string; nav_currency: string | null } | null> = {};
  for (const id of upper) {
    const hit = rows.find((r) => r.etf_key.toUpperCase() === id) ?? rows.find((r) => r.isin?.toUpperCase() === id) ?? rows.find((r) => r.ticker?.toUpperCase() === id);
    out[id] = hit ? { key: hit.etf_key, name: hit.name, nav_currency: hit.nav_currency } : null;
  }
  return out;
}

const TECH = "(sector ~* '(tech|software|semiconductor|computer)')";

/** Each fund's own technology and United States shares, over the lines of its holdings file that carry a sector or a country. */
export async function fundExposures(funds: { key: string; name: string }[]): Promise<FundExposure[]> {
  if (!funds.length) return [];
  const rows = await query<{ etf_key: string; tech: number | null; us: number | null }>(
    `select etf_key,
       case when sum(weight_pct) filter (where sector is not null and sector <> '') > 0 then 100 * sum(weight_pct) filter (where ${TECH}) / sum(weight_pct) filter (where sector is not null and sector <> '') end as tech,
       case when sum(weight_pct) filter (where country is not null and country <> '') > 0 then 100 * sum(weight_pct) filter (where country = 'United States') / sum(weight_pct) filter (where country is not null and country <> '') end as us
     from public.holdings where etf_key = any($1::text[]) group by etf_key`, [funds.map((f) => f.key)]);
  return funds.map((f) => { const r = rows.find((x) => x.etf_key === f.key); return { key: f.key, name: f.name, tech_pct: r?.tech ?? null, us_pct: r?.us ?? null }; });
}

/** How each fund's price moved over the last month of daily prices we hold, NAV first and exchange closes otherwise. */
export async function recentMoves(funds: { key: string; name: string; weight_pct: number }[]): Promise<Move[]> {
  if (!funds.length) return [];
  const rows = await query<{ etf_key: string; d0: string; v0: number; d1: string; v1: number }>(
    `with p as (
       select etf_key, price_date, value, row_number() over (partition by etf_key, price_date order by (kind = 'nav') desc) as pick
       from public.universe_prices where etf_key = any($1::text[])
     ), last as (select etf_key, max(price_date) as d1 from p where pick = 1 group by etf_key)
     select l.etf_key, a.price_date::text as d0, a.value as v0, l.d1::text as d1, b.value as v1
     from last l
     join lateral (select price_date, value from p where p.etf_key = l.etf_key and pick = 1 and price_date >= l.d1 - 31 order by price_date limit 1) a on true
     join p b on b.etf_key = l.etf_key and b.pick = 1 and b.price_date = l.d1
     where a.price_date < l.d1`, [funds.map((f) => f.key)]);
  return rows.map((r) => { const f = funds.find((x) => x.key === r.etf_key)!; return { key: r.etf_key, name: f.name, weight_pct: f.weight_pct, change_pct: (r.v1 / r.v0 - 1) * 100, from: r.d0, to: r.d1 }; });
}

/** What changed for watched ETFs since the reader added them. */
export async function watchChanges(items: { key: string; seen?: Snapshot }[]): Promise<Change[]> {
  const withSeen = items.filter((i) => i.seen).slice(0, 200);
  if (!withSeen.length) return [];
  const rows = await getEtfs(withSeen.map((i) => i.key));
  const out: Change[] = [];
  for (const i of withSeen) {
    const r = rows.find((x) => x.etf_key?.toUpperCase() === i.key.toUpperCase() || x.isin?.toUpperCase() === i.key.toUpperCase());
    out.push(...changes(i.key, i.seen, r ? { fee: r.headline_fee_pct, size: r.size_eur ?? r.fund_aum_eur ?? null, name: r.name } : null));
  }
  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
