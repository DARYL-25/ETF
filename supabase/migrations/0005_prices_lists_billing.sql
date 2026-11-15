-- Daily price points for every ETF in the global list, from scripts/universe/daily.py.
-- kind is 'nav' (the issuer's published net asset value) or 'close' (an exchange closing price).
create table public.universe_prices (
  etf_key     text not null references public.universe_etfs (etf_key) on delete cascade,
  price_date  date not null,
  value       double precision not null check (value > 0),
  currency    text,
  kind        text not null check (kind in ('nav', 'close')),
  source      text not null,
  primary key (etf_key, price_date, kind)
);
alter table public.universe_prices enable row level security;
create policy "public read" on public.universe_prices for select to anon, authenticated using (true);
grant select on public.universe_prices to anon, authenticated;

-- Watchlists hold any ETF in the directory, by its key, not only fully researched share classes.
-- No foreign key, so the public data can be reloaded without touching user data.
drop table public.watchlist_items;
create table public.watchlist_items (
  watchlist_id  uuid not null references public.watchlists (id) on delete cascade,
  etf_key       text not null check (char_length(etf_key) between 3 and 40),
  user_id       uuid not null references auth.users (id) on delete cascade,
  note          text check (char_length(note) <= 2000),
  position      integer not null default 0,
  added_at      timestamptz not null default now(),
  primary key (watchlist_id, etf_key)
);
alter table public.watchlist_items enable row level security;
create policy "owner only" on public.watchlist_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "item must be in own watchlist" on public.watchlist_items as restrictive for insert to authenticated
  with check (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid()));
grant select, insert, update, delete on public.watchlist_items to authenticated;

-- One row per paying user, written only by the Stripe webhook through the service role.
create table public.subscriptions (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id      text not null,
  stripe_subscription_id  text,
  plan                    text not null default 'premium',
  status                  text not null,
  current_period_end      timestamptz,
  updated_at              timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "owner reads" on public.subscriptions for select to authenticated using (user_id = auth.uid());
grant select on public.subscriptions to authenticated;
