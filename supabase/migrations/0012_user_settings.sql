-- A signed-in reader's settings (language, the country they invest from, which funds lists show by default)
-- are kept with their other saved state, so they follow the reader across devices.
alter table public.user_state drop constraint if exists user_state_kind_check;
alter table public.user_state add constraint user_state_kind_check check (kind in ('watchlists', 'portfolios', 'settings'));
