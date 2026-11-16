import { query } from "@/lib/db/client";

export type Holding = { holding_key: string; name: string; ticker: string | null; weight_pct: number; sector: string | null; country: string | null };
export type HoldingsSummary = { etf_key: string; as_of: string | null; n_holdings: number; kept: number; covered_pct: number; source: string; source_url: string | null };
export type Slice = { label: string; weight_pct: number };

export const getHoldingsSummary = async (etfKey: string) =>
  (await query<HoldingsSummary>("select etf_key, as_of::text, n_holdings, kept, covered_pct, source, source_url from public.holdings_summary where etf_key = $1", [etfKey]))[0] ?? null;

export const getTopHoldingsFull = (etfKey: string, limit = 10) =>
  query<Holding>("select holding_key, name, ticker, weight_pct, sector, country from public.holdings where etf_key = $1 order by weight_pct desc limit $2", [etfKey, limit]);

/** Weights grouped by sector or country, largest first. Cash and derivatives lines are left out of sectors. */
export const getBreakdown = (etfKey: string, by: "sector" | "country", limit = 10) =>
  query<Slice>(
    `select ${by} as label, sum(weight_pct) as weight_pct from public.holdings
     where etf_key = $1 and ${by} is not null and ${by} not in ('', '-', 'Cash and/or Derivatives', 'Unassigned')
     group by 1 order by 2 desc limit $2`,
    [etfKey, limit],
  );

export type Overlap = { a: string; b: string; overlap_pct: number; shared: number };

/**
 * Overlap between each pair of funds: the sum, over securities both hold, of the smaller of the two weights.
 * 100 means identical portfolios, 0 means nothing in common.
 */
export const getOverlaps = (keys: string[]) =>
  keys.length < 2 ? Promise.resolve([] as Overlap[]) : query<Overlap>(
    `select a.etf_key as a, b.etf_key as b, sum(least(a.weight_pct, b.weight_pct)) as overlap_pct, count(*)::int as shared
     from public.holdings a join public.holdings b on b.holding_key = a.holding_key and a.etf_key < b.etf_key
     where a.etf_key = any($1::text[]) and b.etf_key = any($1::text[]) group by 1, 2`,
    [keys],
  );

export type SharedHolding = { name: string; ticker: string | null; weights: Record<string, number> };

/** The securities held by at least two of the funds, with each fund's weight, largest combined weight first. */
export async function getSharedHoldings(keys: string[], limit = 15): Promise<SharedHolding[]> {
  if (keys.length < 2) return [];
  const rows = await query<{ name: string; ticker: string | null; weights: Record<string, number> }>(
    `select min(name) as name, min(ticker) as ticker, jsonb_object_agg(etf_key, weight_pct) as weights
     from public.holdings where etf_key = any($1::text[]) group by holding_key having count(*) >= 2
     order by sum(weight_pct) desc limit $2`,
    [keys, limit],
  );
  return rows;
}

export type Security = { holding_key: string; name: string; ticker: string | null; etfs: number; max_weight: number };

/** Securities whose name or ticker starts with the text, with how many ETFs hold each. */
export const searchSecurities = (text: string, limit = 12) => {
  const term = text.trim().toLowerCase().replace(/[%_\\]/g, "");
  if (term.length < 2) return Promise.resolve([] as Security[]);
  return query<Security>(
    `select holding_key, min(name) as name, min(ticker) as ticker, count(*)::int as etfs, max(weight_pct) as max_weight
     from public.holdings where lower(name) like $1 or lower(ticker) = $2
     group by holding_key order by (min(lower(ticker)) = $2) desc nulls last, count(*) desc limit $3`,
    [`${term}%`, term, limit],
  );
};

export type Holder = { etf_key: string; isin: string | null; name: string; ticker: string | null; weight_pct: number; headline_fee_pct: number | null; size_eur: number | null };

