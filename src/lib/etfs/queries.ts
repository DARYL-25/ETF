import { query } from "@/lib/db/client";
import { themeBySlug } from "./themes";
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
  headline_fee_type: "ter" | "ocf" | "ger" | "ongoing" | "net" | "gross_sec" | "ocf_ter" | "flat_fee" | "mer" | null;
  aum_level?: string | null;
  listed_on_six?: boolean | null;
  pea_eligible?: boolean | null;
  size_eur?: number | null;
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
      `select c.slug as value, c.label, c.kind, count(*)::int as count
       from public.etf_directory d cross join lateral unnest(d.category_slugs) as s(slug)
       join public.categories c on c.slug = s.slug
       group by 1, 2, 3 order by c.kind, c.label`,
    ),
  ]);
  return { issuers, domiciles, assetClasses, replications, distributions, styles, currencies, indices, categories };
}

/**
 * A record's key changes from "exchange-ticker" to its ISIN once the ISIN is found, so saved links and
 * watchlists made before that still resolve through the ticker.
 */
async function byOldKey(key: string): Promise<EtfRow | null> {
  const m = /^([A-Z]{4})-([A-Z0-9.]{1,10})$/.exec(key);
  if (!m) return null;
  return (await query<EtfRow>("select * from public.etf_directory where ticker_exchange = $1 and upper(ticker) = $2 limit 1", [m[1], m[2]]))[0] ?? null;
}

export async function getEtf(isin: string): Promise<EtfRow | null> {
  const key = isin.toUpperCase();
  const rows = await query<EtfRow>("select * from public.etf_directory where upper(etf_key) = $1", [key]);
  return rows[0] ?? (await byOldKey(key));
}

