-- Public ETF reference data. Readable by everyone, writable only by the service role.
--
-- Three design rules from the product spec:
--   1. Fund, share class and exchange listing are separate. An ETF row in the UI is a share class.
--   2. TER, OCF and transaction costs are separate fee types. They are never merged.
--   3. Financial values are dated observations with a source. New values add rows; old rows stay.

create table public.data_sources (
  id            bigint generated always as identity primary key,
  kind          text not null check (kind in ('issuer_website', 'issuer_factsheet', 'market_data_vendor', 'fx_vendor', 'editorial')),
  publisher     text not null,
  url           text not null unique,
  retrieved_on  date not null,
  licence_note  text
);

create table public.issuers (
  id       bigint generated always as identity primary key,
  slug     text not null unique,
  name     text not null,
  website  text
);

create table public.exchanges (
  mic      text primary key check (mic ~ '^[A-Z0-9]{4}$'),
  name     text not null,
  country  text not null check (country ~ '^[A-Z]{2}$')
);

create table public.indices (
  id                  bigint generated always as identity primary key,
  slug                text not null unique,
  name                text not null,
  provider            text not null,
  asset_class         text not null,
  geography           text not null,
  currency            text,
  constituents_count  integer,
  methodology_url     text,
  description         text
);

create table public.categories (
  id     bigint generated always as identity primary key,
  slug   text not null unique,
  kind   text not null check (kind in ('region', 'style', 'theme', 'bond_type')),
  label  text not null
);

create table public.funds (
  id                bigint generated always as identity primary key,
  key               text not null unique,
  name              text not null,
  legal_structure   text,
  issuer_id         bigint not null references public.issuers (id),
  product_type      text not null check (product_type in ('etf', 'etc', 'etn')),
  -- Null means the source did not say. It does not mean "no".
  ucits             boolean,
  domicile          text check (domicile ~ '^[A-Z]{2}$'),
  launch_date       date,
  base_currency     text check (base_currency ~ '^[A-Z]{3}$'),
  asset_class       text not null check (asset_class in ('equity', 'fixed_income', 'commodities', 'money_market', 'real_estate', 'multi_asset', 'alternatives', 'crypto')),
  management_style  text not null check (management_style in ('passive', 'active', 'systematic', 'other')),
  -- 'physical' is used when the issuer says physical without saying full or sampled.
  replication       text not null check (replication in ('physical', 'physical_full', 'physical_sampling', 'physical_metal', 'synthetic_swap', 'futures')),
  status            text not null default 'active' check (status in ('active', 'closing', 'closed')),
  source_id         bigint not null references public.data_sources (id),
  verification      text not null check (verification in ('extracted_unreviewed', 'reviewed', 'disputed'))
);

create table public.fund_index_relationships (
  fund_id                bigint not null references public.funds (id) on delete cascade,
  index_id               bigint not null references public.indices (id),
  relationship           text not null default 'tracks' check (relationship in ('tracks', 'benchmark')),
  benchmark_as_published text,
  primary key (fund_id, index_id)
);

create table public.fund_categories (
  fund_id      bigint not null references public.funds (id) on delete cascade,
  category_id  bigint not null references public.categories (id),
  primary key (fund_id, category_id)
);