/** ETFs that hold a security, heaviest weight first. */
export const getHolders = (holdingKey: string, limit = 100) =>
  query<Holder & { security: string; security_ticker: string | null }>(
    `select d.etf_key, d.isin, d.name, d.ticker, h.weight_pct, d.headline_fee_pct, d.size_eur, h.name as security, h.ticker as security_ticker
     from public.holdings h join public.etf_directory d on d.etf_key = h.etf_key
     where h.holding_key = $1 order by h.weight_pct desc limit $2`,
    [holdingKey, limit],
  );

export type LookThrough = { holdings: (Slice & { ticker: string | null; holding_key: string })[]; sectors: Slice[]; countries: Slice[]; covered_pct: number };

/**
 * What a set of positions holds underneath. `weights` are each ETF's share of the portfolio, in percent.
 * ETFs without holdings on file are reported through covered_pct, never guessed.
 */
export async function lookThrough(weights: Record<string, number>): Promise<LookThrough> {
  const keys = Object.keys(weights);
  if (!keys.length) return { holdings: [], sectors: [], countries: [], covered_pct: 0 };
  const share = JSON.stringify(weights);
  const base = `from public.holdings h join jsonb_each_text($1::jsonb) w on w.key = h.etf_key`;
  const [holdings, sectors, countries, covered] = await Promise.all([
    query<Slice & { ticker: string | null; holding_key: string }>(`select h.holding_key, min(h.name) as label, min(h.ticker) as ticker, sum(h.weight_pct * w.value::float / 100) as weight_pct ${base} group by h.holding_key order by 4 desc limit 48`, [share]),
    query<Slice>(`select h.sector as label, sum(h.weight_pct * w.value::float / 100) as weight_pct ${base} where h.sector is not null and h.sector not in ('', '-') group by 1 order by 2 desc limit 12`, [share]),
    query<Slice>(`select h.country as label, sum(h.weight_pct * w.value::float / 100) as weight_pct ${base} where h.country is not null and h.country not in ('', '-') group by 1 order by 2 desc limit 12`, [share]),
    query<{ covered: number }>(`select coalesce(sum(w.value::float), 0) as covered from jsonb_each_text($1::jsonb) w where exists (select 1 from public.holdings_summary s where s.etf_key = w.key)`, [share]),
  ]);
  return { holdings, sectors, countries, covered_pct: covered[0].covered };
}

/** Well-known funds whose full holdings we hold, for the picture on the home page. */
const SHOWCASE: [string, string][] = [["US78462F1030", "S&P 500"], ["IE00BFY0GT14", "MSCI World"], ["XNAS-QNDX", "Nasdaq-100"], ["US78463X1037", "Europe"], ["IE00B469F816", "Emerging markets"]];

export type Showcase = { key: string; label: string; name: string; summary: HoldingsSummary; holdings: Holding[] };

export async function getShowcase(tiles = 64): Promise<Showcase[]> {
  const rows = await Promise.all(SHOWCASE.map(async ([key, label]) => {
    const [summary, holdings, names] = await Promise.all([getHoldingsSummary(key), getTopHoldingsFull(key, tiles), query<{ name: string }>("select name from public.etf_directory where etf_key = $1", [key])]);
    return summary && holdings.length > 5 && names[0] ? { key, label, name: names[0].name, summary, holdings } : null;
  }));
  return rows.filter((r): r is Showcase => r !== null);
}

/** The largest of these ETFs that has full holdings on file, to show what an index holds through one fund. */
export async function largestWithHoldings(keys: string[]): Promise<{ etf_key: string; name: string } | null> {
  if (!keys.length) return null;
  return (await query<{ etf_key: string; name: string }>(
    `select d.etf_key, d.name from public.holdings_summary s join public.etf_directory d on d.etf_key = s.etf_key
     where s.etf_key = any($1::text[]) and s.covered_pct > 80 order by d.size_eur desc nulls last limit 1`, [keys]))[0] ?? null;
}
