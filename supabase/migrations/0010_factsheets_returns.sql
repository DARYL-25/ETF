-- Country and sector split as printed on an issuer's factsheet, for funds whose full holdings are not published.
create table if not exists public.universe_exposures (
  etf_key     text not null references public.universe_etfs (etf_key) on delete cascade,
  dimension   text not null check (dimension in ('country', 'sector')),
  label       text not null,
  weight_pct  double precision not null,
  as_of       date,
  source      text not null,
  source_url  text,
  primary key (etf_key, dimension, label)
);
alter table public.universe_exposures enable row level security;
create policy "public read" on public.universe_exposures for select to anon, authenticated using (true);

-- Official monthly total returns, from SEC Form N-PORT for US funds.
create table if not exists public.universe_monthly_returns (
  etf_key     text not null references public.universe_etfs (etf_key) on delete cascade,
  month       date not null,
  return_pct  double precision not null,
  source      text not null,
  primary key (etf_key, month)
);
alter table public.universe_monthly_returns enable row level security;
create policy "public read" on public.universe_monthly_returns for select to anon, authenticated using (true);

-- A fee can come from a different file than the rest of the row, so it keeps its own source. Null means the row's.
alter table public.universe_details add column if not exists fee_source text;
alter table public.universe_details add column if not exists fee_source_url text;
grant select on public.universe_exposures, public.universe_monthly_returns to anon, authenticated;