export async function getEtfs(isins: string[]): Promise<EtfRow[]> {
  if (!isins.length) return [];
  const upper = isins.map((i) => i.toUpperCase());
  const rows = await query<EtfRow>("select * from public.etf_directory where upper(etf_key) = any($1::text[])", [upper]);
  const found = await Promise.all(upper.map(async (i) => rows.find((r) => r.etf_key?.toUpperCase() === i) ?? (await byOldKey(i))));
  return found.filter((r): r is EtfRow => Boolean(r));
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
       (select count(*)::int from public.etf_directory d where d.index_slug = i.slug) as etf_count
     from public.indices i order by etf_count desc, i.name asc`,
  );

export async function getIndex(slug: string): Promise<{ index: IndexRow; etfs: EtfRow[] } | null> {
  const all = await getIndices();
  const index = all.find((i) => i.slug === slug);
  if (!index) return null;
  const etfs = await query<EtfRow>(
    "select * from public.etf_directory where index_slug = $1 order by headline_fee_pct asc nulls last, fund_aum_eur desc nulls last",
    [slug],
  );
  return { index, etfs };
}

/**
 * Funds close to this one: first those on the same index, then those sharing the most labels.
 * A fund's themes count before its region, so a defence fund is matched with defence funds, not with
 * every fund from the same country. Leveraged and inverse products are only matched with each other.
 */
export const getSimilarEtfs = (row: EtfRow, limit = 6) => {
  const themes = row.category_slugs.filter((slug) => themeBySlug(slug)?.kind === "theme");
  const labels = themes.length ? themes : row.category_slugs;
  return query<EtfRow>(
    `select * from public.etf_directory
     where etf_key <> $1 and ('leveraged-inverse' = any(category_slugs)) = $5
       and (index_slug = $2 or ($2::text is null and coalesce(asset_class, '') = coalesce($3, '') and category_slugs && $4::text[] and cardinality($4::text[]) > 0))
     order by (index_slug = $2) desc nulls last, (select count(*) from unnest(category_slugs) c where c = any($4::text[])) desc,
       (headline_fee_pct is null), size_eur desc nulls last, headline_fee_pct asc limit ${limit}`,
    [row.etf_key ?? row.isin, row.index_slug, row.asset_class, labels, row.category_slugs.includes("leveraged-inverse")],
  );
};

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
    query<{ etfs: number; funds: number; issuers: number; indices: number; listings: number; priced: number; latest: string; all_etfs: number; with_fee: number; venues: number }>(
      `select (select count(*)::int from public.share_classes) as etfs, (select count(*)::int from public.funds) as funds,
         (select count(*)::int from public.issuers) as issuers,
         (select count(distinct index_id)::int from public.fund_index_relationships) as indices,
         (select count(*)::int from public.listings) as listings,
         (select count(distinct l.share_class_id)::int from public.fund_prices p join public.listings l on l.id = p.listing_id) as priced,
         (select max(retrieved_on)::text from public.data_sources) as latest,
         (select count(*)::int from public.etf_directory) as all_etfs,
         (select count(*)::int from public.etf_directory where headline_fee_pct is not null) as with_fee,
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

export type NavPoint = { date: string; value: number; currency: string | null; kind: string; source: string };

/** Daily price points we collected ourselves for an ETF in the global list. Oldest first. */
export const getDailyPoints = (etfKey: string) =>
  query<NavPoint>(
    `select price_date::text as date, value, currency, kind, source from public.universe_prices
     where etf_key = (select etf_key from public.universe_etfs where etf_key = $1 or isin = $1 order by (etf_key = $1) desc limit 1)
     order by price_date asc`,
    [etfKey],
  );

export type Coverage = { all_etfs: number; with_fee: number; with_size: number; with_return: number; with_price: number; latest_price: string | null; markets: number; issuers: number };

export const getCoverage = async () =>
  (await query<Coverage>(
    `select count(*)::int as all_etfs, count(headline_fee_pct)::int as with_fee, count(size_eur)::int as with_size, count(nav_return_1y)::int as with_return,
       (select count(distinct etf_key)::int from public.universe_prices) as with_price,
       (select max(price_date)::text from public.universe_prices) as latest_price,
       (select count(distinct source)::int from public.universe_etfs) as markets,
       count(distinct issuer_name)::int as issuers
     from public.etf_directory`,
  ))[0];

export type IndexTile = { slug: string; name: string; etf_count: number; min_fee: number | null };

export const getIndexTiles = (limit = 8) =>
  query<IndexTile>(
    `select i.slug, i.name, count(d.*)::int as etf_count, min(d.headline_fee_pct) as min_fee
     from public.indices i join public.etf_directory d on d.index_slug = i.slug
     group by i.slug, i.name order by count(d.*) desc limit ${limit}`,
  );

export type ThemeCount = { slug: string; n: number; with_fee: number; min_fee: number | null };

/** How many ETFs each theme holds, and the lowest published fee among them. */
export async function getThemeCounts(): Promise<Map<string, ThemeCount>> {
  const rows = await query<ThemeCount>(
    `select s as slug, count(*)::int as n, count(d.headline_fee_pct)::int as with_fee, min(d.headline_fee_pct) filter (where d.headline_fee_pct > 0) as min_fee
     from public.etf_directory d cross join lateral unnest(d.category_slugs) as s group by 1`);
  return new Map(rows.map((r) => [r.slug, r]));
}

export const THEME_MARKETS = {
  europe: { label: "Europe (UCITS)", where: "ucits is true" },
  us: { label: "United States", where: "ticker_exchange in ('ARCX','XNAS','XNYS','BATS','XASE','IEXG')" },
  asia: { label: "Asia-Pacific", where: "ticker_exchange in ('XTKS','XHKG','XSHG','XSHE','XKRX','XTAI','XNSE','XSES','XASX')" },
} as const;
export type ThemeMarket = keyof typeof THEME_MARKETS;

const THEME_SORTS = {
  size: "size_eur desc nulls last, headline_fee_pct asc nulls last, name asc",
  fee: "headline_fee_pct asc nulls last, size_eur desc nulls last, name asc",
  return: "return_1y desc nulls last, size_eur desc nulls last, name asc",
} as const;
export type ThemeSort = keyof typeof THEME_SORTS;

/** The ETFs filed under one theme, with a count per market so the page can offer them as choices. */
export async function getThemeEtfs(slug: string, market: ThemeMarket | null, sort: ThemeSort, limit: number) {
  // Market and sort come from fixed maps above, never from user text.
  const filter = market ? `and ${THEME_MARKETS[market].where}` : "";
  const [rows, counts] = await Promise.all([
    query<EtfRow>(`select * from public.etf_directory where $1 = any(category_slugs) ${filter} order by ${THEME_SORTS[sort]} limit ${Math.floor(limit)}`, [slug]),
    query<{ all: number; europe: number; us: number; asia: number }>(
      `select count(*)::int as all, count(*) filter (where ${THEME_MARKETS.europe.where})::int as europe, count(*) filter (where ${THEME_MARKETS.us.where})::int as us,
       count(*) filter (where ${THEME_MARKETS.asia.where})::int as asia from public.etf_directory where $1 = any(category_slugs)`, [slug]),
  ]);
  return { rows, counts: counts[0] };
}

export type TapeItem = { etf_key: string; ticker: string; px: number; currency: string | null; chg: number; date: string };

/** The largest ETFs with two daily prices on file: last close and its change, for the price tape under the header. */
export const getTape = (limit = 16) =>
  query<TapeItem>(
    `with big as (
       select etf_key, ticker, size_eur from public.etf_directory
       where ticker is not null and etf_key in (select distinct etf_key from public.universe_prices)
       order by size_eur desc nulls last limit ${Math.floor(limit) * 3}),
     ranked as (
       select p.etf_key, p.value, p.currency, p.price_date, row_number() over (partition by p.etf_key order by p.price_date desc) as rn
       from public.universe_prices p where p.etf_key in (select etf_key from big))
     select b.etf_key, b.ticker, a.value as px, a.currency, ((a.value / nullif(c.value, 0)) - 1) * 100 as chg, a.price_date::text as date
     from big b join ranked a on a.etf_key = b.etf_key and a.rn = 1 join ranked c on c.etf_key = b.etf_key and c.rn = 2
     where c.value > 0 order by b.size_eur desc nulls last limit ${Math.floor(limit)}`,
  );

/** Where a basic record's fund size comes from, when that differs from the row's own source (US sizes from SEC N-PORT). */
export async function getSizeSource(etfKey: string | null): Promise<{ source: string; url: string } | null> {
  if (!etfKey) return null;
  const [r] = await query<{ aum_source: string | null; aum_source_url: string | null }>(
    "select aum_source, aum_source_url from public.universe_details where etf_key = $1 and aum is not null", [etfKey]);
  return r?.aum_source && r.aum_source_url ? { source: r.aum_source, url: r.aum_source_url } : null;
}
