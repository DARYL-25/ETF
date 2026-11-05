import { query } from "@/lib/db/client";
import { SORT_COLUMNS, buildScreenerWhere, defaultDirection, type ScreenerParams } from "./screener-params";

export type EtfRow = {
  etf_key?: string;
  venues?: number | null;
  isin: string | null;
  name: string;
  fund_key: string | null;
  fund_name: string;
  issuer_slug: string;
  issuer_name: string;
  product_type: string;
  ucits: boolean | null;
  domicile: string | null;
  asset_class: string;
  management_style: string;
  replication: string;
  status: string;
  base_currency: string | null;
  fund_launch_date: string | null;
  share_class_launch_date: string | null;
  currency: string | null;
  distribution_policy: string;
  distribution_frequency: string | null;
  hedged: boolean | null;
  index_slug: string | null;
  index_name: string | null;
  benchmark_as_published: string | null;
  ticker: string | null;
  ticker_exchange: string | null;
  ter_pct: number | null;
  ter_as_of: string | null;
  ocf_pct: number | null;
  ocf_as_of: string | null;
  headline_fee_pct: number | null;
  headline_fee_type: "ter" | "ocf" | "ger" | "ongoing" | null;
  volatility_3y?: number | null;
  tracking_error_3y?: number | null;
  fund_aum: number | null;
  fund_aum_currency: string | null;
  fund_aum_as_of: string | null;
  fund_aum_eur: number | null;
  class_aum: number | null;
  class_aum_currency: string | null;
  class_aum_as_of: string | null;
  holdings_count: number | null;
  holdings_as_of: string | null;
  trailing_yield_pct: number | null;
  trailing_yield_as_of: string | null;
  market_return_1y: number | null;
  market_return_3y: number | null;
  market_return_5y: number | null;
  market_return_as_of: string | null;
  nav_return_1y: number | null;
  nav_return_3y: number | null;
  nav_return_5y: number | null;
  nav_return_si: number | null;
  nav_return_as_of: string | null;
  nav_return_source_url: string | null;
  nav: number | null;
  nav_currency: string | null;
  nav_as_of: string | null;
  return_1y: number | null;
  return_3y: number | null;
  category_slugs: string[];
  category_labels: string[];
  source_url: string;
  source_kind: string;
  source_retrieved_on: string;
  verification: string;
};

export type ScreenerResult = { rows: EtfRow[]; total: number; page: number; pageSize: number; pages: number };

export async function screenEtfs(p: ScreenerParams): Promise<ScreenerResult> {
  const { where, values } = buildScreenerWhere(p);
  const direction = p.dir || defaultDirection(p.sort);
  // SORT_COLUMNS is a fixed map, so the column name is never user text. Missing values sort last.
  const order = `${SORT_COLUMNS[p.sort]} ${direction} nulls last, name asc`;
  const offset = (p.page - 1) * p.pageSize;
  const [{ count }] = await query<{ count: number }>(`select count(*)::int as count from public.etf_directory ${where}`, values);
  const rows = await query<EtfRow>(
    `select * from public.etf_directory ${where} order by ${order} limit ${p.pageSize} offset ${offset}`,
    values,
  );
  return { rows, total: count, page: p.page, pageSize: p.pageSize, pages: Math.max(1, Math.ceil(count / p.pageSize)) };
}

export type FilterOption = { value: string; label: string; count: number };

export async function screenerOptions() {
  const grouped = (column: string, label = column) =>
    query<FilterOption>(
      `select ${column} as value, ${label} as label, count(*)::int as count from public.etf_directory
       where ${column} is not null group by 1, 2 order by count desc, label asc limit 150`,
    );
  const [issuers, domiciles, assetClasses, replications, distributions, styles, currencies, indices, categories] = await Promise.all([
    grouped("issuer_slug", "issuer_name"),
    grouped("domicile"),
    grouped("asset_class"),
    grouped("replication"),
    grouped("distribution_policy"),
    grouped("management_style"),
    grouped("currency"),
    grouped("index_slug", "index_name"),
    query<FilterOption & { kind: string }>(
      `select c.slug as value, c.label, c.kind, count(sc.id)::int as count
       from public.categories c
       join public.fund_categories fc on fc.category_id = c.id
       join public.share_classes sc on sc.fund_id = fc.fund_id
       group by 1, 2, 3 order by c.kind, c.label`,
    ),
  ]);
  return { issuers, domiciles, assetClasses, replications, distributions, styles, currencies, indices, categories };
}

export async function getEtf(isin: string): Promise<EtfRow | null> {
  const rows = await query<EtfRow>("select * from public.etf_directory where upper(etf_key) = $1", [isin.toUpperCase()]);
  return rows[0] ?? null;
}