create table public.share_classes (
  id                      bigint generated always as identity primary key,
  fund_id                 bigint not null references public.funds (id) on delete cascade,
  isin                    text not null unique check (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  name                    text not null,
  currency                text check (currency ~ '^[A-Z]{3}$'),
  distribution_policy     text not null check (distribution_policy in ('accumulating', 'distributing', 'no_income')),
  distribution_frequency  text check (distribution_frequency in ('monthly', 'quarterly', 'semi_annual', 'annual', 'ad_hoc')),
  hedged                  boolean,
  hedge_currency          text check (hedge_currency ~ '^[A-Z]{3}$'),
  launch_date             date,
  source_id               bigint not null references public.data_sources (id),
  verification            text not null check (verification in ('extracted_unreviewed', 'reviewed', 'disputed'))
);
create index share_classes_fund_idx on public.share_classes (fund_id);

create table public.listings (
  id                  bigint generated always as identity primary key,
  share_class_id      bigint not null references public.share_classes (id) on delete cascade,
  exchange_mic        text not null references public.exchanges (mic),
  ticker              text not null,
  trading_currency    text check (trading_currency ~ '^[A-Z]{3}$'),
  is_display_ticker   boolean not null default false,
  market_data_symbol  text,
  unique (share_class_id, exchange_mic, ticker)
);
create index listings_ticker_idx on public.listings (upper(ticker));
create unique index listings_one_display_ticker on public.listings (share_class_id) where is_display_ticker;

create table public.share_class_fees (
  id              bigint generated always as identity primary key,
  share_class_id  bigint not null references public.share_classes (id) on delete cascade,
  fee_type        text not null check (fee_type in ('ter', 'ocf', 'management', 'transaction', 'entry', 'exit', 'performance')),
  value_pct       numeric(7, 4) not null check (value_pct >= 0),
  as_of           date,
  observed_on     date not null,
  source_id       bigint not null references public.data_sources (id),
  verification    text not null check (verification in ('extracted_unreviewed', 'reviewed', 'disputed')),
  unique (share_class_id, fee_type, observed_on)
);

-- Dated numeric facts. Fund metrics leave share_class_id null.
create table public.metric_observations (
  id              bigint generated always as identity primary key,
  fund_id         bigint not null references public.funds (id) on delete cascade,
  share_class_id  bigint references public.share_classes (id) on delete cascade,
  metric          text not null check (metric in ('aum', 'holdings_count', 'effective_duration', 'weighted_avg_maturity', 'yield_to_maturity', 'trailing_yield', 'market_return_1y', 'market_return_3y', 'market_return_5y', 'nav', 'nav_return_1y', 'nav_return_3y', 'nav_return_5y', 'nav_return_si')),
  value           double precision not null,
  unit            text not null,
  as_of           date,
  observed_on     date not null,
  source_id       bigint not null references public.data_sources (id),
  verification    text not null check (verification in ('extracted_unreviewed', 'reviewed', 'disputed', 'derived')),
  methodology     text
);
create index metric_observations_lookup on public.metric_observations (metric, fund_id, share_class_id, observed_on desc);

create table public.fund_exposures (
  id           bigint generated always as identity primary key,
  fund_id      bigint not null references public.funds (id) on delete cascade,
  dimension    text not null check (dimension in ('sector', 'country')),
  label        text not null,
  weight_pct   double precision not null,
  as_of        date,
  observed_on  date not null,
  source_id    bigint not null references public.data_sources (id),
  unique (fund_id, dimension, label, observed_on)
);

-- Market prices belong to a listing, because each listing has its own price and currency.
create table public.fund_prices (
  listing_id  bigint not null references public.listings (id) on delete cascade,
  price_date  date not null,
  frequency   text not null check (frequency in ('daily', 'weekly', 'monthly')),
  price_type  text not null default 'market_close' check (price_type in ('market_close', 'nav')),
  close       double precision not null check (close > 0),
  source_id   bigint not null references public.data_sources (id),
  primary key (listing_id, price_date, frequency, price_type)
);

create table public.fund_top_holdings (
  fund_id      bigint not null references public.funds (id) on delete cascade,
  name         text not null,
  weight_pct   double precision not null,
  as_of        date,
  observed_on  date not null,
  source_id    bigint not null references public.data_sources (id),
  primary key (fund_id, name, observed_on)
);

create table public.fx_rates (
  base_currency   text not null,
  quote_currency  text not null,
  rate            double precision not null check (rate > 0),
  rate_date       date not null,
  source_id       bigint not null references public.data_sources (id),
  primary key (base_currency, quote_currency, rate_date)
);

create table public.data_update_logs (
  id          bigint generated always as identity primary key,
  job         text not null,
  started_at  timestamptz not null default now(),
  rows_added  integer not null default 0,
  detail      text
);

-- One row per share class, with the newest value of each fact.
create view public.etf_overview with (security_invoker = true) as
select
  sc.isin,
  sc.name,
  f.key as fund_key,
  f.name as fund_name,
  i.slug as issuer_slug,
  i.name as issuer_name,
  f.product_type,
  f.ucits,
  f.domicile,
  f.asset_class,
  f.management_style,
  f.replication,
  f.status,
  f.base_currency,
  f.launch_date::text as fund_launch_date,
  sc.launch_date::text as share_class_launch_date,
  sc.currency,
  sc.distribution_policy,
  sc.distribution_frequency,
  sc.hedged,
  ix.slug as index_slug,
  ix.name as index_name,
  fir.benchmark_as_published,
  display.ticker,
  display.exchange_mic as ticker_exchange,
  ter.value_pct::float8 as ter_pct,
  ter.as_of::text as ter_as_of,
  ocf.value_pct::float8 as ocf_pct,
  ocf.as_of::text as ocf_as_of,
  coalesce(ter.value_pct, ocf.value_pct)::float8 as headline_fee_pct,
  case when ter.value_pct is not null then 'ter' when ocf.value_pct is not null then 'ocf' end as headline_fee_type,
  fund_aum.value as fund_aum,
  fund_aum.unit as fund_aum_currency,
  fund_aum.as_of::text as fund_aum_as_of,
  case when fund_aum.unit = 'EUR' then fund_aum.value else fund_aum.value / fx.rate end as fund_aum_eur,
  class_aum.value as class_aum,
  class_aum.unit as class_aum_currency,
  class_aum.as_of::text as class_aum_as_of,
  holdings.value::int as holdings_count,
  holdings.as_of::text as holdings_as_of,
  yield.value as trailing_yield_pct,
  yield.as_of::text as trailing_yield_as_of,
  ret1.value as market_return_1y,
  ret3.value as market_return_3y,
  ret5.value as market_return_5y,
  ret1.as_of::text as market_return_as_of,
  nav1.value as nav_return_1y,
  nav3.value as nav_return_3y,
  nav5.value as nav_return_5y,
  navsi.value as nav_return_si,
  nav1.as_of::text as nav_return_as_of,
  nav1.url as nav_return_source_url,
  navnow.value as nav,
  navnow.unit as nav_currency,
  navnow.as_of::text as nav_as_of,
  coalesce(nav1.value, ret1.value) as return_1y,
  coalesce(nav3.value, ret3.value) as return_3y,
  coalesce(cats.slugs, '{}') as category_slugs,
  coalesce(cats.labels, '{}') as category_labels,
  src.url as source_url,
  src.kind as source_kind,
  src.retrieved_on::text as source_retrieved_on,
  sc.verification
from public.share_classes sc
join public.funds f on f.id = sc.fund_id
join public.issuers i on i.id = f.issuer_id
join public.data_sources src on src.id = sc.source_id
left join public.fund_index_relationships fir on fir.fund_id = f.id
left join public.indices ix on ix.id = fir.index_id
left join public.listings display on display.share_class_id = sc.id and display.is_display_ticker
left join lateral (
  select value_pct, as_of from public.share_class_fees x
  where x.share_class_id = sc.id and x.fee_type = 'ter' order by observed_on desc limit 1
) ter on true
left join lateral (
  select value_pct, as_of from public.share_class_fees x
  where x.share_class_id = sc.id and x.fee_type = 'ocf' order by observed_on desc limit 1
) ocf on true
left join lateral (
  select value, unit, as_of from public.metric_observations m
  where m.fund_id = f.id and m.share_class_id is null and m.metric = 'aum' order by observed_on desc limit 1
) fund_aum on true
left join lateral (
  select rate from public.fx_rates r
  where r.base_currency = 'EUR' and r.quote_currency = fund_aum.unit order by rate_date desc limit 1
) fx on true
left join lateral (
  select value, unit, as_of from public.metric_observations m
  where m.share_class_id = sc.id and m.metric = 'aum' order by observed_on desc limit 1
) class_aum on true
left join lateral (
  select value, as_of from public.metric_observations m
  where m.fund_id = f.id and m.share_class_id is null and m.metric = 'holdings_count' order by observed_on desc limit 1
) holdings on true
left join lateral (
  select value, as_of from public.metric_observations m
  where m.share_class_id = sc.id and m.metric = 'trailing_yield' order by observed_on desc limit 1
) yield on true
left join lateral (
  select value, as_of from public.metric_observations m
  where m.share_class_id = sc.id and m.metric = 'market_return_1y' order by observed_on desc limit 1
) ret1 on true
left join lateral (
  select value from public.metric_observations m
  where m.share_class_id = sc.id and m.metric = 'market_return_3y' order by observed_on desc limit 1
) ret3 on true
left join lateral (
  select value from public.metric_observations m
  where m.share_class_id = sc.id and m.metric = 'market_return_5y' order by observed_on desc limit 1
) ret5 on true
left join lateral (
  select m.value, m.as_of, d.url from public.metric_observations m join public.data_sources d on d.id = m.source_id
  where m.share_class_id = sc.id and m.metric = 'nav_return_1y' order by observed_on desc limit 1
) nav1 on true
left join lateral (
  select value from public.metric_observations m
  where m.share_class_id = sc.id and m.metric = 'nav_return_3y' order by observed_on desc limit 1
) nav3 on true
left join lateral (
  select value from public.metric_observations m
  where m.share_class_id = sc.id and m.metric = 'nav_return_5y' order by observed_on desc limit 1
) nav5 on true
left join lateral (
  select value from public.metric_observations m
  where m.share_class_id = sc.id and m.metric = 'nav_return_si' order by observed_on desc limit 1
) navsi on true
left join lateral (
  select value, unit, as_of from public.metric_observations m
  where m.share_class_id = sc.id and m.metric = 'nav' order by observed_on desc limit 1
) navnow on true
left join lateral (
  select array_agg(c.slug order by c.slug) as slugs, array_agg(c.label order by c.label) as labels
  from public.fund_categories fc join public.categories c on c.id = fc.category_id
  where fc.fund_id = f.id
) cats on true;

-- Public data: everyone may read, nobody writes through the API.
do $$
declare t text;
begin
  foreach t in array array[
    'data_sources', 'issuers', 'exchanges', 'indices', 'categories', 'funds',
    'fund_index_relationships', 'fund_categories', 'share_classes', 'listings',
    'share_class_fees', 'metric_observations', 'fund_exposures', 'fund_top_holdings', 'fund_prices', 'fx_rates'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;

grant select on public.etf_overview to anon, authenticated;

-- Internal job log: no policies, so only the service role can use it.
alter table public.data_update_logs enable row level security;
