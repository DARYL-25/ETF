-- What a signed-in reader keeps across devices: their watchlists and hypothetical portfolios, as they
-- arranged them. One row per reader and kind. Only the owner can read or write it.
create table public.user_state (
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('watchlists', 'portfolios')),
  value       jsonb not null check (pg_column_size(value) <= 200000),
  updated_at  timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table public.user_state enable row level security;
create policy "owner only" on public.user_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.user_state to authenticated;