export async function getEtfs(isins: string[]): Promise<EtfRow[]> {
  if (!isins.length) return [];
  const upper = isins.map((i) => i.toUpperCase());
  const rows = await query<EtfRow>("select * from public.etf_directory where upper(etf_key) = any($1::text[])", [upper]);
  return upper.map((i) => rows.find((r) => r.etf_key?.toUpperCase() === i)).filter((r): r is EtfRow => Boolean(r));
}

export type SearchHit = { etf_key: string; isin: string | null; name: string; ticker: string | null; issuer_name: string; index_name: string | null };

/** Exact ISIN and ticker hits come first, then names. Listings never appear as separate ETFs. */
export async function searchEtfs(text: string, limit = 8): Promise<SearchHit[]> {
  const term = text.trim().slice(0, 100);
  if (term.length < 2) return [];
  const like = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
  return query<SearchHit>(
    `select o.etf_key, o.isin, o.name, o.ticker, o.issuer_name, o.index_name
     from public.etf_directory o
     where o.name ilike $1 or o.isin ilike $1 or o.ticker ilike $1 or o.index_name ilike $1 or exists (
       select 1 from public.listings l join public.share_classes s on s.id = l.share_class_id
       where s.isin = o.isin and l.ticker ilike $1)
     order by
       case when upper(o.isin) = upper($2) or upper(o.ticker) = upper($2) then 0
            when exists (select 1 from public.listings l join public.share_classes s on s.id = l.share_class_id
                         where s.isin = o.isin and upper(l.ticker) = upper($2)) then 1
            when o.fund_key is not null then 2 else 3 end,
       o.fund_aum_eur desc nulls last, o.name
     limit ${Math.min(limit, 20)}`,
    [like, term],
  );
}

export type Listing = { exchange_mic: string; exchange_name: string; ticker: string; trading_currency: string | null; is_display_ticker: boolean; has_prices: boolean };

export const getListings = (isin: string) =>
  query<Listing>(
    `select l.exchange_mic, e.name as exchange_name, l.ticker, l.trading_currency, l.is_display_ticker,
       exists (select 1 from public.fund_prices p where p.listing_id = l.id) as has_prices
     from public.listings l
     join public.exchanges e on e.mic = l.exchange_mic
     join public.share_classes sc on sc.id = l.share_class_id
     where sc.isin = $1 order by l.is_display_ticker desc, e.name, l.ticker`,
    [isin],
  );

export type Exposure = { dimension: "sector" | "country"; label: string; weight_pct: number; as_of: string | null; observed_on: string };

export const getExposures = (fundKey: string) =>
  query<Exposure>(
    `select x.dimension, x.label, x.weight_pct, x.as_of::text, x.observed_on::text
     from public.fund_exposures x join public.funds f on f.id = x.fund_id
     where f.key = $1 and x.observed_on = (select max(y.observed_on) from public.fund_exposures y where y.fund_id = f.id and y.dimension = x.dimension)
     order by x.dimension, x.weight_pct desc`,
    [fundKey],
  );

export type BondMetric = { metric: string; value: number; as_of: string | null };

export const getBondMetrics = (fundKey: string) =>
  query<BondMetric>(
    `select distinct on (m.metric) m.metric, m.value, m.as_of::text
     from public.metric_observations m join public.funds f on f.id = m.fund_id
     where f.key = $1 and m.metric in ('effective_duration', 'weighted_avg_maturity', 'yield_to_maturity')
     order by m.metric, m.observed_on desc`,
    [fundKey],
  );

export type PriceSeries = {
  isin: string;
  ticker: string;
  exchange: string;
  currency: string | null;
  frequency: string;
  priceType: string;
  source: string;
  sourceUrl: string;
  licenceNote: string | null;
  retrievedOn: string;
  points: { date: string; close: number }[];
};

export async function getPriceSeries(isin: string | null): Promise<PriceSeries | null> {
  if (!isin) return null;
  const rows = await query<{
    ticker: string; exchange: string; currency: string | null; frequency: string; price_type: string;
    publisher: string; url: string; licence_note: string | null; retrieved_on: string; date: string; close: number;
  }>(
    `select l.ticker, e.name as exchange, l.trading_currency as currency, p.frequency, p.price_type,
       d.publisher, d.url, d.licence_note, d.retrieved_on::text, p.price_date::text as date, p.close
     from public.fund_prices p
     join public.listings l on l.id = p.listing_id
     join public.exchanges e on e.mic = l.exchange_mic
     join public.share_classes sc on sc.id = l.share_class_id
     join public.data_sources d on d.id = p.source_id
     where sc.isin = $1 order by p.price_date asc`,
    [isin.toUpperCase()],
  );
  if (!rows.length) return null;
  const first = rows[0];
  return {
    isin: isin.toUpperCase(), ticker: first.ticker, exchange: first.exchange, currency: first.currency,
    frequency: first.frequency, priceType: first.price_type, source: first.publisher, sourceUrl: first.url,
    licenceNote: first.licence_note, retrievedOn: first.retrieved_on,
    points: rows.map((r) => ({ date: r.date, close: r.close })),
  };
}

