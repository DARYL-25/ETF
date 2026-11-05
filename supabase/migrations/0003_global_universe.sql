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

-- Issuer-published figures for basic records. Fee types stay distinct: 'ter', 'ger' (gross expense
-- ratio), 'ongoing' (PRIIPs management and operating costs), and 'net' and 'gross_sec' (SEC prospectus
-- expense ratios, including acquired fund fees where the fund reports them).
create table public.universe_details (
  etf_key            text primary key references public.universe_etfs (etf_key) on delete cascade,
  fee_pct            double precision,
  fee_type           text,
  fee_as_of          text,
  aum                double precision,
  aum_currency       text,
  aum_as_of          text,
  nav                double precision,
  nav_currency       text,
  nav_as_of          text,
  ret_1y             double precision,
  ret_3y             double precision,
  ret_5y             double precision,
  ret_si             double precision,
  ret_as_of          text,
  volatility_3y      double precision,
  tracking_error_3y  double precision,
  distribution       text,
  source             text,
  source_url         text,
  name               text
);
alter table public.universe_details enable row level security;
create policy "public read" on public.universe_details for select to anon, authenticated using (true);
grant select on public.universe_details to anon, authenticated;

create view public.etf_directory with (security_invoker = true) as
select o.*, o.isin as etf_key, null::int as venues, null::float8 as volatility_3y, null::float8 as tracking_error_3y from public.etf_overview o
union all
select
  nullif(u.isin, '') as isin,
  coalesce(d.name, u.name) as name,
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
  d.distribution as distribution_policy,
  null::text as distribution_frequency,
  null::boolean as hedged,
  null::text as index_slug,
  null::text as index_name,
  null::text as benchmark_as_published,
  nullif(u.ticker, '') as ticker,
  nullif(u.mic, '') as ticker_exchange,
  null::float8 as ter_pct,
  d.fee_as_of as ter_as_of,
  null::float8 as ocf_pct,
  null::text as ocf_as_of,
  d.fee_pct as headline_fee_pct,
  d.fee_type as headline_fee_type,
  d.aum as fund_aum,
  d.aum_currency as fund_aum_currency,
  d.aum_as_of as fund_aum_as_of,
  case when d.aum_currency = 'EUR' then d.aum else d.aum / fx.rate end as fund_aum_eur,
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
  d.ret_1y as nav_return_1y,
  d.ret_3y as nav_return_3y,
  d.ret_5y as nav_return_5y,
  d.ret_si as nav_return_si,
  d.ret_as_of as nav_return_as_of,
  d.source_url as nav_return_source_url,
  d.nav as nav,
  d.nav_currency as nav_currency,
  d.nav_as_of as nav_as_of,
  d.ret_1y as return_1y,
  d.ret_3y as return_3y,
  '{}'::text[] as category_slugs,
  '{}'::text[] as category_labels,
  coalesce(d.source_url, u.source_url) as source_url,
  'official_list' as source_kind,
  u.retrieved_on::text as source_retrieved_on,
  'basic_record' as verification,
  u.etf_key,
  u.venues,
  d.volatility_3y,
  d.tracking_error_3y
from public.universe_etfs u
left join public.universe_details d on d.etf_key = u.etf_key
left join lateral (
  select rate from public.fx_rates r where r.base_currency = 'EUR' and r.quote_currency = d.aum_currency order by rate_date desc limit 1
) fx on true
where u.isin is null or u.isin = '' or not exists (select 1 from public.share_classes s where s.isin = u.isin);

grant select on public.etf_directory to anon, authenticated;
