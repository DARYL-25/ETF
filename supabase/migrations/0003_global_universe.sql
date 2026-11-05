-- The global list: one basic row per ETF from official registers and exchange lists.
-- Researched funds in share_classes take priority over a basic row with the same ISIN.
create table public.universe_etfs (
  etf_key         text primary key,
  isin            text,
  ticker          text,
  mic             text,
  name            text not null,
  currency        text,
  issuer_lei      text,
  issuer_name     text,
  issuer_country  text,
  ucits           boolean,
  asset_class     text,
  venues          integer not null default 0,
  source          text not null,
  source_url      text,
  retrieved_on    date not null
);
create index universe_etfs_isin_idx on public.universe_etfs (isin);
create index universe_etfs_ticker_idx on public.universe_etfs (upper(ticker));

alter table public.universe_etfs enable row level security;
create policy "public read" on public.universe_etfs for select to anon, authenticated using (true);
grant select on public.universe_etfs to anon, authenticated;

create view public.etf_directory with (security_invoker = true) as
select o.*, o.isin as etf_key, null::int as venues from public.etf_overview o
union all
select
  nullif(u.isin, '') as isin,
  u.name as name,
  null::text as fund_key,
  null::text as fund_name,
  nullif(u.issuer_lei, '') as issuer_slug,
  coalesce(nullif(u.issuer_name, ''), 'Not identified') as issuer_name,
  'etf' as product_type,
  u.ucits as ucits,
  nullif(u.issuer_country, '') as domicile,
  nullif(u.asset_class, '') as asset_class,
  null::text as management_style,
  null::text as replication,
  'active' as status,
  null::text as base_currency,
  null::text as fund_launch_date,
  null::text as share_class_launch_date,
  nullif(u.currency, '') as currency,
  null::text as distribution_policy,
  null::text as distribution_frequency,
  null::boolean as hedged,
  null::text as index_slug,
  null::text as index_name,
  null::text as benchmark_as_published,
  nullif(u.ticker, '') as ticker,
  nullif(u.mic, '') as ticker_exchange,
  null::float8 as ter_pct,
  null::text as ter_as_of,
  null::float8 as ocf_pct,
  null::text as ocf_as_of,
  null::float8 as headline_fee_pct,
  null::text as headline_fee_type,
  null::float8 as fund_aum,
  null::text as fund_aum_currency,
  null::text as fund_aum_as_of,
  null::float8 as fund_aum_eur,
  null::float8 as class_aum,
  null::text as class_aum_currency,
  null::text as class_aum_as_of,
  null::int as holdings_count,
  null::text as holdings_as_of,
  null::float8 as trailing_yield_pct,
  null::text as trailing_yield_as_of,
  null::float8 as market_return_1y,
  null::float8 as market_return_3y,
  null::float8 as market_return_5y,
  null::text as market_return_as_of,
  null::float8 as nav_return_1y,
  null::float8 as nav_return_3y,
  null::float8 as nav_return_5y,
  null::float8 as nav_return_si,
  null::text as nav_return_as_of,
  null::text as nav_return_source_url,
  null::float8 as nav,
  null::text as nav_currency,
  null::text as nav_as_of,
  null::float8 as return_1y,
  null::float8 as return_3y,
  '{}'::text[] as category_slugs,
  '{}'::text[] as category_labels,
  u.source_url as source_url,
  'official_list' as source_kind,
  u.retrieved_on::text as source_retrieved_on,
  'basic_record' as verification,
  u.etf_key,
  u.venues
from public.universe_etfs u
where u.isin is null or u.isin = '' or not exists (select 1 from public.share_classes s where s.isin = u.isin);

grant select on public.etf_directory to anon, authenticated;
