-- Full holdings for ETFs whose issuer publishes them, from scripts/universe/holdings.py.
-- holding_key is the security's ISIN when the issuer's file has one, otherwise its ticker plus the start
-- of its cleaned name, so the same security matches across funds.
create table public.holdings (
  etf_key      text not null references public.universe_etfs (etf_key) on delete cascade,
  holding_key  text not null,
  name         text not null,
  ticker       text,
  weight_pct   double precision not null check (weight_pct > 0),
  sector       text,
  country      text,
  asset_class  text,
  primary key (etf_key, holding_key)
);
create index holdings_by_security on public.holdings (holding_key);
create index holdings_by_name on public.holdings (lower(name) text_pattern_ops);

create table public.holdings_summary (
  etf_key      text primary key references public.universe_etfs (etf_key) on delete cascade,
  as_of        date,
  n_holdings   integer not null,
  kept         integer not null,
  covered_pct  double precision not null,
  source       text not null,
  source_url   text
);

alter table public.holdings enable row level security;
alter table public.holdings_summary enable row level security;
create policy "public read" on public.holdings for select to anon, authenticated using (true);
create policy "public read" on public.holdings_summary for select to anon, authenticated using (true);
grant select on public.holdings, public.holdings_summary to anon, authenticated;