export type IndexRow = {
  slug: string; name: string; provider: string; asset_class: string; geography: string;
  currency: string | null; constituents_count: number | null; methodology_url: string | null; description: string | null; etf_count: number;
};

export const getIndices = () =>
  query<IndexRow>(
    `select i.slug, i.name, i.provider, i.asset_class, i.geography, i.currency, i.constituents_count, i.methodology_url, i.description,
       (select count(*)::int from public.fund_index_relationships r join public.share_classes s on s.fund_id = r.fund_id where r.index_id = i.id) as etf_count
     from public.indices i order by etf_count desc, i.name asc`,
  );

export async function getIndex(slug: string): Promise<{ index: IndexRow; etfs: EtfRow[] } | null> {
  const all = await getIndices();
  const index = all.find((i) => i.slug === slug);
  if (!index) return null;
  const etfs = await query<EtfRow>(
    "select * from public.etf_overview where index_slug = $1 order by headline_fee_pct asc nulls last, fund_aum_eur desc nulls last",
    [slug],
  );
  return { index, etfs };
}

export const getSimilarEtfs = (row: EtfRow, limit = 6) =>
  query<EtfRow>(
    `select * from public.etf_overview
     where isin <> $1 and (index_slug = $2 or (asset_class = $3 and category_slugs && $4::text[]))
     order by (index_slug = $2) desc nulls last, headline_fee_pct asc nulls last limit ${limit}`,
    [row.isin, row.index_slug, row.asset_class, row.category_slugs],
  );

export async function getDashboard() {
  const [largest, cheapest, coverage, sp500, fees] = await Promise.all([
    query<EtfRow>("select * from public.etf_overview order by fund_aum_eur desc nulls last, name limit 8"),
    query<EtfRow & { group_label: string }>(
      `select distinct on (group_label) *, group_label from (
         select o.*, case
           when o.index_slug = 'msci-world' then 'MSCI World'
           when o.index_slug = 'sp-500' then 'S&P 500'
           when o.index_slug = 'ftse-all-world' then 'FTSE All-World'
           when 'emerging' = any(o.category_slugs) then 'Emerging markets'
           when 'europe' = any(o.category_slugs) and o.asset_class = 'equity' then 'European equity'
           when o.asset_class = 'fixed_income' then 'Bonds'
           when o.asset_class = 'commodities' then 'Gold'
         end as group_label
         from public.etf_overview o where o.headline_fee_pct is not null
       ) t where group_label is not null
       order by group_label, headline_fee_pct asc, fund_aum_eur desc nulls last`,
    ),
    query<{ etfs: number; funds: number; issuers: number; indices: number; listings: number; priced: number; latest: string; all_etfs: number; venues: number }>(
      `select (select count(*)::int from public.share_classes) as etfs, (select count(*)::int from public.funds) as funds,
         (select count(*)::int from public.issuers) as issuers,
         (select count(distinct index_id)::int from public.fund_index_relationships) as indices,
         (select count(*)::int from public.listings) as listings,
         (select count(distinct l.share_class_id)::int from public.fund_prices p join public.listings l on l.id = p.listing_id) as priced,
         (select max(retrieved_on)::text from public.data_sources) as latest,
         (select count(*)::int from public.etf_directory) as all_etfs,
         (select count(distinct market)::int from (select coalesce(nullif(mic, ''), source) as market from public.universe_etfs) m) as venues`,
    ),
    query<EtfRow>("select * from public.etf_overview where index_slug = 'sp-500' order by headline_fee_pct asc nulls last, fund_aum_eur desc nulls last"),
    getFeePoints(),
  ]);
  return { largest, cheapest, coverage: coverage[0], sp500, fees };
}


export type FeePoint = { isin: string; name: string; ticker: string | null; fee: number; type: "ter" | "ocf" };

export const getFeePoints = () =>
  query<FeePoint>(
    `select isin, name, ticker, headline_fee_pct as fee, headline_fee_type as type
     from public.etf_overview where headline_fee_pct is not null order by headline_fee_pct, name`,
  );

export const getDataSources = () =>
  query<{ kind: string; publisher: string; url: string; retrieved_on: string; licence_note: string | null }>(
    "select kind, publisher, url, retrieved_on::text, licence_note from public.data_sources order by publisher, url",
  );

export type TopHolding = { name: string; weight_pct: number; as_of: string | null };

export const getTopHoldings = (fundKey: string) =>
  query<TopHolding>(
    `select h.name, h.weight_pct, h.as_of::text from public.fund_top_holdings h join public.funds f on f.id = h.fund_id
     where f.key = $1 and h.observed_on = (select max(y.observed_on) from public.fund_top_holdings y where y.fund_id = f.id)
     order by h.weight_pct desc`,
    [fundKey],
  );
