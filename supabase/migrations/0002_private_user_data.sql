-- Private user data. Each table is owner-only through Row Level Security, and rows
-- are removed with the account. Public ETF tables never reference users.

create table public.user_preferences (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  currency          text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  language          text not null default 'en',
  theme             text not null default 'system' check (theme in ('system', 'light', 'dark')),
  preferred_market  text,
  default_filters   jsonb not null default '{}',
  chart_settings    jsonb not null default '{}',
  updated_at        timestamptz not null default now()
);

-- Tax residence is always chosen by the user. It is never derived from IP or location.
create table public.user_tax_profiles (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  residence_country    text check (residence_country ~ '^[A-Z]{2}$'),
  residence_start      date,
  investor_category    text,
  reporting_currency   text check (reporting_currency ~ '^[A-Z]{3}$'),
  updated_at           timestamptz not null default now()
);

create table public.watchlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index watchlists_user_idx on public.watchlists (user_id);

create table public.watchlist_items (
  watchlist_id    uuid not null references public.watchlists (id) on delete cascade,
  share_class_id  bigint not null references public.share_classes (id),
  user_id         uuid not null references auth.users (id) on delete cascade,
  note            text check (char_length(note) <= 2000),
  position        integer not null default 0,
  added_at        timestamptz not null default now(),
  primary key (watchlist_id, share_class_id)
);

create table public.saved_comparisons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  isins       text[] not null check (cardinality(isins) between 2 and 5),
  created_at  timestamptz not null default now()
);

create table public.saved_screeners (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  query       text not null check (char_length(query) <= 4000),
  created_at  timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'user_preferences', 'user_tax_profiles', 'watchlists', 'watchlist_items',
    'saved_comparisons', 'saved_screeners'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner only" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- A user can only add items to a watchlist they own.
create policy "item must be in own watchlist" on public.watchlist_items
  as restrictive for insert to authenticated
  with check (exists (
    select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid()
  ));
